import { NextRequest, NextResponse } from "next/server";
import { saveFrameFlags } from "@/lib/server/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { flags } = (await req.json().catch(() => ({}))) as {
    flags?: Record<string, { enabled: boolean; opacity: number }>;
  };
  if (!flags) {
    return NextResponse.json({ error: "flags object required" }, { status: 400 });
  }
  await saveFrameFlags(flags);
  return NextResponse.json({ ok: true });
}
