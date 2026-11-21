"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import { requireSession } from "@/lib/auth/session";
import { isSystemAdmin } from "@/lib/auth/system-role";
import { serializeDecimals } from "@/lib/decimal";
import { prisma } from "@/lib/prisma";
import { amountToChineseUppercase } from "@/lib/taoguan/chinese-money";
import { validateConflictKeyword } from "@/lib/taoguan/conflict-utils";
import { assertNotPaused } from "./governance";

const criminalIntakeSchema = z.object({
  id: z.string().optional(),
  officeId: z.string().optional().nullable(),
  caseTitle: z.string().trim().min(2, "请填写案件简称"),
  isProxyFiling: z.boolean().default(false),
  leadLawyerId: z.string().optional().nullable(),
  sourceLawyerId: z.string().optional().nullable(),
  clientName: z.string().trim().min(1, "请填写委托人名称"),
  clientIdNo: z.string().trim().optional().nullable(),
  clientIsSuspect: z.boolean().default(false),
  clientSuspectRelation: z.string().trim().optional().nullable(),
  suspects: z.array(z.object({ name: z.string().trim().min(1), idNo: z.string().optional() })).min(1, "请至少填写一名嫌疑人或被告人"),
  victims: z.array(z.object({ name: z.string().trim().min(1), idNo: z.string().optional() })).default([]),
  charges: z.array(z.string().trim().min(1)).min(1, "请至少选择一项涉嫌罪名"),
  coerciveMeasure: z.string().trim().optional().nullable(),
  coerciveAuthorityRegion: z.string().trim().optional().nullable(),
  coerciveAuthorityName: z.string().trim().optional().nullable(),
  handlingAuthorityRegion: z.string().trim().optional().nullable(),
  handlingAuthorityName: z.string().trim().optional().nullable(),
  entrustStageSummary: z.string().trim().optional().nullable(),
  feeMode: z.coerce.number().int().min(1).max(7).default(1),
  feeSubOption: z.string().trim().optional().nullable(),
  selectedStages: z.array(z.string()).default([]),
  feeAmount: z.coerce.number().min(0).default(0),
  meetingUnitPrice: z.coerce.number().min(0).optional().nullable(),
  meetingCount: z.coerce.number().int().min(0).optional().nullable(),
  incidentalCivil: z.boolean().default(false),
  incidentalCivilFee: z.coerce.number().min(0).optional().nullable(),
  feeRemark: z.string().trim().optional().nullable(),
  isForeignRelated: z.boolean().default(false),
  isGangRelated: z.boolean().default(false),
  isSensitive: z.boolean().default(false),
  signingPath: z.enum(["CLIENT_FIRST", "FIRM_FIRST"]).default("CLIENT_FIRST")
});

export async function cleanupExpiredDrafts() {
  const deleted = await prisma.criminalIntakeProfile.deleteMany({
    where: { workflowStep: "DRAFT", draftExpiresAt: { lt: new Date() } }
  });
  return { deletedCount: deleted.count };
}

export async function quickGlobalConflictSearch(rawKeyword: string) {
  await requireSession("personal");
  const check = validateConflictKeyword(rawKeyword);
  if (!check.ok) throw new ActionError(check.error);
  const kw = check.value;

  const [matters, intakes, criminalProfiles] = await Promise.all([
    prisma.matter.findMany({
      where: {
        OR: [
          { title: { contains: kw, mode: "insensitive" } },
          { internalCode: { contains: kw, mode: "insensitive" } },
          { parties: { some: { name: { contains: kw, mode: "insensitive" } } } }
        ]
      },
      take: 20,
      select: { id: true, internalCode: true, title: true, category: true, status: true, owner: { select: { name: true } } }
    }),
    prisma.intake.findMany({
      where: {
        OR: [
          { title: { contains: kw, mode: "insensitive" } },
          { contactName: { contains: kw, mode: "insensitive" } },
          { parties: { some: { name: { contains: kw, mode: "insensitive" } } } }
        ]
      },
      take: 20,
      select: { id: true, title: true, category: true, status: true, ownerUser: { select: { name: true } } }
    }),
    prisma.criminalIntakeProfile.findMany({
      where: {
        OR: [
          { clientName: { contains: kw, mode: "insensitive" } },
          { clientIdNo: { contains: kw, mode: "insensitive" } },
          { caseTitle: { contains: kw, mode: "insensitive" } }
        ]
      },
      take: 20,
      select: { id: true, caseTitle: true, clientName: true, workflowStep: true, formalCaseNo: true, office: { select: { name: true } } }
    })
  ]);

  return {
    keyword: kw,
    totalHits: matters.length + intakes.length + criminalProfiles.length,
    matters,
    intakes,
    criminalProfiles
  };
}

