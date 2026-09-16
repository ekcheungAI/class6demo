import { NextResponse } from "next/server";
import { assertLocalRequest, ContentError } from "@/lib/content-engine.mjs";

export const dynamic = "force-dynamic";

// Upload-Post lets one account hold several profiles, and each profile holds
// its own connected platforms. This route answers one question for the student:
// "which profiles do I have, and what is connected under each one?"
//
// It never publishes and never returns the key.
//
// The auth header Upload-Post expects is not something we could verify offline,
// so instead of guessing once and failing opaquely, we try the three plausible
// forms in order and report which one worked. That report is the teachable
// part: the student ends up knowing how their own integration authenticates.
const BASE = (process.env.UPLOAD_POST_BASE || "https://api.upload-post.com").replace(/\/+$/, "");
const PATHS = ["/api/uploadposts/users"];
const AUTH: Array<[string, (k: string) => Record<string, string>]> = [
  ["Authorization: Apikey", (k) => ({ Authorization: `Apikey ${k}` })],
  ["Authorization: Bearer", (k) => ({ Authorization: `Bearer ${k}` })],
  ["x-api-key", (k) => ({ "x-api-key": k })],
];

type Profile = { username: string; platforms: string[]; unconnected: string[] };

/** Accept the shapes Upload-Post might reasonably return, without inventing data. */
function normalise(payload: unknown): Profile[] | null {
  const root = payload as Record<string, unknown> | null;
  if (!root || typeof root !== "object") return null;
  const list = (root.profiles ?? root.users ?? root.data ?? (Array.isArray(root) ? root : null)) as
    | unknown[]
    | null;
  if (!Array.isArray(list)) return null;
  return list.map((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const accounts = (row.social_accounts ?? row.accounts ?? {}) as Record<string, unknown>;
    const entries = Object.entries(accounts);
    return {
      username: String(row.username ?? row.name ?? row.profile ?? "(冇名)"),
      // A platform key with an empty value means "slot exists, nothing linked".
      platforms: entries.filter(([, v]) => v).map(([k]) => k),
      unconnected: entries.filter(([, v]) => !v).map(([k]) => k),
    };
  });
}

export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const key = process.env.UPLOAD_POST_API_KEY;
    if (!key)
      throw new ContentError(
        "未配置 UPLOAD_POST_API_KEY。喺 app.upload-post.com/api-keys 撳 Create，放入 server env，再 Redeploy。",
        400,
      );

    const attempts: Array<{ auth: string; status: number | string }> = [];
    for (const path of PATHS) {
      for (const [label, headers] of AUTH) {
        let response: Response;
        try {
          response = await fetch(BASE + path, {
            headers: { Accept: "application/json", ...headers(key) },
            signal: AbortSignal.timeout(15000),
            cache: "no-store",
          });
        } catch {
          attempts.push({ auth: label, status: "連唔到" });
          continue;
        }
        if (response.status === 401 || response.status === 403) {
          attempts.push({ auth: label, status: response.status });
          continue; // wrong header form, or wrong key — try the next form
        }
        if (!response.ok) {
          attempts.push({ auth: label, status: response.status });
          continue;
        }
        const body = await response.json().catch(() => null);
        const profiles = normalise(body);
        if (!profiles) {
          // Reached the service but could not read it. Say so plainly and hand
          // back the key names so a student can compare against the docs,
          // rather than pretending there are zero profiles.
          return NextResponse.json(
            {
              ok: false,
              reachable: true,
              authHeader: label,
              message: "連到 Upload-Post，但讀唔明佢回嘅格式。對返官方文件。",
              responseKeys: body && typeof body === "object" ? Object.keys(body).slice(0, 12) : [],
            },
            { status: 502, headers: { "Cache-Control": "no-store" } },
          );
        }
        return NextResponse.json(
          {
            ok: true,
            authHeader: label, // the answer to "how does my integration authenticate"
            base: BASE,
            profileCount: profiles.length,
            profiles,
            publishingEnabled: false, // Act 3 wires the line; Act 5 flips the switch
            checkedAt: new Date().toISOString(),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }
    throw new ContentError(
      "三種認證格式都試過（Apikey／Bearer／x-api-key），冇一種入到。多數係條 key 錯或者已 revoke。試過：" +
        attempts.map((a) => `${a.auth}=${a.status}`).join("、"),
      502,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload-Post 連線未完成";
    const status = (error as { status?: number })?.status ?? 400;
    return NextResponse.json(
      { ok: false, message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
