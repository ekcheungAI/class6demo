// 課前 Key 檢查 — 六幕會碰到嘅每一條 key，一條一行。
//
// 每行只答三樣嘢：有冇、通唔通、下一步做乜。用嘅全部係免費嘅 read-only 呼叫
// （列 model、讀自己個名、讀 profile 清單、health）；唔會生成、唔會出帖、
// 唔會扣額度。值永遠唔離開 process：回傳入面冇任何 key、token 或者 secret。
//
// 同一個函數畀三個入口用：`npm run check:keys`（Codex 幫你跑）、
// `/api/connection/keys`（Connections 頁「課前 Key 檢查」面板）、同 tests。
const TIMEOUT = 15000;
const filled = (v) => typeof v === "string" && v.trim() !== "" && !/YOUR_|PASTE|填入/.test(v);

/** 一行 = 一個結論。status: ok | fail | missing | skip */
const row = (id, label, act, status, detail, next = "") => ({ id, label, act, status, detail, next });

async function probe(f, url, init = {}) {
  try {
    const r = await f(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
    let body = null;
    try { body = await r.json(); } catch { body = null; }
    return { status: r.status, ok: r.ok, body };
  } catch (e) {
    return { status: 0, ok: false, body: null, error: e?.name === "TimeoutError" ? "timeout" : "network" };
  }
}

const netFail = (p, what) =>
  p.status === 0
    ? `連唔到 ${what}（${p.error === "timeout" ? "15 秒冇回應" : "網絡"}）`
    : `${what} 回 HTTP ${p.status}`;

/**
 * @param {Record<string,string|undefined>} env  process.env 或者 env-state 砌出嚟嘅 profile
 * @param {{fetch?: typeof fetch, track?: 'pro'|'free'|'dry-run'}} [opts]
 */
export async function checkKeys(env, opts = {}) {
  const f = opts.fetch || globalThis.fetch;
  const rows = [];

  // 1 · Supabase — 登入、Queue、Brain 全部靠佢；第五堂已經有。
  {
    const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
    const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) || !filled(key))
      rows.push(row("supabase", "Supabase（登入／Queue／Brain）", "全部", "missing", "NEXT_PUBLIC_SUPABASE_URL 或 PUBLISHABLE_KEY 未填或格式唔啱", "照 .env.example 填返第五堂嗰兩條公開 key；service role 唔准用"));
    else {
      const p = await probe(f, `${url}/auth/v1/health`, { headers: { apikey: key } });
      rows.push(p.ok
        ? row("supabase", "Supabase（登入／Queue／Brain）", "全部", "ok", `project ${url.slice(8, 28)} 回應正常`)
        : row("supabase", "Supabase（登入／Queue／Brain）", "全部", "fail", netFail(p, "Supabase"), "核對 project ref 係你自己嗰個、key 係 publishable／anon"));
    }
  }

  // 2 · TopAPIs — 打分、Rewrite、生圖三份工共用一條。老師派嘅檔可能寫 TOPAPIS_API_KEY。
  {
    const key = env.TOAPI_API_KEY;
    const alias = env.TOPAPIS_API_KEY;
    if (!filled(key))
      rows.push(row("toapi", "TopAPIs（打分／Rewrite／生圖）", "第 2–4 幕", "missing",
        filled(alias) ? "只有 TOPAPIS_API_KEY，部機讀嘅係 TOAPI_API_KEY（少一個 S）" : "TOAPI_API_KEY 未填",
        filled(alias) ? "Step 00 條 prompt 會幫你對返個名；或者自己喺 .env.local 加一行 TOAPI_API_KEY=" : "老師派嘅 CLASS06-API-KEYS.env 入面有；自學就去 TopAPIs 開戶"));
    else {
      const p = await probe(f, "https://toapis.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      const n = Array.isArray(p.body?.data) ? p.body.data.length : 0;
      rows.push(p.ok
        ? row("toapi", "TopAPIs（打分／Rewrite／生圖）", "第 2–4 幕", "ok", `key 有效，見到 ${n} 個 model`)
        : p.status === 429
        ? row("toapi", "TopAPIs（打分／Rewrite／生圖）", "第 2–4 幕", "ok", "key 冇被拒，只係全班同時查緊（429 限速）——一陣再撳重新檢查")
        : row("toapi", "TopAPIs（打分／Rewrite／生圖）", "第 2–4 幕", "fail", p.status === 401 ? "TopAPIs 唔認呢條 key（401）" : netFail(p, "TopAPIs"), p.status === 401 ? "多數係貼漏咗頭尾字元——由老師個檔重新複製整條" : "檢查網絡；仍然唔得就叫老師"));
    }
  }

  // 3 · 功能開關 — 唔係 1，/api/feed/rewrite 直接 403。
  rows.push(env.STUDENT_TEACHER_PREVIEW === "1"
    ? row("preview", "STUDENT_TEACHER_PREVIEW", "第 2 幕起", "ok", "=1，Rewrite gate 已開")
    : row("preview", "STUDENT_TEACHER_PREVIEW", "第 2 幕起", "missing", "唔係 1：Rewrite 會回 403「此版本尚未開放生成」", "喺 .env.local 加 STUDENT_TEACHER_PREVIEW=1，重啟 npm run dev"));

  // 4 · 額度 — 本輪上限；20 只夠一次 Rewrite，堂上要 100。
  {
    const cap = Number(env.STUDENT_TOAPI_BUDGET_CREDITS);
    rows.push(cap >= 1 && cap <= 100
      ? row("budget", "STUDENT_TOAPI_BUDGET_CREDITS", "第 2–4 幕", cap < 100 ? "fail" : "ok", `上限 ${cap} credits${cap < 100 ? "——堂上六幕唔夠用" : ""}`, cap < 100 ? "改成 100（老師批准嘅課堂上限）" : "")
      : row("budget", "STUDENT_TOAPI_BUDGET_CREDITS", "第 2–4 幕", "missing", "未填或者唔係 1–100 之間嘅數", "填 STUDENT_TOAPI_BUDGET_CREDITS=100"));
  }

  // 5 · Threads — 讀到自己個名 ≠ 可以出帖；scope 分開查。
  {
    const token = env.THREADS_USER_ACCESS_TOKEN;
    const userId = env.THREADS_USER_ID;
    const base = (env.THREADS_BASE || "https://graph.threads.net").replace(/\/+$/, "");
    if (!filled(token) || !filled(userId))
      rows.push(row("threads", "Threads（token + user id）", "第 3、5 幕", "missing", !filled(token) ? "THREADS_USER_ACCESS_TOKEN 未填" : "THREADS_USER_ID 未填", "課前通知第一條路：Meta 開發者後台 → Threads → 用戶 token；id 由 token 讀返"));
    else {
      const me = await probe(f, `${base}/v1.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
      if (!me.ok) {
        const msg = me.body?.error?.message || netFail(me, "Threads");
        rows.push(row("threads", "Threads（token + user id）", "第 3、5 幕", "fail", /expire/i.test(msg) ? "條 token 過咗期" : `Threads 唔接受呢條 token：${msg}`, /expire/i.test(msg) ? "短期 token 得一個鐘——換一條長期 token 再貼" : "重新由 Meta 後台複製整條 token"));
      } else {
        const id = String(me.body?.id ?? "");
        const name = me.body?.username ? `@${me.body.username}` : "（讀唔到 username）";
        const dbg = await probe(f, `${base}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`);
        const scopes = Array.isArray(dbg.body?.data?.scopes) ? dbg.body.data.scopes : null;
        const canPublish = scopes ? scopes.includes("threads_content_publish") : null;
        const matches = id === String(userId).trim();
        if (!matches)
          rows.push(row("threads", "Threads（token + user id）", "第 3、5 幕", "fail", `token 屬於 ${name}（id ${id}），但 THREADS_USER_ID 填咗另一個數`, `將 THREADS_USER_ID 改成 ${id}（呢個先係 token 讀返嘅真 id）`));
        else if (canPublish === false)
          rows.push(row("threads", "Threads（token + user id）", "第 3、5 幕", "fail", `${name} 讀到，但 token 冇 threads_content_publish——第五幕撳「發」會 403`, "去 Meta 後台為呢個 app 加 threads_content_publish scope，再換一條 token"));
        else
          rows.push(row("threads", "Threads（token + user id）", "第 3、5 幕", "ok", `${name}（id ${id}）${canPublish ? "，有出帖權限" : "，scope 查唔到——上台前自己出一篇測試再刪"}`));
      }
    }
  }

  // 6 · Upload-Post — Pro track 先要；Free／Dry-run 冇亦係正常。
  {
    const key = env.UPLOAD_POST_API_KEY;
    const base = (env.UPLOAD_POST_BASE || "https://api.upload-post.com").replace(/\/+$/, "");
    const pro = opts.track ? opts.track === "pro" : filled(key);
    if (!filled(key))
      rows.push(row("uploadpost", "Upload-Post（Pro track）", "第 3、5 幕", pro ? "missing" : "skip", "UPLOAD_POST_API_KEY 未填", pro ? "app.upload-post.com/api-keys → Create，貼入 .env.local" : "Free／Dry-run 唔使；想一次出幾個平台先要"));
    else {
      const p = await probe(f, `${base}/api/uploadposts/users`, { headers: { Authorization: `Apikey ${key}` } });
      const list = Array.isArray(p.body?.profiles) ? p.body.profiles : Array.isArray(p.body?.users) ? p.body.users : [];
      const names = list.map((x) => x?.username ?? x?.name).filter(Boolean);
      rows.push(p.ok
        ? row("uploadpost", "Upload-Post（Pro track）", "第 3、5 幕", names.length ? "ok" : "fail", names.length ? `${names.length} 個 profile：${names.join("、")}` : "key 有效，但一個 profile 都冇", names.length ? "" : "去 app.upload-post.com 開一個 profile 並連最少一個平台")
        : p.status === 429
        ? row("uploadpost", "Upload-Post（Pro track）", "第 3、5 幕", "ok", "key 冇被拒，只係限速中（429）——一陣再撳重新檢查")
        : row("uploadpost", "Upload-Post（Pro track）", "第 3、5 幕", "fail", p.status === 401 || p.status === 403 ? "Upload-Post 唔認呢條 key" : netFail(p, "Upload-Post"), "條 key 只完整顯示一次——去 api-keys 頁重新 Create 一條"));
    }
  }

  // 7 · 搵靈感 — 三條齊先 LIVE；唔齊自動用 DEMO 五張卡，一樣行到落去。
  {
    const have = ["EXA_API_KEY", "FIRECRAWL_API_KEY", "TAVILY_API_KEY"].filter((k) => filled(env[k]));
    rows.push(have.length === 3
      ? row("search", "搵靈感（Exa／Firecrawl／Tavily）", "第 1 幕", "ok", "三條齊，第一幕行 LIVE（只查有冇，唔會扣額度）")
      : row("search", "搵靈感（Exa／Firecrawl／Tavily）", "第 1 幕", "skip", `只有 ${have.length}/3 條，第一幕會用 DEMO 五張示例卡`, "老師派嘅檔入面有三條；冇亦唔阻住任何一步"));
  }

  // 8 · TikHub — Step 18 選做先用。
  {
    const key = env.TIKHUB_API_KEY;
    if (!filled(key)) rows.push(row("tikhub", "TikHub（Step 18 選做）", "選做", "skip", "未填；只有跟社交帳號嗰步先用"));
    else {
      const p = await probe(f, "https://api.tikhub.io/api/v1/tikhub/user/get_user_info", { headers: { Authorization: `Bearer ${key}` } });
      rows.push(p.ok && p.body?.code === 200
        ? row("tikhub", "TikHub（Step 18 選做）", "選做", "ok", `key 有效${p.body?.api_key_data?.api_key_name ? `（${p.body.api_key_data.api_key_name}）` : ""}`)
        : p.status === 429
        ? row("tikhub", "TikHub（Step 18 選做）", "選做", "skip", "TikHub 限速中（429），key 冇被拒；Step 18 先再試")
        : row("tikhub", "TikHub（Step 18 選做）", "選做", "fail", p.status === 401 ? "TikHub 唔認呢條 key" : netFail(p, "TikHub"), "Step 18 係選做——唔得就跳過"));
    }
  }

  // 9 · Vercel cron — 第六幕功課；本機冇係正常，Vercel 先要。
  {
    const have = ["CRON_SECRET", "AUTOPILOT_EMAIL", "AUTOPILOT_PASSWORD"].filter((k) => filled(env[k]));
    rows.push(have.length === 3
      ? row("cron", "Vercel cron（第 6 幕功課）", "第 6 幕", "ok", "三條齊；記住 Vercel Environment Variables 都要有同一套")
      : row("cron", "Vercel cron（第 6 幕功課）", "第 6 幕", "skip", `本機 ${have.length}/3 條——堂上唔使，功課上 Vercel 先要`));
  }

  const summary = { ok: 0, fail: 0, missing: 0, skip: 0 };
  for (const r of rows) summary[r.status]++;
  const required = ["supabase", "toapi", "preview", "budget", "threads"];
  const readyForClass = rows.filter((r) => required.includes(r.id)).every((r) => r.status === "ok");
  return { rows, summary, readyForClass, checkedAt: new Date().toISOString() };
}

const MARK = { ok: "✓", fail: "✗", missing: "－", skip: "·" };
/** CLI 版：一行一條，冇任何值。 */
export function formatReport({ rows, summary, readyForClass }) {
  const lines = rows.map((r) => `${MARK[r.status]} ${r.label}｜${r.act}｜${r.detail}${r.next ? `　→ ${r.next}` : ""}`);
  lines.push("");
  lines.push(`${summary.ok} ✓　${summary.fail} ✗　${summary.missing} 未填　${summary.skip} 唔使`);
  lines.push(readyForClass ? "READY · 五條必要嘅（Supabase、TopAPIs、開關、額度、Threads）全部通過。" : "NOT READY · 上面 ✗ 或者「－」嗰幾行先搞掂。");
  lines.push("值冇印出嚟；呢個檢查冇生成、冇出帖、冇扣額度。");
  return lines.join("\n");
}