export async function listCriminalIntakesAndPools() {
  const session = await requireSession("personal");
  await cleanupExpiredDrafts();

  const [profiles, personalParties, resolutions, offices, users] = await Promise.all([
    prisma.criminalIntakeProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: { office: { select: { id: true, name: true, caseNoPrefix: true } } },
      take: 100
    }),
    prisma.personalPartyPool.findMany({
      where: { ownerUserId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 100
    }),
    prisma.conflictResolutionCase.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        office: { select: { name: true } },
        messages: { orderBy: { createdAt: "asc" } }
      },
      take: 60
    }),
    prisma.office.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, employmentType: true, officeId: true },
      orderBy: { name: "asc" }
    })
  ]);

  return serializeDecimals({
    currentUserId: session.user.id,
    isAdmin: isSystemAdmin(session.user) || session.user.role === "PRINCIPAL_LAWYER",
    profiles,
    personalParties,
    resolutions,
    offices,
    users
  });
}

export async function savePersonalParty(input: {
  partyType: string;
  name: string;
  idNumber?: string;
  phone?: string;
  invoiceTitle?: string;
  taxNo?: string;
  bankName?: string;
  bankAccount?: string;
  address?: string;
}) {
  const session = await requireSession("personal");
  if (!input.name.trim()) throw new ActionError("主体名称不能为空");
  const item = await prisma.personalPartyPool.create({
    data: {
      ownerUserId: session.user.id,
      partyType: input.partyType === "ORG" ? "ORG" : "NATURAL",
      name: input.name.trim(),
      idNumber: input.idNumber?.trim() || null,
      phone: input.phone?.trim() || null,
      invoiceTitle: input.invoiceTitle?.trim() || input.name.trim(),
      taxNo: input.taxNo?.trim() || null,
      bankName: input.bankName?.trim() || null,
      bankAccount: input.bankAccount?.trim() || null,
      address: input.address?.trim() || null
    }
  });
  revalidatePath("/criminal-intake");
  return item;
}

