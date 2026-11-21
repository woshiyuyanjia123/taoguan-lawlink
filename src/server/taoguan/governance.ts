"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import { requireSession, requireSystemAdmin } from "@/lib/auth/session";
import { serializeDecimals } from "@/lib/decimal";
import { prisma } from "@/lib/prisma";

const officeCreateSchema = z.object({
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/, "办公室编码仅限字母、数字和短横线"),
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(50).optional(),
  caseNoPrefix: z.string().trim().min(1).max(16).default("TG"),
  managementFeeRate: z.coerce.number().min(0).max(0.95).default(0.15),
  peerTransferFeeRate: z.coerce.number().min(0).max(0.5).default(0.03),
  invoiceAlertDays: z.coerce.number().int().min(1).max(365).default(30),
  letterAlertLimit: z.coerce.number().int().min(1).max(200).default(10),
  cloneFromId: z.string().optional()
});

/** 校验任意业务模块是否被超级管理员触发紧急暂停（9.10 需求第 33 行）。 */
export async function assertNotPaused(moduleName: string, targetId?: string) {
  const activePause = await prisma.emergencyPause.findFirst({
    where: {
      active: true,
      OR: [
        { module: "GLOBAL" },
        { module: moduleName, targetId: null },
        ...(targetId ? [{ module: moduleName, targetId }] : [])
      ]
    },
    orderBy: { pausedAt: "desc" }
  });
  if (activePause) {
    throw new ActionError(`系统超级管理员已对该流程触发紧急暂停（原因：${activePause.reason}），解除前禁止推进操作`);
  }
}

export async function listOffices() {
  await requireSession("personal");
  const offices = await prisma.office.findMany({
    orderBy: [{ isCommittee: "asc" }, { isHeadquarters: "desc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: { users: true, criminalIntakeProfiles: true, electronicCertificates: true }
      }
    }
  });
  return serializeDecimals(offices);
}

export async function createOrCloneOffice(input: z.infer<typeof officeCreateSchema>) {
  await requireSystemAdmin();
  const data = officeCreateSchema.parse(input);
  const code = data.code.toUpperCase();

  let baseConfig = {
    managementFeeRate: data.managementFeeRate,
    peerTransferFeeRate: data.peerTransferFeeRate,
    invoiceAlertDays: data.invoiceAlertDays,
    letterAlertLimit: data.letterAlertLimit
  };

  if (data.cloneFromId) {
    const source = await prisma.office.findUnique({ where: { id: data.cloneFromId } });
    if (source) {
      baseConfig = {
        managementFeeRate: Number(source.managementFeeRate),
        peerTransferFeeRate: Number(source.peerTransferFeeRate),
        invoiceAlertDays: source.invoiceAlertDays,
        letterAlertLimit: source.letterAlertLimit
      };
    }
  }

  const existing = await prisma.office.findUnique({ where: { code } });
  if (existing) throw new ActionError(`办公室编码 ${code} 已存在`);

  const office = await prisma.office.create({
    data: {
      code,
      name: data.name,
      city: data.city || null,
      caseNoPrefix: data.caseNoPrefix,
      managementFeeRate: baseConfig.managementFeeRate,
      peerTransferFeeRate: baseConfig.peerTransferFeeRate,
      invoiceAlertDays: baseConfig.invoiceAlertDays,
      letterAlertLimit: baseConfig.letterAlertLimit,
      clonedFromId: data.cloneFromId || null,
      active: true
    }
  });

  revalidatePath("/admin/offices");
  return serializeDecimals(office);
}

export async function assignUserOffice(input: {
  userId: string;
  officeId: string | null;
  employmentType?: string;
  barLicenseNo?: string;
  offboardAllowed?: boolean;
}) {
  await requireSystemAdmin();
  await prisma.user.update({
    where: { id: input.userId },
    data: {
      officeId: input.officeId,
      ...(input.employmentType ? { employmentType: input.employmentType } : {}),
      ...(input.barLicenseNo !== undefined ? { barLicenseNo: input.barLicenseNo || null } : {}),
      ...(input.offboardAllowed !== undefined ? { offboardAllowed: input.offboardAllowed } : {})
    }
  });
  revalidatePath("/admin/offices");
  revalidatePath("/hr-admin");
  return { ok: true };
}

export async function listEmergencyPauses() {
  await requireSession("personal");
  return prisma.emergencyPause.findMany({
    orderBy: [{ active: "desc" }, { pausedAt: "desc" }],
    take: 50
  });
}

export async function triggerEmergencyPause(input: { module: string; targetId?: string; reason: string }) {
  const session = await requireSystemAdmin();
  const reason = input.reason.trim();
  if (!reason) throw new ActionError("请填写紧急暂停原因");
  const pause = await prisma.emergencyPause.create({
    data: {
      module: input.module.toUpperCase(),
      targetId: input.targetId?.trim() || null,
      reason,
      active: true,
      pausedById: session.user.id
    }
  });
  revalidatePath("/admin/offices");
  return pause;
}

export async function resumeEmergencyPause(id: string) {
  const session = await requireSystemAdmin();
  await prisma.emergencyPause.update({
    where: { id },
    data: { active: false, resumedById: session.user.id, resumedAt: new Date() }
  });
  revalidatePath("/admin/offices");
  return { ok: true };
}
