import { NextResponse } from "next/server";
import { assertLocalRequest, ContentError } from "@/lib/content-engine.mjs";

export const dynamic = "force-dynamic";

// Reads the Threads identity behind the token in server env, and — the part
// that matters on class day — reports whether that token can actually publish.
//
// "I can read my own name" and "I can post" are two different permissions on
// Threads. A student who only discovers that at Act 5, in front of the room,
// has already lost the act. This route surfaces it in Act 3 instead.
//
// It never publishes, never creates a container, and never returns the token.
const BASE = (process.env.THREADS_BASE || "https://graph.threads.net").replace(/\/+$/, "");
const NEEDED = "threads_content_publish";

export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const token = process.env.THREADS_USER_ACCESS_TOKEN;
    const userId = process.env.THREADS_USER_ID;
    if (!token || !userId)
      throw new ContentError(
        "未配置 THREADS_USER_ACCESS_TOKEN 或 THREADS_USER_ID。兩條都要放 server env，再 Redeploy。",
        400,
      );

    const me = await fetch(
      `${BASE}/v1.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(15000), cache: "no-store" },
    ).catch(() => null);
    if (!me)
      throw new ContentError("連唔到 Threads。檢查網絡，或者 THREADS_BASE 指錯咗。", 502);
    const identity = await me.json().catch(() => null);
    if (!me.ok) {
      const detail = identity?.error?.message || `HTTP ${me.status}`;
      throw new ContentError(
        /expire/i.test(detail)
          ? `條 token 過咗期（${detail}）。短期 token 得約一個鐘——用 app secret 換一條長期先。`
          : `Threads 唔接受呢條 token：${detail}`,
        me.status === 401 ? 401 : 502,
      );
    }

    // debug_token tells us the granted scopes without spending a publish.
    let scopes: string[] = [];
    let expiresAt: string | null = null;
    let scopeKnown = false;
    const dbg = await fetch(
      `${BASE}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(15000), cache: "no-store" },
    ).catch(() => null);
    if (dbg?.ok) {
      const data = (await dbg.json().catch(() => null))?.data;
      if (data) {
        scopeKnown = Array.isArray(data.scopes);
        scopes = Array.isArray(data.scopes) ? data.scopes : [];
        expiresAt = data.expires_at ? new Date(data.expires_at * 1000).toISOString() : null;
      }
    }

    const canPublish = scopeKnown ? scopes.includes(NEEDED) : null;
    return NextResponse.json(
      {
        ok: true,
        username: identity.username,
        userId: identity.id,
        matchesEnv: String(identity.id) === String(userId),
        scopes,
        canPublish, // true / false / null = 查唔到，唔好當有
        expiresAt, // null = 查唔到或者唔過期
        publishingEnabled: false, // Act 3 wires the line; Act 5 flips the switch
        note:
          canPublish === false
            ? `呢條 token 讀到你個名，但冇 ${NEEDED}，撳「發」會 403。呢個唔係你做錯——scope 係分開發嘅。`
            : canPublish === null
              ? "查唔到 scope 清單。唔好當佢有 publish 權限——上台前自己出一篇測試再刪。"
              : "身份同權限都齊。發布掣仍然係關住，第五幕先開。",
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Threads 連線未完成";
    const status = (error as { status?: number })?.status ?? 400;
    return NextResponse.json(
      { ok: false, message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
