import { NextResponse } from "next/server";
import { DataError } from "./read-only.mjs";
export function token(request: Request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}
export function failure(error: unknown) {
  if (error instanceof DataError)
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    {
      ok: false,
      code: "UNAVAILABLE",
      message: "暫時無法讀取資料；沒有寫入或更改資料庫。",
    },
    { status: 503 },
  );
}
