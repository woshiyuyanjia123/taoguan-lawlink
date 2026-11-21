import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, context: { params: Promise<{ certNo: string }> }) {
  const { certNo } = await context.params;
  const key = decodeURIComponent(certNo).trim();

  const cert = await prisma.electronicCertificate.findFirst({
    where: { OR: [{ certNo: key }, { verifyCode: key }] },
    include: { office: { select: { name: true, city: true } } }
  });

  if (!cert) {
    return NextResponse.json({ valid: false, message: "未在韬冠律所防伪存证库中查到该函证编号" }, { status: 404 });
  }

  return NextResponse.json({
    valid: cert.status === "ISSUED",
    status: cert.status,
    certNo: cert.certNo,
    verifyCode: cert.verifyCode,
    officeName: cert.office?.name ?? "韬冠律所",
    caseNoLabel: cert.caseNoLabel,
    certType: cert.certType,
    recipientOrg: cert.recipientOrg,
    lawyerNames: cert.lawyerNames,
    sealText: cert.sealText,
    printCount: cert.printCount,
    issuedAt: cert.issuedAt
  });
}
