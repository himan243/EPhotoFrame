import { NextRequest, NextResponse } from "next/server";
import { rescanFrames } from "@/lib/server/admin";

export const runtime = "nodejs";

export async function POST() {
  const manifest = await rescanFrames();
  return NextResponse.json({ ok: true, ...manifest });
}

export async function GET() {
  const manifest = await rescanFrames();
  return NextResponse.json({ ok: true, ...manifest });
}

export async function DELETE(req: NextRequest) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Missing frame id" }, { status: 400 });
  }
  const { deleteFrame } = await import("@/lib/server/admin");
  const ok = await deleteFrame(id);
  if (!ok) {
    return NextResponse.json({ error: "Frame not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
