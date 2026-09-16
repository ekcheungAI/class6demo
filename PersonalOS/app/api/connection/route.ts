import { NextResponse } from "next/server";
import { connectionConfig } from "@/lib/read-only.mjs";
import { failure } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const c = connectionConfig();
    return NextResponse.json(
      {
        ok: true,
        configured: true,
        url: c.url,
        publishableKey: c.key,
        projectRef: c.projectRef,
        readOnly: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
