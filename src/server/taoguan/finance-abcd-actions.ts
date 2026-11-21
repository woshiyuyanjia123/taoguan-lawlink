"use server";

import { revalidatePath } from "next/cache";
import { ActionError } from "@/lib/action-error";
import { requireSession } from "@/lib/auth/session";
import { isSystemAdmin } from "@/lib/auth/system-role";
import { serializeDecimals } from "@/lib/decimal";
import { prisma } from "@/lib/prisma";
import { fromCents, toCents } from "@/lib/taoguan/chinese-money";
import {
  calculatePeerTransfer,
  computeAbTables,
  isInvoiceOverdueAlert
} from "@/lib/taoguan/finance-abcd";
import { assertNotPaused } from "./governance";

export async function getFinanceAbcdDashboard(officeIdFilter?: string) {
  const session = await requireSession("personal");
  const isFinanceAdmin = isSystemAdmin(session.user) || session.user.role === "PRINCIPAL_LAWYER";
  const officeWhere = officeIdFilter ? { officeId: officeIdFilter } : {};

  const [offices, users, ledgerEntries, batchesC, batchesD, peerTransfers, personalRequests, invoices, bankBatches, pendingAllocations] =
    await Promise.all([
      prisma.office.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
      prisma.user.findMany({
        where: officeIdFilter ? { officeId: officeIdFilter } : {},
        select: { id: true, name: true, email: true, employmentType: true, employmentStatus: true, officeId: true, office: { select: { name: true } } },
        orderBy: { name: "asc" }
      }),
      prisma.internalLedgerEntry.findMany({ where: officeWhere, orderBy: { occurredAt: "desc" } }),
      prisma.financeBatchC.findMany({
        where: officeWhere,
        orderBy: { createdAt: "desc" },
        include: { rows: true, office: { select: { name: true } } },
        take: 30
      }),
      prisma.financeBatchD.findMany({
        where: officeWhere,
        orderBy: { createdAt: "desc" },
        include: { rows: true, office: { select: { name: true } } },
        take: 30
      }),
      prisma.peerTransfer.findMany({
        where: isFinanceAdmin ? officeWhere : { OR: [{ fromUserId: session.user.id }, { toUserId: session.user.id }] },
        orderBy: { createdAt: "desc" },
        include: { fromUser: { select: { id: true, name: true } }, toUser: { select: { id: true, name: true } } },
        take: 60
      }),
      prisma.financePersonalRequest.findMany({
        where: isFinanceAdmin ? officeWhere : { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { applicant: { select: { id: true, name: true } } },
        take: 80
      }),
      prisma.invoicePortalLink.findMany({
        where: isFinanceAdmin ? officeWhere : { lawyerId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      prisma.bankStatementBatch.findMany({
        where: officeWhere,
        orderBy: { createdAt: "desc" },
        include: {
          entries: {
            orderBy: { txDate: "desc" },
            include: { allocations: true }
          }
        },
        take: 12
      }),
      prisma.bankStatementAllocation.findMany({
        where: isFinanceAdmin ? officeWhere : { lawyerId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { entry: true },
        take: 100
      })
    ]);

  const preparedCRows = batchesC.filter((b) => b.status === "PREPARED").flatMap((b) => b.rows);
  const preparedDRows = batchesD.filter((b) => b.status === "PREPARED").flatMap((b) => b.rows);

  const { tableA, tableBList } = computeAbTables({
    users: users.map((u) => ({ id: u.id, name: u.name, officeName: u.office?.name ?? "韬冠总所" })),
    ledgerEntries,
    preparedCRows,
    preparedDRows,
    invoices
  });

  const overdueInvoices = invoices.filter((inv) => isInvoiceOverdueAlert(inv, 30));

  return serializeDecimals({
    currentUserId: session.user.id,
    isFinanceAdmin,
    offices,
    users,
    tableA,
    tableBList: isFinanceAdmin ? tableBList : tableBList.filter((b) => b.userId === session.user.id),
    myTableB: tableBList.find((b) => b.userId === session.user.id) ?? null,
    batchesC,
    batchesD,
    peerTransfers,
    personalRequests,
    invoices,
    overdueInvoices,
    bankBatches,
    pendingAllocations
  });
}

export async function createPeerTransfer(input: { toUserId: string; amount: number; memo?: string }) {
  const session = await requireSession("personal");
  await assertNotPaused("FINANCE");
  if (input.toUserId === session.user.id) throw new ActionError("不能向本人账户划拨资金");

  const fromUser = await prisma.user.findUnique({ where: { id: session.user.id }, include: { office: true } });
  const rate = fromUser?.office ? Number(fromUser.office.peerTransferFeeRate) : 0.03;
  const calc = calculatePeerTransfer(input.amount, rate);

  const transfer = await prisma.peerTransfer.create({
    data: {
      officeId: fromUser?.officeId ?? null,
      fromUserId: session.user.id,
      toUserId: input.toUserId,
      amount: calc.amount,
      surchargeRate: rate,
      surchargeAmount: calc.surchargeAmount,
      netAmount: calc.netAmount,
      memo: input.memo?.trim() || null,
      status: "PENDING_RECEIVER"
    }
  });
  revalidatePath("/finance-abcd");
  return serializeDecimals(transfer);
}

/** 个人账号自由互转确认（免审批，收款方点击确认即生效，并自动扣 3% 附加管理费入 B5 与 A3）。 */
export async function confirmPeerTransfer(transferId: string, confirmMemo?: string) {
  const session = await requireSession("personal");
  await assertNotPaused("FINANCE", transferId);

  const tr = await prisma.peerTransfer.findUnique({ where: { id: transferId } });
  if (!tr) throw new ActionError("互转记录不存在");
  if (tr.toUserId !== session.user.id && !isSystemAdmin(session.user)) {
    throw new ActionError("仅收款人本人可确认接收该笔划拨");
  }
  if (tr.status !== "PENDING_RECEIVER") throw new ActionError("该笔互转已处理");

  await prisma.$transaction([
    prisma.peerTransfer.update({
      where: { id: tr.id },
      data: { status: "CONFIRMED", confirmMemo: confirmMemo?.trim() || null, confirmedAt: new Date() }
    }),
    prisma.internalLedgerEntry.createMany({
      data: [
        {
          officeId: tr.officeId,
          userId: tr.fromUserId,
          tableCode: "B",
          itemCode: "B3",
          direction: "OUT",
          amount: tr.amount,
          sourceType: "PEER_TRANSFER",
          sourceId: tr.id,
          note: tr.memo || "向所内他人拨款",
          createdById: session.user.id
        },
        {
          officeId: tr.officeId,
          userId: tr.toUserId,
          tableCode: "B",
          itemCode: "B4",
          direction: "IN",
          amount: tr.amount,
          sourceType: "PEER_TRANSFER",
          sourceId: tr.id,
          note: tr.memo || "收到所内他人拨款",
          createdById: session.user.id
        },
        {
          officeId: tr.officeId,
          userId: tr.toUserId,
          tableCode: "B",
          itemCode: "B5",
          direction: "OUT",
          amount: tr.surchargeAmount,
          sourceType: "PEER_TRANSFER",
          sourceId: tr.id,
          note: "收他人拨款自动扣除附加管理费(入A3)",
          createdById: session.user.id
        }
      ]
    })
  ]);

  revalidatePath("/finance-abcd");
  return { ok: true };
}

export async function submitPersonalFinanceRequest(input: {
  requestType: string;
  amount: number;
  reason: string;
  payeeInfo?: string;
}) {
  const session = await requireSession("personal");
  await assertNotPaused("FINANCE");
  if (input.amount <= 0) throw new ActionError("申请金额必须大于 0");
  if (!input.reason.trim()) throw new ActionError("请填写申请事由");

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { officeId: true } });
  const req = await prisma.financePersonalRequest.create({
    data: {
      officeId: me?.officeId ?? null,
      userId: session.user.id,
      requestType: input.requestType,
      amount: fromCents(toCents(input.amount)),
      reason: input.reason.trim(),
      payeeInfo: input.payeeInfo?.trim() || null,
      status: "PENDING"
    }
  });
  revalidatePath("/finance-abcd");
  return serializeDecimals(req);
}

export async function createOrUpdateBatchC(input: {
  officeId?: string | null;
  yearMonth: string;
  note?: string;
  rows: Array<{
    userId: string;
    userName: string;
    c1Salary: number;
    c2Pension: number;
    c3Medical: number;
    c4Unemployment: number;
    c5Critical: number;
    c6Maternity: number;
    c7Injury: number;
    c8HousingFund: number;
    c9Reimbursement: number;
    c10PersonalOutPay: number;
    c11PersonalTax: number;
  }>;
}) {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅管理员或财务操作员可创建 C 月度操作表");
  }
  await assertNotPaused("FINANCE");

  const batch = await prisma.financeBatchC.create({
    data: {
      officeId: input.officeId || null,
      yearMonth: input.yearMonth,
      status: "DRAFT",
      note: input.note?.trim() || null,
      createdById: session.user.id,
      rows: {
        create: input.rows.map((r) => ({
          userId: r.userId,
          userName: r.userName,
          c1Salary: r.c1Salary,
          c2Pension: r.c2Pension,
          c3Medical: r.c3Medical,
          c4Unemployment: r.c4Unemployment,
          c5Critical: r.c5Critical,
          c6Maternity: r.c6Maternity,
          c7Injury: r.c7Injury,
          c8HousingFund: r.c8HousingFund,
          c9Reimbursement: r.c9Reimbursement,
          c10PersonalOutPay: r.c10PersonalOutPay,
          c11PersonalTax: r.c11PersonalTax
        }))
      }
    }
  });
  revalidatePath("/finance-abcd");
  return serializeDecimals(batch);
}

export async function transitionBatchC(batchId: string, action: "PREPARE" | "RECORD_DOWNLOAD" | "COMPLETE") {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅管理员或财务操作员可推进 C 表状态");
  }
  await assertNotPaused("FINANCE", batchId);

  const batch = await prisma.financeBatchC.findUnique({ where: { id: batchId }, include: { rows: true } });
  if (!batch) throw new ActionError("C 月表不存在");

  if (action === "PREPARE") {
    if (batch.status !== "DRAFT") throw new ActionError("仅草稿状态可点击预备保存");
    await prisma.financeBatchC.update({ where: { id: batch.id }, data: { status: "PREPARED", preparedAt: new Date() } });
    revalidatePath("/finance-abcd");
    return { status: "PREPARED", downloadCount: batch.downloadCount };
  }

  if (action === "RECORD_DOWNLOAD") {
    if (batch.status === "DRAFT") throw new ActionError("须先点击「预备保存」方可解锁 C 表下载功能");
    const updated = await prisma.financeBatchC.update({
      where: { id: batch.id },
      data: { downloadCount: { increment: 1 } }
    });
    revalidatePath("/finance-abcd");
    return { status: updated.status, downloadCount: updated.downloadCount };
  }

  if (batch.status !== "PREPARED") throw new ActionError("须先预备保存后再点击已办理");
  const ledgerRows: Array<{
    officeId: string | null;
    userId: string;
    tableCode: string;
    itemCode: string;
    direction: string;
    amount: number;
    sourceType: string;
    sourceId: string;
    note: string;
    createdById: string;
  }> = [];

  for (const r of batch.rows) {
    const social =
      fromCents(
        toCents(r.c2Pension) +
          toCents(r.c3Medical) +
          toCents(r.c4Unemployment) +
          toCents(r.c5Critical) +
          toCents(r.c6Maternity) +
          toCents(r.c7Injury)
      );
    const pairs: Array<[string, number, string]> = [
      ["B6", Number(r.c1Salary), `${batch.yearMonth} C1 实发工资`],
      ["B7", social, `${batch.yearMonth} C2-C7 扣社保`],
      ["B8", Number(r.c8HousingFund), `${batch.yearMonth} C8 扣公积金`],
      ["B9", Number(r.c11PersonalTax), `${batch.yearMonth} C11 预扣个税`],
      ["B12", Number(r.c9Reimbursement), `${batch.yearMonth} C9 个人报销`],
      ["B13", Number(r.c10PersonalOutPay), `${batch.yearMonth} C10 个人对外付款`]
    ];
    for (const [code, amt, note] of pairs) {
      if (amt > 0) {
        ledgerRows.push({
          officeId: batch.officeId,
          userId: r.userId,
          tableCode: "B",
          itemCode: code,
          direction: "OUT",
          amount: amt,
          sourceType: "BATCH_C",
          sourceId: batch.id,
          note,
          createdById: session.user.id
        });
      }
    }
  }

  await prisma.$transaction([
    prisma.financeBatchC.update({
      where: { id: batch.id },
      data: { status: "COMPLETED", completedAt: new Date(), completedById: session.user.id }
    }),
    ...(ledgerRows.length ? [prisma.internalLedgerEntry.createMany({ data: ledgerRows })] : [])
  ]);

  revalidatePath("/finance-abcd");
  return { status: "COMPLETED", downloadCount: batch.downloadCount };
}

export async function createBatchD(input: {
  officeId?: string | null;
  title: string;
  rows: Array<{ itemType: string; targetUserId?: string | null; targetName?: string; amount: number; payeeName?: string; reason?: string }>;
}) {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅管理员或财务操作员可创建 D 单次操作表");
  }
  await assertNotPaused("FINANCE");
  if (!input.rows.length) throw new ActionError("D 表至少包含 1 条操作明细");

  const batch = await prisma.financeBatchD.create({
    data: {
      officeId: input.officeId || null,
      title: input.title.trim() || "单次财务操作单",
      status: "DRAFT",
      createdById: session.user.id,
      rows: {
        create: input.rows.map((r) => ({
          itemType: r.itemType,
          targetUserId: r.targetUserId || null,
          targetName: r.targetName || null,
          amount: fromCents(toCents(r.amount)),
          payeeName: r.payeeName || null,
          reason: r.reason || null
        }))
      }
    }
  });
  revalidatePath("/finance-abcd");
  return serializeDecimals(batch);
}

