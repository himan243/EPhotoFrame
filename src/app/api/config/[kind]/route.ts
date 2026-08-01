import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/server/admin";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const content = await readConfig(kind);
  if (content === null) {
    return NextResponse.json({ error: "Unknown config kind" }, { status: 404 });
  }
  return new NextResponse(content, { headers: { "content-type": "application/json" } });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const body = await req.text();
  const ok = await writeConfig(kind, body);
  if (!ok) {
    return NextResponse.json({ error: "Invalid config content or unknown kind" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
