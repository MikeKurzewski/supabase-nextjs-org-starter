import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Returns { ok: true }
 */

export async function GET() {
  return NextResponse.json({ ok: true });
}
