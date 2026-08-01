import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFrame } from "@/lib/server/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    category?: string;
    filename?: string;
    data?: string; // data URL or bare base64 body
  };
  const { category, filename, data } = body;
  if (!filename || !data) {
    return NextResponse.json({ error: "filename and data are required" }, { status: 400 });
  }
  // Accept "data:image/png;base64,xxxx" or bare base64
  const base64Body = data.includes(",") ? data.split(",").slice(1).join(",") : data;
  const ok = await saveUploadedFrame(category ?? "special", filename, base64Body);
  if (!ok) {
    return NextResponse.json({ error: "Only .svg and .png frame files are supported" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
