"use server";

import { revalidatePath } from "next/cache";
import { ActionError } from "@/lib/action-error";
import { requireSession } from "@/lib/auth/session";
import { isSystemAdmin } from "@/lib/auth/system-role";
import { serializeDecimals } from "@/lib/decimal";
import { prisma } from "@/lib/prisma";
import { fromCents, toCents } from "@/lib/taoguan/chinese-money";
import { buildVerifyCode } from "@/lib/taoguan/conflict-utils";
import { parseBankStatementCsv } from "@/lib/taoguan/finance-abcd";
import { assertNotPaused } from "./governance";

export async function importBankStatementCsvAction(input: {
  officeId?: string | null;
  yearMonth: string;
  fileName: string;
  csvText: string;
}) {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅财务审核员/管理员可导入银行网银流水");
  }
  await assertNotPaused("FINANCE");

  const parsed = parseBankStatementCsv(input.csvText);
  if (parsed.length === 0) {
    throw new ActionError("未解析到有效的入账流水记录，请检查表头（交易日期,对方户名,入账金额,附言,流水号）");
  }

  const totalCents = parsed.reduce((acc, r) => acc + toCents(r.amount), 0);
  const batch = await prisma.bankStatementBatch.create({
    data: {
      officeId: input.officeId || null,
      yearMonth: input.yearMonth,
      fileName: input.fileName || `银行流水_${input.yearMonth}.csv`,
      uploadedById: session.user.id,
      rowCount: parsed.length,
      totalAmount: fromCents(totalCents),
      entries: {
        create: parsed.map((r) => ({
          txDate: r.txDate,
          payerName: r.payerName,
          amount: r.amount,
          memo: r.memo || null,
          bankRef: r.bankRef || null,
          status: "UNMATCHED"
        }))
      }
    },
    include: { entries: true }
  });

  revalidatePath("/finance-abcd");
  return serializeDecimals(batch);
}

/**
 * 审核端上下联尺子比对推送：支持「单笔相符 FULL / 部分入账 PARTIAL / 拆分对应 SPLIT」并严格防超额与重复推送。
 */
export async function pushBankAllocationToLawyer(input: {
  entryId: string;
  caseNoLabel: string;
  clientName: string;
  lawyerId: string;
  matchMode: "FULL" | "PARTIAL" | "SPLIT";
  amount: number;
  splitNote?: string;
}) {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅财务审核员/管理员可推送入账比对记录");
  }
  await assertNotPaused("FINANCE");

  const entry = await prisma.bankStatementEntry.findUnique({
    where: { id: input.entryId },
    include: { batch: { include: { office: true } } }
  });
  if (!entry) throw new ActionError("银行流水记录不存在");

  const entryTotalCents = toCents(entry.amount);
  const allocatedCents = toCents(entry.allocatedAmount);
  const pushCents = input.matchMode === "FULL" ? entryTotalCents - allocatedCents : toCents(input.amount);

  if (pushCents <= 0) throw new ActionError("该笔银行流水剩余可匹配金额为 0，不可重复推送");
  if (allocatedCents + pushCents > entryTotalCents) {
    throw new ActionError(
      `拆单/核销金额超出该笔流水剩余未拆额（剩余 ¥${fromCents(entryTotalCents - allocatedCents).toFixed(2)}）`
    );
  }

  const lawyer = await prisma.user.findUnique({ where: { id: input.lawyerId }, include: { office: true } });
  const rate = lawyer?.office ? Number(lawyer.office.managementFeeRate) : entry.batch.office ? Number(entry.batch.office.managementFeeRate) : 0.15;
  const mgmtCents = Math.round(pushCents * rate);

  const nextAllocated = allocatedCents + pushCents;
  const nextStatus = nextAllocated >= entryTotalCents ? "MATCHED" : "PARTIAL";

  const [allocation] = await prisma.$transaction([
    prisma.bankStatementAllocation.create({
      data: {
        entryId: entry.id,
        officeId: lawyer?.officeId ?? entry.batch.officeId ?? null,
        caseNoLabel: input.caseNoLabel.trim(),
        clientName: input.clientName.trim(),
        lawyerId: input.lawyerId,
        matchMode: input.matchMode,
        amount: fromCents(pushCents),
        managementFeeRate: rate,
        managementFeeAmount: fromCents(mgmtCents),
        splitNote: input.splitNote?.trim() || null,
        status: "PENDING_LAWYER_CONFIRM",
        pushedById: session.user.id
      }
    }),
    prisma.bankStatementEntry.update({
      where: { id: entry.id },
      data: { allocatedAmount: fromCents(nextAllocated), status: nextStatus }
    })
  ]);

  revalidatePath("/finance-abcd");
  return serializeDecimals(allocation);
}

