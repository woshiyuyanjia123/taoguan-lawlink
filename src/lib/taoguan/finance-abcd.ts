/**
 * 韬冠律所内部流水账财务 ABCD 四表精确勾稽引擎（十进制分精度，杜绝浮点误差）。
 *
 * 严格遵循《管理软件开发需求说明书 9.10 版》第 143–179 行全部勾稽关系：
 * - A 表（律所首席观察表）：
 *   A1=ΣB1, A2=ΣB2, A3=ΣB5, A4=ΣB6, A5=ΣB7, A6=ΣB8, A7=ΣB9,
 *   A8=D3, A9=D4, A10=ΣB12, A11=ΣB13, A12=D1, A13=D2,
 *   A14 双口径：firmNetBalance（律所自有留存净余额）与 bankCustodyBalance（银行托管总余额）。
 * - B 表（律师个人虚拟账号）：
 *   进：B1 个人创收、B4 收他人拨款、B10 个税结差、B11 管理费结差；
 *   出：B2 交管理费(默认15%)、B3 向他人拨款、B5 附加管理费(3%入A3)、
 *       B6 实发工资(=C1)、B7 扣社保(=C2..C7)、B8 扣公积金(=C8)、B9 预扣个税(=C11)、
 *       B12 个人报销(=C9)、B13 个人对外付款(=C10)；
 *   B14 账面余额 = 进 - 出；
 *   frozenInvoiceAmount = 已开具(ISSUED)但未上传发票扫描件(scanUploaded=false)的金额汇总；
 *   disposableBalance = B14 - frozenInvoiceAmount（实际可支配余额）。
 * - C/D 表处于 PREPARED（预备保存）状态时，A/B 表同步呈现预备变动预览值（pendingDelta）。
 */

import { fromCents, toCents } from "./chinese-money";

export interface LedgerEntryInput {
  userId: string | null;
  tableCode: string;
  itemCode: string;
  direction: string;
  amount: number | string | { toString(): string };
}

export interface PreparedCRowInput {
  userId: string;
  c1Salary: number | string | { toString(): string };
  c2Pension: number | string | { toString(): string };
  c3Medical: number | string | { toString(): string };
  c4Unemployment: number | string | { toString(): string };
  c5Critical: number | string | { toString(): string };
  c6Maternity: number | string | { toString(): string };
  c7Injury: number | string | { toString(): string };
  c8HousingFund: number | string | { toString(): string };
  c9Reimbursement: number | string | { toString(): string };
  c10PersonalOutPay: number | string | { toString(): string };
  c11PersonalTax: number | string | { toString(): string };
}

export interface PreparedDRowInput {
  itemType: string; // D1_FIRM_PAY | D2_VAT | D3_TAX_REFUND | D4_MGMT_REFUND
  targetUserId: string | null;
  amount: number | string | { toString(): string };
}

export interface InvoiceFreezeInput {
  id: string;
  lawyerId: string;
  amount: number | string | { toString(): string };
  status: string;
  scanUploaded: boolean;
  invoiceCategory: string;
  paymentReceived: boolean;
  issuedAt: Date | null;
  createdAt: Date;
}

export interface TableBView {
  userId: string;
  userName: string;
  officeName: string;
  b1Revenue: number;
  b2MgmtFee: number;
  b3TransferOut: number;
  b4TransferIn: number;
  b5ExtraMgmtFee: number;
  b6Salary: number;
  b7SocialSecurity: number;
  b8HousingFund: number;
  b9PersonalTax: number;
  b10TaxRefund: number;
  b11MgmtRefund: number;
  b12Reimbursement: number;
  b13PersonalOutPay: number;
  b14Balance: number;
  frozenInvoiceAmount: number;
  disposableBalance: number;
  pendingPreparedDelta: number;
  projectedBalance: number;
}

export interface TableAView {
  a1TotalRevenue: number;
  a2MgmtFeeIncome: number;
  a3ExtraMgmtFeeIncome: number;
  a4PaidSalary: number;
  a5SocialSecurity: number;
  a6HousingFund: number;
  a7PrepaidTax: number;
  a8TaxRefund: number;
  a9MgmtRefund: number;
  a10PersonalReimbursement: number;
  a11PersonalOutPay: number;
  a12FirmOutPay: number;
  a13VatDeduction: number;
  /** 律所自有留存净余额 = A2 + A3 - A8 - A9 - A12 - A13 */
  a14FirmNetBalance: number;
  /** 银行托管总余额 = A1 - A4 - A5 - A6 - A7 - A10 - A11 - A12 - A13（等于律所自有留存 + 全体律师账面余额） */
  a14BankCustodyBalance: number;
  pendingFirmDelta: number;
  pendingCustodyDelta: number;
}

export function calculatePeerTransfer(amount: number, surchargeRate = 0.03): {
  amount: number;
  surchargeAmount: number;
  netAmount: number;
} {
  const amtCents = toCents(amount);
  if (amtCents <= 0) {
    throw new Error("互转金额必须大于 0");
  }
  const surchargeCents = Math.round(amtCents * surchargeRate);
  const netCents = amtCents - surchargeCents;
  return {
    amount: fromCents(amtCents),
    surchargeAmount: fromCents(surchargeCents),
    netAmount: fromCents(netCents)
  };
}