export async function saveCriminalIntakeDraft(rawInput: z.infer<typeof criminalIntakeSchema>) {
  const session = await requireSession("personal");
  await assertNotPaused("INTAKE", rawInput.id);
  const data = criminalIntakeSchema.parse(rawInput);

  const computedFee =
    data.feeMode === 5
      ? Math.round((data.meetingUnitPrice ?? 0) * (data.meetingCount ?? 0) * 100) / 100
      : data.feeAmount;

  if (data.feeMode === 4 && data.selectedStages.length !== 1) {
    throw new ActionError("选择4（单个阶段委托一次性收费）必须且仅限单选 1 个委托阶段");
  }
  if ((data.feeMode === 2 || data.feeMode === 3) && data.selectedStages.length === 0) {
    throw new ActionError("多阶段委托收费必须至少勾选 1 个委托阶段");
  }
  if (data.feeMode === 7 && !data.feeRemark?.trim()) {
    throw new ActionError("选择7（其他委托和付费方式）必须在备注框中手填具体说明");
  }

  const feeAmountChinese = amountToChineseUppercase(computedFee);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const existingPool = await prisma.personalPartyPool.findFirst({
    where: { ownerUserId: session.user.id, name: data.clientName }
  });
  if (!existingPool) {
    await prisma.personalPartyPool.create({
      data: {
        ownerUserId: session.user.id,
        partyType: "NATURAL",
        name: data.clientName,
        idNumber: data.clientIdNo || null,
        invoiceTitle: data.clientName
      }
    });
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { officeId: true } });

  const commonData = {
    officeId: data.officeId ?? me?.officeId ?? null,
    caseTitle: data.caseTitle,
    isProxyFiling: data.isProxyFiling,
    leadLawyerId: data.isProxyFiling ? data.leadLawyerId || null : session.user.id,
    leadTakeoverStatus: data.isProxyFiling ? "PENDING" : "CONFIRMED",
    sourceLawyerId: data.sourceLawyerId || session.user.id,
    clientName: data.clientName,
    clientIdNo: data.clientIdNo || null,
    clientIsSuspect: data.clientIsSuspect,
    clientSuspectRelation: data.clientSuspectRelation || null,
    suspectsJson: data.suspects,
    victimsJson: data.victims,
    chargesJson: data.charges,
    coerciveMeasure: data.coerciveMeasure || null,
    coerciveAuthorityRegion: data.coerciveAuthorityRegion || null,
    coerciveAuthorityName: data.coerciveAuthorityName || null,
    handlingAuthorityRegion: data.handlingAuthorityRegion || null,
    handlingAuthorityName: data.handlingAuthorityName || null,
    entrustStageSummary: data.entrustStageSummary || null,
    feeMode: data.feeMode,
    feeSubOption: data.feeSubOption || null,
    selectedStagesJson: data.selectedStages,
    feeAmount: computedFee,
    feeAmountChinese,
    meetingUnitPrice: data.meetingUnitPrice ?? null,
    meetingCount: data.meetingCount ?? null,
    incidentalCivil: data.incidentalCivil,
    incidentalCivilFee: data.incidentalCivilFee ?? null,
    feeRemark: data.feeRemark || null,
    isForeignRelated: data.isForeignRelated,
    isGangRelated: data.isGangRelated,
    isSensitive: data.isSensitive,
    signingPath: data.signingPath
  };

  if (data.id) {
    const current = await prisma.criminalIntakeProfile.findUnique({ where: { id: data.id } });
    if (!current) throw new ActionError("收案记录不存在");
    if (current.lockedAt) throw new ActionError("该收案主表已在提交利益冲突审查时永久锁定，禁止更改主表字段");
    const updated = await prisma.criminalIntakeProfile.update({ where: { id: data.id }, data: commonData });
    revalidatePath("/criminal-intake");
    return serializeDecimals(updated);
  }

  const created = await prisma.criminalIntakeProfile.create({
    data: { ...commonData, workflowStep: "DRAFT", draftExpiresAt: expiresAt, createdById: session.user.id }
  });
  revalidatePath("/criminal-intake");
  return serializeDecimals(created);
}

export async function handleProxyLeadAction(input: {
  profileId: string;
  action: "CONFIRMED" | "TAKEN_OVER" | "RETURNED" | "REASSIGNED";
  newLeadLawyerId?: string;
}) {
  const session = await requireSession("personal");
  await assertNotPaused("INTAKE", input.profileId);

  await prisma.criminalIntakeProfile.update({
    where: { id: input.profileId },
    data: {
      leadTakeoverStatus: input.action,
      ...(input.action === "TAKEN_OVER" ? { leadLawyerId: session.user.id, isProxyFiling: false } : {}),
      ...(input.action === "REASSIGNED" && input.newLeadLawyerId ? { leadLawyerId: input.newLeadLawyerId } : {})
    }
  });
  revalidatePath("/criminal-intake");
  return { ok: true };
}

