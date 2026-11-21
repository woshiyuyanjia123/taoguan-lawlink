"use server";

import { revalidatePath } from "next/cache";
import { ActionError } from "@/lib/action-error";
import { requireSession } from "@/lib/auth/session";
import { isSystemAdmin } from "@/lib/auth/system-role";
import { prisma } from "@/lib/prisma";
import { buildVerifyCode } from "@/lib/taoguan/conflict-utils";
import { assertNotPaused } from "./governance";

export async function listElectronicCertificates() {
  const session = await requireSession("personal");
  const isAdmin = isSystemAdmin(session.user) || session.user.role === "PRINCIPAL_LAWYER";

  const [certs, offices] = await Promise.all([
    prisma.electronicCertificate.findMany({
      orderBy: { createdAt: "desc" },
      include: { office: { select: { id: true, name: true, letterAlertLimit: true } } },
      take: 100
    }),
    prisma.office.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } })
  ]);

  // 计算单案出函数量并标记超限报警（9.10 需求第 123 行）
  const caseCounts = new Map<string, number>();
  for (const c of certs) {
    if (c.status !== "REVOKED") {
      caseCounts.set(c.caseNoLabel, (caseCounts.get(c.caseNoLabel) ?? 0) + 1);
    }
  }

  const enriched = certs.map((c) => {
    const count = caseCounts.get(c.caseNoLabel) ?? 0;
    const limit = c.office?.letterAlertLimit ?? 10;
    return {
      ...c,
      caseLetterCount: count,
      overLimitAlert: count > limit
    };
  });

  return {
    currentUserId: session.user.id,
    isAdmin,
    certs: enriched,
    offices
  };
}

export async function applyElectronicCertificate(input: {
  officeId?: string | null;
  caseNoLabel: string;
  certType: string;
  recipientOrg: string;
  lawyerNames: string;
  clientName?: string;
  batchCount?: number;
}) {
  const session = await requireSession("personal");
  await assertNotPaused("SEAL");

  if (!input.caseNoLabel.trim() || !input.recipientOrg.trim() || !input.lawyerNames.trim()) {
    throw new ActionError("案号、主送单位、承办律师均为必填项");
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, include: { office: true } });
  const targetOfficeId = input.officeId ?? me?.officeId ?? null;
  const office = targetOfficeId ? await prisma.office.findUnique({ where: { id: targetOfficeId } }) : null;
  const sealText = office ? `${office.name}电子业务专用章` : "韬冠律师事务所电子业务专用章";
  const prefix = office?.caseNoPrefix || "TG";
  const count = Math.min(20, Math.max(1, Number(input.batchCount ?? 1)));

  const createdIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const seq = `${Date.now().toString().slice(-6)}${String(i + 1).padStart(2, "0")}`;
    const cert = await prisma.electronicCertificate.create({
      data: {
        certNo: `HZ-${prefix}-${new Date().getFullYear()}-${seq}`,
        verifyCode: buildVerifyCode("TGV"),
        officeId: targetOfficeId,
        caseNoLabel: input.caseNoLabel.trim(),
        certType: input.certType,
        recipientOrg: input.recipientOrg.trim(),
        lawyerNames: input.lawyerNames.trim(),
        clientName: input.clientName?.trim() || null,
        sealText,
        status: "PENDING",
        issuedById: session.user.id
      }
    });
    createdIds.push(cert.id);
  }

  revalidatePath("/e-certificates");
  return { count: createdIds.length, ids: createdIds };
}

/** 批量审批并加盖电子红章签发（需求备忘录：电子印章批量盖章！）。 */
export async function batchApproveCertificates(ids: string[]) {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅管委会/管理员可执行电子红章审批签发");
  }
  await assertNotPaused("SEAL");
  if (!ids.length) throw new ActionError("请至少勾选 1 份待签发函证");

  await prisma.electronicCertificate.updateMany({
    where: { id: { in: ids }, status: "PENDING" },
    data: { status: "ISSUED", approvedById: session.user.id, issuedAt: new Date() }
  });
  revalidatePath("/e-certificates");
  return { approvedCount: ids.length };
}

export async function recordCertificatePrint(id: string) {
  await requireSession("personal");
  const updated = await prisma.electronicCertificate.update({
    where: { id },
    data: { printCount: { increment: 1 } }
  });
  revalidatePath("/e-certificates");
  return { printCount: updated.printCount };
}

export async function revokeElectronicCertificate(id: string) {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅管理员可作废已签发电子函证");
  }
  await prisma.electronicCertificate.update({
    where: { id },
    data: { status: "REVOKED" }
  });
  revalidatePath("/e-certificates");
  return { ok: true };
}
