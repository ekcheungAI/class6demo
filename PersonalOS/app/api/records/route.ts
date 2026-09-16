import { NextResponse } from "next/server";
import { connectionConfig, listRecords } from "@/lib/read-only.mjs";
import { failure, token } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return NextResponse.json(
      {
        ok: true,
        ...(await listRecords(
          connectionConfig(),
          new URL(request.url).searchParams,
          token(request),
        )),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
