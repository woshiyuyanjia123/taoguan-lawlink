"use server";

import { revalidatePath } from "next/cache";
import { ActionError } from "@/lib/action-error";
import { requireSession, requireSystemAdmin } from "@/lib/auth/session";
import { isSystemAdmin } from "@/lib/auth/system-role";
import { serializeDecimals } from "@/lib/decimal";
import { prisma } from "@/lib/prisma";
import { buildVerifyCode } from "@/lib/taoguan/conflict-utils";
import { assertNotPaused } from "./governance";

export async function getHrAdminDashboard() {
  const session = await requireSession("personal");
  const isAdmin = isSystemAdmin(session.user) || session.user.role === "PRINCIPAL_LAWYER";

  const [me, offices, users, policies, hrRecords, adminRequests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, officeId: true, employmentType: true, employmentStatus: true, offboardAllowed: true, barLicenseNo: true }
    }),
    prisma.office.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        systemRole: true,
        active: true,
        officeId: true,
        office: { select: { name: true } },
        employmentType: true,
        employmentStatus: true,
        offboardAllowed: true,
        barLicenseNo: true
      },
      orderBy: [{ employmentStatus: "asc" }, { name: "asc" }]
    }),
    prisma.firmPolicyDocument.findMany({
      where: { active: true },
      orderBy: { publishedAt: "desc" },
      include: { acknowledgements: { orderBy: { ackAt: "desc" } } }
    }),
    prisma.hrLifecycleRecord.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        office: { select: { name: true } }
      },
      take: 80
    }),
    prisma.adminWorkflowRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        applicant: { select: { id: true, name: true } },
        office: { select: { name: true } }
      },
      take: 80
    })
  ]);

  return serializeDecimals({
    currentUser: me,
    isAdmin,
    offices,
    users,
    policies,
    hrRecords,
    adminRequests
  });
}

export async function publishPolicyDocument(input: {
  title: string;
  version: string;
  category?: string;
  content: string;
  mandatory?: boolean;
}) {
  const session = await requireSystemAdmin();
  if (!input.title.trim() || !input.content.trim()) throw new ActionError("制度标题与正文不能为空");

  const doc = await prisma.firmPolicyDocument.create({
    data: {
      title: input.title.trim(),
      version: input.version.trim() || "v1.0",
      category: input.category?.trim() || "FIRM_RULE",
      content: input.content.trim(),
      mandatory: input.mandatory ?? true,
      publishedBy: session.user.name || session.user.id
    }
  });
  revalidatePath("/hr-admin");
  return doc;
}

/** 员工签署确认规章制度（带防伪水印编码，修订后历史版本与新版本并列存证）。 */
export async function acknowledgePolicyDocument(policyId: string) {
  const session = await requireSession("personal");
  const existing = await prisma.policyAckRecord.findUnique({
    where: { policyId_userId: { policyId, userId: session.user.id } }
  });
  if (existing) return existing;

  const ack = await prisma.policyAckRecord.create({
    data: {
      policyId,
      userId: session.user.id,
      userName: session.user.name || "员工",
      watermarkCode: buildVerifyCode("TG-ACK")
    }
  });
  revalidatePath("/hr-admin");
  return ack;
}

/** 审批岗开放/关闭指定人员的线上离职申请权限（9.10 需求第 44 行：线下谈妥前任何人不得自行发起离职）。 */
export async function toggleUserOffboardGate(userId: string, allowed: boolean) {
  await requireSystemAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { offboardAllowed: allowed }
  });
  revalidatePath("/hr-admin");
  return { ok: true };
}