/** 律师逐笔确认入账：确认后自动计入个人 B1 创收并按办公室管理费率扣除 B2（同步计入 A1/A2）。 */
export async function confirmBankAllocationByLawyer(allocationId: string, comment?: string) {
  const session = await requireSession("personal");
  await assertNotPaused("FINANCE", allocationId);

  const alloc = await prisma.bankStatementAllocation.findUnique({ where: { id: allocationId } });
  if (!alloc) throw new ActionError("待确认入账记录不存在");
  if (alloc.lawyerId !== session.user.id && !isSystemAdmin(session.user)) {
    throw new ActionError("仅案件主办律师本人可确认该笔入账");
  }
  if (alloc.status === "CONFIRMED") throw new ActionError("该笔入账已确认，请勿重复操作");

  await prisma.$transaction([
    prisma.bankStatementAllocation.update({
      where: { id: alloc.id },
      data: { status: "CONFIRMED", lawyerComment: comment?.trim() || null, confirmedAt: new Date() }
    }),
    prisma.internalLedgerEntry.createMany({
      data: [
        {
          officeId: alloc.officeId,
          userId: alloc.lawyerId,
          tableCode: "B",
          itemCode: "B1",
          direction: "IN",
          amount: alloc.amount,
          sourceType: "BANK_CONFIRM",
          sourceId: alloc.id,
          note: `${alloc.caseNoLabel} ${alloc.clientName} 入账确认`,
          createdById: session.user.id
        },
        {
          officeId: alloc.officeId,
          userId: alloc.lawyerId,
          tableCode: "B",
          itemCode: "B2",
          direction: "OUT",
          amount: alloc.managementFeeAmount,
          sourceType: "BANK_CONFIRM",
          sourceId: alloc.id,
          note: `${alloc.caseNoLabel} 按比例扣除律所管理费(入A2)`,
          createdById: session.user.id
        }
      ]
    })
  ]);

  revalidatePath("/finance-abcd");
  return { ok: true };
}

/** 发起 A/B/C/D 类开票申请，并自动生成微信/H5 客户免登录自助填报链接 `/public/invoice/[token]`。 */
export async function createInvoicePortalRequest(input: {
  caseNoLabel: string;
  invoiceCategory: "A_CONFIRMED" | "B_WAIT_CONFIRM" | "C_PRE_INVOICE" | "D_OTHER";
  invoiceType: "ELECTRONIC_NORMAL" | "SPECIAL_VAT";
  amount: number;
  clientTitle: string;
  taxNo?: string;
  clientAddressPhone?: string;
  clientBankAccount?: string;
  applicantEmail?: string;
  remark?: string;
  specialNote?: string;
}) {
  const session = await requireSession("personal");
  await assertNotPaused("FINANCE");
  if (input.amount <= 0) throw new ActionError("开票金额必须大于 0");
  if ((input.invoiceCategory === "C_PRE_INVOICE" || input.invoiceCategory === "D_OTHER") && !input.specialNote?.trim()) {
    throw new ActionError("选择 C（先开票后入账）或 D（其它）时，必须填写特别说明");
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { officeId: true, email: true } });
  const link = await prisma.invoicePortalLink.create({
    data: {
      token: buildVerifyCode("INV").toLowerCase(),
      officeId: me?.officeId ?? null,
      caseNoLabel: input.caseNoLabel.trim(),
      lawyerId: session.user.id,
      invoiceCategory: input.invoiceCategory,
      invoiceType: input.invoiceType,
      amount: fromCents(toCents(input.amount)),
      clientTitle: input.clientTitle.trim(),
      taxNo: input.taxNo?.trim() || null,
      clientAddressPhone: input.clientAddressPhone?.trim() || null,
      clientBankAccount: input.clientBankAccount?.trim() || null,
      applicantEmail: input.applicantEmail?.trim() || me?.email || null,
      remark: input.remark?.trim() || null,
      specialNote: input.specialNote?.trim() || null,
      status: "PENDING"
    }
  });
  revalidatePath("/finance-abcd");
  return serializeDecimals(link);
}

/** 财务标记已开票（未上传扫描件前自动冻结律师 B 表对应可支配余额） / 补传发票扫描件（上传即秒解冻） / 标记收款解除 C 类红警。 */
export async function updateInvoicePortalStatus(input: {
  id: string;
  action: "ISSUE" | "UPLOAD_SCAN" | "MARK_PAID" | "REJECT";
  scanFileName?: string;
}) {
  const session = await requireSession("personal");
  await assertNotPaused("FINANCE", input.id);

  if (input.action === "ISSUE") {
    if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
      throw new ActionError("仅财务审核员可标记已办理开票");
    }
    await prisma.invoicePortalLink.update({
      where: { id: input.id },
      data: { status: "ISSUED", issuedAt: new Date() }
    });
  } else if (input.action === "UPLOAD_SCAN") {
    await prisma.invoicePortalLink.update({
      where: { id: input.id },
      data: { scanUploaded: true, scanFileName: input.scanFileName?.trim() || "电子发票扫描件.pdf" }
    });
  } else if (input.action === "MARK_PAID") {
    await prisma.invoicePortalLink.update({
      where: { id: input.id },
      data: { paymentReceived: true }
    });
  } else {
    await prisma.invoicePortalLink.update({
      where: { id: input.id },
      data: { status: "REJECTED" }
    });
  }

  revalidatePath("/finance-abcd");
  return { ok: true };
}