export function isInvoiceOverdueAlert(
  inv: Pick<InvoiceFreezeInput, "invoiceCategory" | "paymentReceived" | "status" | "issuedAt" | "createdAt">,
  alertDays = 30,
  now = new Date()
): boolean {
  if (inv.invoiceCategory !== "C_PRE_INVOICE") return false;
  if (inv.paymentReceived) return false;
  if (inv.status === "REJECTED") return false;
  const anchor = inv.issuedAt ?? inv.createdAt;
  const elapsedDays = (now.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays >= alertDays;
}

export function computeAbTables(params: {
  users: Array<{ id: string; name: string; officeName: string }>;
  ledgerEntries: LedgerEntryInput[];
  preparedCRows: PreparedCRowInput[];
  preparedDRows: PreparedDRowInput[];
  invoices: InvoiceFreezeInput[];
}): { tableA: TableAView; tableBList: TableBView[] } {
  const bMap = new Map<
    string,
    {
      userId: string;
      userName: string;
      officeName: string;
      b1: number;
      b2: number;
      b3: number;
      b4: number;
      b5: number;
      b6: number;
      b7: number;
      b8: number;
      b9: number;
      b10: number;
      b11: number;
      b12: number;
      b13: number;
      frozen: number;
      pendingDelta: number;
    }
  >();

  for (const u of params.users) {
    bMap.set(u.id, {
      userId: u.id,
      userName: u.name,
      officeName: u.officeName,
      b1: 0,
      b2: 0,
      b3: 0,
      b4: 0,
      b5: 0,
      b6: 0,
      b7: 0,
      b8: 0,
      b9: 0,
      b10: 0,
      b11: 0,
      b12: 0,
      b13: 0,
      frozen: 0,
      pendingDelta: 0
    });
  }

  let a8 = 0;
  let a9 = 0;
  let a12 = 0;
  let a13 = 0;

  for (const e of params.ledgerEntries) {
    const c = toCents(e.amount);
    if (e.tableCode === "B" && e.userId) {
      let row = bMap.get(e.userId);
      if (!row) {
        row = {
          userId: e.userId,
          userName: "历史人员",
          officeName: "—",
          b1: 0,
          b2: 0,
          b3: 0,
          b4: 0,
          b5: 0,
          b6: 0,
          b7: 0,
          b8: 0,
          b9: 0,
          b10: 0,
          b11: 0,
          b12: 0,
          b13: 0,
          frozen: 0,
          pendingDelta: 0
        };
        bMap.set(e.userId, row);
      }
      switch (e.itemCode) {
        case "B1": row.b1 += c; break;
        case "B2": row.b2 += c; break;
        case "B3": row.b3 += c; break;
        case "B4": row.b4 += c; break;
        case "B5": row.b5 += c; break;
        case "B6": row.b6 += c; break;
        case "B7": row.b7 += c; break;
        case "B8": row.b8 += c; break;
        case "B9": row.b9 += c; break;
        case "B10": row.b10 += c; break;
        case "B11": row.b11 += c; break;
        case "B12": row.b12 += c; break;
        case "B13": row.b13 += c; break;
      }
    } else if (e.tableCode === "A") {
      switch (e.itemCode) {
        case "A8": a8 += c; break;
        case "A9": a9 += c; break;
        case "A12": a12 += c; break;
        case "A13": a13 += c; break;
      }
    }
  }

  // 已开票但未上传扫描件的冻结额
  for (const inv of params.invoices) {
    if (inv.status === "ISSUED" && !inv.scanUploaded) {
      const row = bMap.get(inv.lawyerId);
      if (row) {
        row.frozen += toCents(inv.amount);
      }
    }
  }

  // 预备保存中的 C 表和 D 表变动预览
  let pendingFirmDelta = 0;
  let pendingCustodyDelta = 0;

  for (const cRow of params.preparedCRows) {
    const outCents =
      toCents(cRow.c1Salary) +
      toCents(cRow.c2Pension) +
      toCents(cRow.c3Medical) +
      toCents(cRow.c4Unemployment) +
      toCents(cRow.c5Critical) +
      toCents(cRow.c6Maternity) +
      toCents(cRow.c7Injury) +
      toCents(cRow.c8HousingFund) +
      toCents(cRow.c9Reimbursement) +
      toCents(cRow.c10PersonalOutPay) +
      toCents(cRow.c11PersonalTax);
    const bRow = bMap.get(cRow.userId);
    if (bRow) bRow.pendingDelta -= outCents;
    pendingCustodyDelta -= outCents;
  }

  for (const dRow of params.preparedDRows) {
    const amt = toCents(dRow.amount);
    if (dRow.itemType === "D1_FIRM_PAY" || dRow.itemType === "D2_VAT") {
      pendingFirmDelta -= amt;
      pendingCustodyDelta -= amt;
    } else if (dRow.itemType === "D3_TAX_REFUND" || dRow.itemType === "D4_MGMT_REFUND") {
      pendingFirmDelta -= amt;
      if (dRow.targetUserId) {
        const bRow = bMap.get(dRow.targetUserId);
        if (bRow) bRow.pendingDelta += amt;
      }
    }
  }

  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  let a4 = 0;
  let a5 = 0;
  let a6 = 0;
  let a7 = 0;
  let a10 = 0;
  let a11 = 0;

  const tableBList: TableBView[] = [];
  for (const r of bMap.values()) {
    a1 += r.b1;
    a2 += r.b2;
    a3 += r.b5;
    a4 += r.b6;
    a5 += r.b7;
    a6 += r.b8;
    a7 += r.b9;
    a10 += r.b12;
    a11 += r.b13;

    const bIn = r.b1 + r.b4 + r.b10 + r.b11;
    const bOut = r.b2 + r.b3 + r.b5 + r.b6 + r.b7 + r.b8 + r.b9 + r.b12 + r.b13;
    const b14 = bIn - bOut;
    const disposable = b14 - r.frozen;
    const projected = b14 + r.pendingDelta;

    tableBList.push({
      userId: r.userId,
      userName: r.userName,
      officeName: r.officeName,
      b1Revenue: fromCents(r.b1),
      b2MgmtFee: fromCents(r.b2),
      b3TransferOut: fromCents(r.b3),
      b4TransferIn: fromCents(r.b4),
      b5ExtraMgmtFee: fromCents(r.b5),
      b6Salary: fromCents(r.b6),
      b7SocialSecurity: fromCents(r.b7),
      b8HousingFund: fromCents(r.b8),
      b9PersonalTax: fromCents(r.b9),
      b10TaxRefund: fromCents(r.b10),
      b11MgmtRefund: fromCents(r.b11),
      b12Reimbursement: fromCents(r.b12),
      b13PersonalOutPay: fromCents(r.b13),
      b14Balance: fromCents(b14),
      frozenInvoiceAmount: fromCents(r.frozen),
      disposableBalance: fromCents(disposable),
      pendingPreparedDelta: fromCents(r.pendingDelta),
      projectedBalance: fromCents(projected)
    });
  }

  const a14FirmNet = a2 + a3 - a8 - a9 - a12 - a13;
  const a14BankCustody = a1 - a4 - a5 - a6 - a7 - a10 - a11 - a12 - a13;

  return {
    tableA: {
      a1TotalRevenue: fromCents(a1),
      a2MgmtFeeIncome: fromCents(a2),
      a3ExtraMgmtFeeIncome: fromCents(a3),
      a4PaidSalary: fromCents(a4),
      a5SocialSecurity: fromCents(a5),
      a6HousingFund: fromCents(a6),
      a7PrepaidTax: fromCents(a7),
      a8TaxRefund: fromCents(a8),
      a9MgmtRefund: fromCents(a9),
      a10PersonalReimbursement: fromCents(a10),
      a11PersonalOutPay: fromCents(a11),
      a12FirmOutPay: fromCents(a12),
      a13VatDeduction: fromCents(a13),
      a14FirmNetBalance: fromCents(a14FirmNet),
      a14BankCustodyBalance: fromCents(a14BankCustody),
      pendingFirmDelta: fromCents(pendingFirmDelta),
      pendingCustodyDelta: fromCents(pendingCustodyDelta)
    },
    tableBList
  };
}

export interface ParsedBankRow {
  txDate: Date;
  payerName: string;
  amount: number;
  memo: string;
  bankRef: string;
}

/**
 * 解析银行网银导出的 CSV 流水（支持中英文常见表头：交易日期/日期、对方户名/打款人、入账金额/金额、摘要/附言、流水号）。
 */
export function parseBankStatementCsv(csvText: string): ParsedBankRow[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/\s+/g, ""));
  const findCol = (patterns: string[], fallback: number) => {
    const idx = headers.findIndex((h) => patterns.some((p) => h.includes(p)));
    return idx >= 0 ? idx : fallback;
  };

  const dateCol = findCol(["交易日期", "日期", "时间", "date"], 0);
  const payerCol = findCol(["对方户名", "打款人", "付款人", "户名", "payer"], 1);
  const amountCol = findCol(["入账金额", "贷方金额", "收款金额", "金额", "amount"], 2);
  const memoCol = findCol(["附言", "摘要", "备注", "用途", "memo"], 3);
  const refCol = findCol(["流水号", "凭证号", "交易号", "ref"], 4);

  const rows: ParsedBankRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const rawAmount = (cols[amountCol] ?? "").replace(/[¥￥,\s]/g, "");
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const rawDate = (cols[dateCol] ?? "").replace(/\//g, "-");
    const parsedDate = rawDate ? new Date(rawDate) : new Date();
    const txDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    rows.push({
      txDate,
      payerName: cols[payerCol] || "未知打款方",
      amount: fromCents(toCents(amount)),
      memo: cols[memoCol] || "",
      bankRef: cols[refCol] || `ROW-${i}`
    });
  }
  return rows;
}
