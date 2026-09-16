import { NextResponse } from "next/server";
import { connectionConfig, listTables } from "@/lib/read-only.mjs";
import { failure, token } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const c = connectionConfig();
    return NextResponse.json(
      {
        ok: true,
        tables: await listTables(c, token(request)),
        mode: "live",
        projectRef: c.projectRef,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