export async function submitHrLifecycleRecord(input: {
  recordType: "ONBOARDING" | "PROFILE_CHANGE" | "OFFBOARDING";
  officeId?: string | null;
  employmentType: string;
  summary: string;
}) {
  const session = await requireSession("personal");
  await assertNotPaused("HR");

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) throw new ActionError("当前用户不存在");

  if (input.recordType === "OFFBOARDING" && !me.offboardAllowed) {
    throw new ActionError("根据 9.10 人事规范，离职须先线下与律所领导谈妥并由审批岗为您开启离职申请通道后方可提交");
  }
  if (!input.summary.trim()) throw new ActionError("请填写人事申请/变更详细说明");

  const rec = await prisma.hrLifecycleRecord.create({
    data: {
      officeId: input.officeId ?? me.officeId ?? null,
      userId: session.user.id,
      recordType: input.recordType,
      employmentType: input.employmentType || me.employmentType,
      summary: input.summary.trim(),
      status: "PENDING"
    }
  });
  revalidatePath("/hr-admin");
  return rec;
}

export async function reviewHrLifecycleRecord(input: {
  recordId: string;
  decision: "APPROVED" | "REJECTED";
  reviewNote?: string;
}) {
  const session = await requireSystemAdmin();
  await assertNotPaused("HR", input.recordId);

  const rec = await prisma.hrLifecycleRecord.findUnique({ where: { id: input.recordId } });
  if (!rec) throw new ActionError("人事申请记录不存在");

  const archiveNo =
    input.decision === "APPROVED" && rec.recordType === "OFFBOARDING"
      ? `TG-HR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      : rec.archiveNo;

  await prisma.$transaction(async (tx) => {
    await tx.hrLifecycleRecord.update({
      where: { id: rec.id },
      data: {
        status: input.decision === "APPROVED" && rec.recordType === "OFFBOARDING" ? "ARCHIVED" : input.decision,
        archiveNo,
        reviewerId: session.user.id,
        reviewNote: input.reviewNote?.trim() || null,
        reviewedAt: new Date()
      }
    });
    if (input.decision === "APPROVED" && rec.recordType === "OFFBOARDING") {
      // 离职后保留账号全部关联档案与财务历史，打上 OFFBOARDED 标签移入离职人员列表
      await tx.user.update({
        where: { id: rec.userId },
        data: { employmentStatus: "OFFBOARDED", offboardAllowed: false }
      });
    } else if (input.decision === "APPROVED" && rec.recordType === "ONBOARDING" && rec.officeId) {
      await tx.user.update({
        where: { id: rec.userId },
        data: { officeId: rec.officeId, employmentType: rec.employmentType, employmentStatus: "ACTIVE" }
      });
    }
  });

  revalidatePath("/hr-admin");
  return { archiveNo };
}

export async function submitAdminWorkflowRequest(input: {
  requestType: "PROCUREMENT" | "EXTERNAL_CONTRACT" | "EXTERNAL_PAYMENT" | "RECRUITMENT" | "GENERAL";
  title: string;
  amount?: number | null;
  counterparty?: string;
  description: string;
}) {
  const session = await requireSession("personal");
  await assertNotPaused("ADMIN");
  if (!input.title.trim() || !input.description.trim()) throw new ActionError("申请标题与详细事由不能为空");

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { officeId: true } });
  const req = await prisma.adminWorkflowRequest.create({
    data: {
      officeId: me?.officeId ?? null,
      applicantId: session.user.id,
      requestType: input.requestType,
      title: input.title.trim(),
      amount: input.amount ?? null,
      counterparty: input.counterparty?.trim() || null,
      description: input.description.trim(),
      status: "PENDING"
    }
  });
  revalidatePath("/hr-admin");
  return serializeDecimals(req);
}

export async function reviewAdminWorkflowRequest(input: {
  requestId: string;
  decision: "COMMITTEE_REVIEW" | "APPROVED" | "REJECTED";
  reviewNote?: string;
}) {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅管理员或管委会成员可审批行政事务");
  }
  await assertNotPaused("ADMIN", input.requestId);

  await prisma.adminWorkflowRequest.update({
    where: { id: input.requestId },
    data: {
      status: input.decision,
      reviewerId: session.user.id,
      reviewNote: input.reviewNote?.trim() || null,
      reviewedAt: new Date()
    }
  });
  revalidatePath("/hr-admin");
  return { ok: true };
}
