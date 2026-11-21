import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = crypto.randomBytes(18).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const session = await prisma.qrLoginSession.create({
    data: { token, status: "PENDING", expiresAt }
  });
  return NextResponse.json({ token: session.token, expiresAt: session.expiresAt });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ error: "缺少 token" }, { status: 400 });

  const session = await prisma.qrLoginSession.findUnique({ where: { token } });
  if (!session) return NextResponse.json({ status: "NOT_FOUND" }, { status: 404 });
  if (session.expiresAt.getTime() < Date.now() && session.status === "PENDING") {
    await prisma.qrLoginSession.update({ where: { id: session.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ status: "EXPIRED" });
  }
  return NextResponse.json({ status: session.status, expiresAt: session.expiresAt });
}
