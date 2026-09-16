import { NextResponse } from "next/server";
import { assertLocalRequest, ContentError } from "@/lib/content-engine.mjs";
import { checkKeys } from "@/lib/key-check.mjs";

export const dynamic = "force-dynamic";

// 課前 Key 檢查 — Connections 頁個面板讀呢度。同 `npm run check:keys` 係同一個函數：
// 每條 key 一個免費 read-only 呼叫，回傳只有結論，冇任何值。
export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const track = new URL(request.url).searchParams.get("track");
    const report = await checkKeys(process.env, {
      track: track === "pro" || track === "free" || track === "dry-run" ? track : undefined,
    });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof ContentError ? error.message : "Key 檢查未完成";
    const status = error instanceof ContentError ? error.status : 503;
    return NextResponse.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