export async function transitionBatchD(batchId: string, action: "PREPARE" | "RECORD_DOWNLOAD" | "COMPLETE") {
  const session = await requireSession("personal");
  if (!isSystemAdmin(session.user) && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new ActionError("仅管理员或财务操作员可推进 D 表状态");
  }
  await assertNotPaused("FINANCE", batchId);

  const batch = await prisma.financeBatchD.findUnique({ where: { id: batchId }, include: { rows: true } });
  if (!batch) throw new ActionError("D 操作单表不存在");

  if (action === "PREPARE") {
    if (batch.status !== "DRAFT") throw new ActionError("仅草稿状态可预备保存");
    await prisma.financeBatchD.update({ where: { id: batch.id }, data: { status: "PREPARED", preparedAt: new Date() } });
    revalidatePath("/finance-abcd");
    return { status: "PREPARED", downloadCount: batch.downloadCount };
  }

  if (action === "RECORD_DOWNLOAD") {
    if (batch.status === "DRAFT") throw new ActionError("须先点击「预备保存」解锁下载功能");
    const updated = await prisma.financeBatchD.update({
      where: { id: batch.id },
      data: { downloadCount: { increment: 1 } }
    });
    revalidatePath("/finance-abcd");
    return { status: updated.status, downloadCount: updated.downloadCount };
  }

  if (batch.status !== "PREPARED") throw new ActionError("须先预备保存后再点击已办理");
  const ledgerRows: Array<{
    officeId: string | null;
    userId: string | null;
    tableCode: string;
    itemCode: string;
    direction: string;
    amount: number;
    sourceType: string;
    sourceId: string;
    note: string;
    createdById: string;
  }> = [];

  for (const r of batch.rows) {
    const amt = Number(r.amount);
    if (amt <= 0) continue;
    if (r.itemType === "D1_FIRM_PAY") {
      ledgerRows.push({
        officeId: batch.officeId, userId: null, tableCode: "A", itemCode: "A12", direction: "OUT",
        amount: amt, sourceType: "BATCH_D", sourceId: batch.id, note: r.reason || "D1 律所对外付款", createdById: session.user.id
      });
    } else if (r.itemType === "D2_VAT") {
      ledgerRows.push({
        officeId: batch.officeId, userId: null, tableCode: "A", itemCode: "A13", direction: "OUT",
        amount: amt, sourceType: "BATCH_D", sourceId: batch.id, note: r.reason || "D2 扣增值税", createdById: session.user.id
      });
    } else if (r.itemType === "D3_TAX_REFUND") {
      ledgerRows.push({
        officeId: batch.officeId, userId: null, tableCode: "A", itemCode: "A8", direction: "OUT",
        amount: amt, sourceType: "BATCH_D", sourceId: batch.id, note: r.reason || "D3 个税结差退还", createdById: session.user.id
      });
      if (r.targetUserId) {
        ledgerRows.push({
          officeId: batch.officeId, userId: r.targetUserId, tableCode: "B", itemCode: "B10", direction: "IN",
          amount: amt, sourceType: "BATCH_D", sourceId: batch.id, note: r.reason || "收到个税结差退还(A→B)", createdById: session.user.id
        });
      }
    } else if (r.itemType === "D4_MGMT_REFUND") {
      ledgerRows.push({
        officeId: batch.officeId, userId: null, tableCode: "A", itemCode: "A9", direction: "OUT",
        amount: amt, sourceType: "BATCH_D", sourceId: batch.id, note: r.reason || "D4 管理费结差退还", createdById: session.user.id
      });
      if (r.targetUserId) {
        ledgerRows.push({
          officeId: batch.officeId, userId: r.targetUserId, tableCode: "B", itemCode: "B11", direction: "IN",
          amount: amt, sourceType: "BATCH_D", sourceId: batch.id, note: r.reason || "收到管理费结差退还(A→B)", createdById: session.user.id
        });
      }
    }
  }

  await prisma.$transaction([
    prisma.financeBatchD.update({
      where: { id: batch.id },
      data: { status: "COMPLETED", completedAt: new Date(), completedById: session.user.id }
    }),
    ...(ledgerRows.length ? [prisma.internalLedgerEntry.createMany({ data: ledgerRows })] : [])
  ]);

  revalidatePath("/finance-abcd");
  return { status: "COMPLETED", downloadCount: batch.downloadCount };
}
