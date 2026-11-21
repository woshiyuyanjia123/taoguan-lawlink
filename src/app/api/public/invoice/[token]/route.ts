import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const link = await prisma.invoicePortalLink.findUnique({
    where: { token },
    include: { office: { select: { name: true } } }
  });
  if (!link) {
    return NextResponse.json({ error: "未找到对应的开票填报单" }, { status: 404 });
  }
  return NextResponse.json({
    id: link.id,
    token: link.token,
    officeName: link.office?.name ?? "韬冠律所",
    caseNoLabel: link.caseNoLabel,
    invoiceType: link.invoiceType,
    amount: Number(link.amount),
    clientTitle: link.clientTitle,
    taxNo: link.taxNo ?? "",
    clientAddressPhone: link.clientAddressPhone ?? "",
    clientBankAccount: link.clientBankAccount ?? "",
    applicantEmail: link.applicantEmail ?? "",
    remark: link.remark ?? "",
    status: link.status,
    issuedAt: link.issuedAt,
    scanUploaded: link.scanUploaded,
    scanFileName: link.scanFileName
  });
}

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const link = await prisma.invoicePortalLink.findUnique({ where: { token } });
  if (!link) {
    return NextResponse.json({ error: "开票填报链接无效" }, { status: 404 });
  }
  if (link.status === "ISSUED") {
    return NextResponse.json({ error: "该发票已开具完成，不可再修改抬头信息" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const clientTitle = String(body.clientTitle ?? "").trim();
  if (!clientTitle) {
    return NextResponse.json({ error: "发票抬头不能为空" }, { status: 400 });
  }

  const updated = await prisma.invoicePortalLink.update({
    where: { id: link.id },
    data: {
      clientTitle,
      taxNo: String(body.taxNo ?? "").trim() || null,
      clientAddressPhone: String(body.clientAddressPhone ?? "").trim() || null,
      clientBankAccount: String(body.clientBankAccount ?? "").trim() || null,
      applicantEmail: String(body.applicantEmail ?? "").trim() || link.applicantEmail,
      remark: String(body.remark ?? "").trim() || link.remark,
      status: "CLIENT_FILLED"
    }
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
