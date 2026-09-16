import class4Schema from "../config/class4-schema.json" with { type: "json" };
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
export class DataError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function connectionConfig(env = process.env) {
  const raw =
    env.NEXT_PUBLIC_SUPABASE_URL || "";
  if(!raw)throw new DataError("NOT_CONFIGURED","請設定自己的Supabase project URL。");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new DataError("INVALID_CONFIG", "Supabase URL 格式不正確。");
  }
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  )
    throw new DataError(
      "INVALID_CONFIG",
      "只接受標準 HTTPS Supabase project URL。",
    );
  const key = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (!key)
    throw new DataError(
      "NOT_CONFIGURED",
      "尚未設定 Publishable / anon key。請按連線說明配置。",
      503,
    );
  let valid = key.startsWith("sb_publishable_");
  if (key.startsWith("eyJ")) {
    try {
      valid =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon";
    } catch {
      valid = false;
    }
  }
  if (!valid)
    throw new DataError(
      "UNSAFE_KEY",
      "學生版只接受 publishable 或 legacy anon key；不可使用 secret / service_role。",
    );
  const tables = (env.STUDENT_TABLE_ALLOWLIST || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (tables.some((x) => !IDENTIFIER.test(x)))
    throw new DataError(
      "INVALID_CONFIG",
      "表格清單必須使用現有表格嘅 exact name。",
    );
  return {
    url: url.origin,
    key,
    projectRef: url.hostname.split(".")[0],
    tables,
    schemaProfile: env.STUDENT_SCHEMA_PROFILE || "",
  };
}
function headers(config, token) {
  const h = {
    apikey: config.key,
    Accept: "application/json",
    "Accept-Profile": "public",
  };
  if (token) {
    if (!/^[A-Za-z0-9_.-]{20,12000}$/.test(token))
      throw new DataError("INVALID_AUTH", "登入狀態無效。", 401);
    h.Authorization = "Bearer " + token;
  } else if (config.key.startsWith("eyJ"))
    h.Authorization = "Bearer " + config.key;
  return h;
}
export async function readRequest(config, path, options = {}, fetcher = fetch) {
  const url = new URL("/rest/v1/" + path, config.url);
  if (url.origin !== config.url)
    throw new DataError("INVALID_REQUEST", "不允許嘅資料目的地。");
  const h = { ...headers(config, options.token), ...options.headers };
  let response;
  try {
    response = await fetcher(url.toString(), {
      method: "GET",
      headers: h,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      redirect: "error",
    });
  } catch {
    throw new DataError(
      "NETWORK_ERROR",
      "連線未完成；請檢查網絡或 project 狀態，再手動重試。",
      502,
    );
  }
  if (!response.ok) {
    const body = await response.clone().json().catch(() => null);
    if (body?.code === "42501")
      throw new DataError("ACCESS_DENIED", "目前身份沒有資料表讀取權限；請用此 project 已有的 workspace owner 帳戶登入。未修改任何權限或資料。", 403);
    const code =
      response.status === 401
        ? "AUTH_REQUIRED"
        : response.status === 403
          ? "ACCESS_DENIED"
          : "READ_FAILED";
    throw new DataError(
      code,
      response.status === 401
        ? "Key 或登入狀態未獲接受；可用既有帳戶登入後再試。"
        : response.status === 403
          ? "目前身份沒有讀取權限。未修改任何 RLS 或資料庫設定。"
          : "讀取失敗：請核對既有 Data API、表格及欄位。",
      response.status === 401 || response.status === 403
        ? response.status
        : 502,
    );
  }
  return response;
}
export async function listTables(config, token, fetcher = fetch) {
  if (config.tables.length)
    return config.tables.map((name) => {
      const known = config.schemaProfile === "class4"
        ? class4Schema.tables.find((table) => table.name === name) : null;
      return { name, columns: known?.columns || [], primaryKey: known?.primaryKey || [], origin: "configured" };
    });
  const res = await readRequest(
    config,
    "",
    { token, headers: { Accept: "application/openapi+json" } },
    fetcher,
  );
  let spec;
  try {
    spec = await res.json();
  } catch {
    throw new DataError(
      "SCHEMA_UNAVAILABLE",
      "未取得可讀資料表清單；可在設定檔列出現有表名。",
      502,
    );
  }
  const defs = spec.definitions || spec.components?.schemas || {};
  return Object.entries(spec.paths || {})
    .filter(
      ([path, entry]) => /^\/[A-Za-z_][A-Za-z0-9_]*$/.test(path) && entry.get,
    )
    .map(([path]) => {
      const name = path.slice(1);
      return {
        name,
        origin: "openapi",
        columns: Object.entries(defs[name]?.properties || {}).map(
          ([name, v]) => ({ name, type: v.type || v.format || "unknown" }),
        ),
      };
    });
}
export function queryParams(query, table, columns = []) {
  if (!IDENTIFIER.test(table))
    throw new DataError("INVALID_TABLE", "表格名稱不正確。");
  const page = Number(query.get("page") || 0);
  if (!Number.isInteger(page) || page < 0 || page > 100000)
    throw new DataError("INVALID_PAGE", "頁碼不正確。");
  const q = new URLSearchParams({
    select: "*",
    limit: "25",
    offset: String(page * 25),
  });
  const search = (query.get("search") || "").trim();
  const column = query.get("column") || "";
  if (search) {
    if (
      search.length > 120 ||
      !IDENTIFIER.test(column) ||
      !columns.some((c) => c.name === column && c.type === "string")
    )
      throw new DataError(
        "INVALID_SEARCH",
        "請選擇已核實嘅文字欄位，搜尋最多120字。",
      );
    const escaped = search.replace(/[\\%_*]/g, (c) => "\\" + c);
    q.set(column, "ilike.%" + escaped + "%");
  }
  const order = query.get("order") || "";
  if (order) {
    if (!IDENTIFIER.test(order) || !columns.some((c) => c.name === order))
      throw new DataError("INVALID_ORDER", "排序欄位未核實。");
    q.set(
      "order",
      order + (query.get("direction") === "asc" ? ".asc" : ".desc"),
    );
  }
  return { query: q, page };
}
export async function listRecords(config, request, token, fetcher = fetch) {
  const tables = await listTables(config, token, fetcher);
  const tableName = request.get("table");
  const table = tables.find((t) => t.name === tableName);
  if (!table)
    throw new DataError("UNKNOWN_TABLE", "呢個表格未在可讀清單內。", 404);
  const { query, page } = queryParams(request, table.name, table.columns);
  // A unique composite key keeps offset pages stable when requested sort values tie.
  if (table.primaryKey?.length) {
    const existing = query.get("order");
    const chosen = request.get("order");
    const tieBreakers = table.primaryKey.filter((key) => key !== chosen).map((key) => key + ".asc");
    query.set("order", [existing, ...tieBreakers].filter(Boolean).join(","));
  }
  const response = await readRequest(
    config,
    encodeURIComponent(table.name) + "?" + query.toString(),
    { token, headers: { Prefer: "count=exact" } },
    fetcher,
  );
  const rows = await response.json();
  if (!Array.isArray(rows))
    throw new DataError("INVALID_RESPONSE", "資料格式未能確認。", 502);
  const count = response.headers.get("content-range")?.split("/")[1];
  const total = count && /^\d+$/.test(count) ? Number(count) : null;
  const columns = table.columns.length
    ? table.columns
    : rows[0]
      ? Object.keys(rows[0]).map((name) => ({
          name,
          type: typeof rows[0][name] === "string" ? "string" : "unknown",
        }))
      : [];
  return {
    mode: "live",
    projectRef: config.projectRef,
    table: table.name,
    rows,
    columns,
    total,
    page,
    pageSize: 25,
    hasMore: total !== null ? (page + 1) * 25 < total : rows.length === 25,
    checkedAt: new Date().toISOString(),
    writeActions: 0,
  };
}