export async function submitCriminalConflictLock(profileId: string) {
  const session = await requireSession("personal");
  await assertNotPaused("INTAKE", profileId);

  const profile = await prisma.criminalIntakeProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw new ActionError("收案记录不存在");

  const searchRes = await quickGlobalConflictSearch(profile.clientName.replace(/\s+/g, ""));
  const otherHits = searchRes.criminalProfiles.filter((p) => p.id !== profile.id);
  const hitCount = searchRes.matters.length + searchRes.intakes.length + otherHits.length;

  await prisma.criminalIntakeProfile.update({
    where: { id: profileId },
    data: { lockedAt: profile.lockedAt ?? new Date(), workflowStep: "CONFLICT_LOCKED", draftExpiresAt: null }
  });

  let resolutionId: string | null = null;
  if (hitCount > 0) {
    const resCase = await prisma.conflictResolutionCase.create({
      data: {
        officeId: profile.officeId,
        criminalProfileId: profile.id,
        caseTitle: profile.caseTitle,
        sourceType: "AUTO_HIT_CONTINUE",
        status: "PRIMARY_REVIEW",
        hitKeywords: profile.clientName,
        hitSummaryJson: { matters: searchRes.matters, intakes: searchRes.intakes, criminalProfiles: otherHits },
        createdById: session.user.id
      }
    });
    resolutionId = resCase.id;
  }

  revalidatePath("/criminal-intake");
  return { hitCount, resolutionId };
}

export async function advanceConflictResolution(input: {
  resolutionId: string;
  action: "APPLY_TRUE_CONFLICT" | "ESCALATE_TO_COMMITTEE" | "COMMITTEE_APPROVE" | "COMMITTEE_REJECT" | "COMMITTEE_RETURN";
  note: string;
}) {
  const session = await requireSession("personal");
  await assertNotPaused("CONFLICT", input.resolutionId);

  const resCase = await prisma.conflictResolutionCase.findUnique({ where: { id: input.resolutionId } });
  if (!resCase) throw new ActionError("利冲解决单不存在");

  const isCommitteePrivilege = isSystemAdmin(session.user) || session.user.role === "PRINCIPAL_LAWYER";
  let nextStatus = resCase.status;
  let roleLabel = "发起律师";

  if (input.action === "APPLY_TRUE_CONFLICT") {
    nextStatus = "PRIMARY_REVIEW";
    if (resCase.criminalProfileId) {
      await prisma.criminalIntakeProfile.update({
        where: { id: resCase.criminalProfileId },
        data: { workflowStep: "CONFLICT_RESOLUTION" }
      });
    }
  } else if (input.action === "ESCALATE_TO_COMMITTEE") {
    nextStatus = "COMMITTEE_REVIEW";
    roleLabel = "分所初级审核（上呈管委会）";
    if (resCase.criminalProfileId) {
      await prisma.criminalIntakeProfile.update({
        where: { id: resCase.criminalProfileId },
        data: { workflowStep: "CONFLICT_RESOLUTION" }
      });
    }
  } else {
    if (!isCommitteePrivilege) {
      throw new ActionError("依据 9.10 规范，初级审核端无权单方驳回或终结真利冲，必须报管委会/超级管理员终审裁决");
    }
    roleLabel = "管理委员会终审";
    if (input.action === "COMMITTEE_APPROVE") {
      nextStatus = "APPROVED";
      if (resCase.criminalProfileId) {
        await prisma.criminalIntakeProfile.update({
          where: { id: resCase.criminalProfileId },
          data: { workflowStep: "CONFLICT_LOCKED" }
        });
      }
    } else if (input.action === "COMMITTEE_RETURN") {
      nextStatus = "RETURNED_BY_COMMITTEE";
      if (resCase.criminalProfileId) {
        await prisma.criminalIntakeProfile.update({
          where: { id: resCase.criminalProfileId },
          data: { workflowStep: "CONFLICT_LOCKED" }
        });
      }
    } else {
      nextStatus = "REJECTED";
      if (resCase.criminalProfileId) {
        await prisma.criminalIntakeProfile.update({
          where: { id: resCase.criminalProfileId },
          data: { workflowStep: "REJECTED" }
        });
      }
    }
  }

  await prisma.$transaction([
    prisma.conflictResolutionCase.update({
      where: { id: resCase.id },
      data: {
        status: nextStatus,
        ...(input.action === "APPLY_TRUE_CONFLICT" ? { sourceType: "APPLICANT_TRUE_CONFLICT", applicantNote: input.note } : {}),
        ...(input.action === "ESCALATE_TO_COMMITTEE" ? { primaryOpinion: input.note, primaryReviewerId: session.user.id } : {}),
        ...(input.action.startsWith("COMMITTEE_")
          ? { committeeDecision: input.note, decidedById: session.user.id, decidedAt: new Date() }
          : {})
      }
    }),
    prisma.conflictResolutionMessage.create({
      data: {
        resolutionId: resCase.id,
        senderId: session.user.id,
        senderName: session.user.name || "审核人",
        senderRoleLabel: roleLabel,
        content: input.note || `执行操作：${input.action}`
      }
    })
  ]);

  revalidatePath("/criminal-intake");
  return { status: nextStatus };
}

export async function postConflictMeetingMessage(input: {
  resolutionId: string;
  content: string;
  attachmentNote?: string;
}) {
  const session = await requireSession("personal");
  if (!input.content.trim()) throw new ActionError("会议纪要发言内容不能为空");
  await prisma.conflictResolutionMessage.create({
    data: {
      resolutionId: input.resolutionId,
      senderId: session.user.id,
      senderName: session.user.name || "参与人",
      senderRoleLabel: isSystemAdmin(session.user) ? "管委会/超管" : "业务参与方",
      content: input.content.trim(),
      attachmentNote: input.attachmentNote?.trim() || null
    }
  });
  revalidatePath("/criminal-intake");
  return { ok: true };
}

export async function advanceCriminalSigningStep(input: {
  profileId: string;
  signingPath?: "CLIENT_FIRST" | "FIRM_FIRST";
  targetStep:
    | "CLIENT_SIGN_REVIEW"
    | "FIRM_SEAL_PENDING"
    | "FIRM_SEALED_WAITING_RETURN"
    | "ORIGINAL_VERIFY"
    | "FORMAL_ACCEPTED"
    | "WITHDRAWN";
}) {
  const session = await requireSession("personal");
  await assertNotPaused("INTAKE", input.profileId);

  const profile = await prisma.criminalIntakeProfile.findUnique({
    where: { id: input.profileId },
    include: { office: true }
  });
  if (!profile) throw new ActionError("收案记录不存在");

  let formalCaseNo = profile.formalCaseNo;
  if (input.targetStep === "FORMAL_ACCEPTED" && !formalCaseNo) {
    const year = new Date().getFullYear();
    const prefix = profile.office?.caseNoPrefix || "TG";
    const count = await prisma.criminalIntakeProfile.count({ where: { formalCaseNo: { not: null } } });
    formalCaseNo = `(${year})韬冠${prefix}刑辩字第${String(count + 1).padStart(4, "0")}号`;
  }

  await prisma.criminalIntakeProfile.update({
    where: { id: profile.id },
    data: {
      ...(input.signingPath ? { signingPath: input.signingPath } : {}),
      workflowStep: input.targetStep,
      ...(input.targetStep === "FORMAL_ACCEPTED"
        ? { formalCaseNo, originalVerifiedAt: new Date(), originalVerifiedById: session.user.id }
        : {})
    }
  });

  revalidatePath("/criminal-intake");
  return { formalCaseNo };
}
