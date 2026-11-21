import { describe, expect, it } from "vitest";
import { amountToChineseUppercase } from "@/lib/taoguan/chinese-money";
import { sanitizeConflictKeyword, validateConflictKeyword } from "@/lib/taoguan/conflict-utils";
import {
  calculatePeerTransfer,
  computeAbTables,
  isInvoiceOverdueAlert,
  parseBankStatementCsv
} from "@/lib/taoguan/finance-abcd";

describe("韬冠律所核心规则单元测试（9.10 需求书全量勾稽校验）", () => {
  it("人民币中文大写精准换算", () => {
    expect(amountToChineseUppercase(0)).toBe("零元整");
    expect(amountToChineseUppercase(50000)).toBe("伍万元整");
    expect(amountToChineseUppercase(123456.78)).toBe("壹拾贰万叁仟肆佰伍拾陆元柒角捌分");
    expect(amountToChineseUppercase(10005.04)).toBe("壹万零伍元零肆分");
    expect(amountToChineseUppercase(-88.5)).toBe("负捌拾捌元伍角");
  });

  it("全域便捷利益冲突检索严格禁止空格绕过", () => {
    expect(validateConflictKeyword("张 三")).toEqual({
      ok: false,
      error: "利益冲突检索词严禁包含空格，请去除空格后重新检索"
    });
    expect(validateConflictKeyword("张三\u3000公司").ok).toBe(false);
    expect(validateConflictKeyword("韬冠科技有限公司")).toEqual({
      ok: true,
      value: "韬冠科技有限公司"
    });
    expect(sanitizeConflictKeyword(" 韬冠 科技 有限公司 ")).toBe("韬冠科技有限公司");
  });

  it("律师个人账号自由互转自动扣除 3% 附加管理费（精确到分）", () => {
    const res = calculatePeerTransfer(10000, 0.03);
    expect(res).toEqual({
      amount: 10000,
      surchargeAmount: 300,
      netAmount: 9700
    });
    expect(() => calculatePeerTransfer(0)).toThrow("互转金额必须大于 0");
  });

  it("内部流水账 ABCD 四表恒等式、未传发票冻结与预备保存变动预览", () => {
    const { tableA, tableBList } = computeAbTables({
      users: [
        { id: "u1", name: "张主办", officeName: "韬冠总所" },
        { id: "u2", name: "李协办", officeName: "韬冠总所" }
      ],
      ledgerEntries: [
        // u1 入账确认 100,000，扣 15% 管理费 15,000
        { userId: "u1", tableCode: "B", itemCode: "B1", direction: "IN", amount: 100000 },
        { userId: "u1", tableCode: "B", itemCode: "B2", direction: "OUT", amount: 15000 },
        // u1 自由互转 10,000 给 u2，u2 自动扣 3% 附加管理费 300 入 A3
        { userId: "u1", tableCode: "B", itemCode: "B3", direction: "OUT", amount: 10000 },
        { userId: "u2", tableCode: "B", itemCode: "B4", direction: "IN", amount: 10000 },
        { userId: "u2", tableCode: "B", itemCode: "B5", direction: "OUT", amount: 300 },
        // C 表发放 u1 工资 20,000 + 个税 2,000
        { userId: "u1", tableCode: "B", itemCode: "B6", direction: "OUT", amount: 20000 },
        { userId: "u1", tableCode: "B", itemCode: "B9", direction: "OUT", amount: 2000 },
        // D 表：律所对外付款 D1=5,000，管理费结差退还 u1 D4=1,000
        { userId: null, tableCode: "A", itemCode: "A12", direction: "OUT", amount: 5000 },
        { userId: null, tableCode: "A", itemCode: "A9", direction: "OUT", amount: 1000 },
        { userId: "u1", tableCode: "B", itemCode: "B11", direction: "IN", amount: 1000 }
      ],
      preparedCRows: [
        {
          userId: "u1",
          c1Salary: 5000,
          c2Pension: 0,
          c3Medical: 0,
          c4Unemployment: 0,
          c5Critical: 0,
          c6Maternity: 0,
          c7Injury: 0,
          c8HousingFund: 1000,
          c9Reimbursement: 0,
          c10PersonalOutPay: 0,
          c11PersonalTax: 0
        }
      ],
      preparedDRows: [{ itemType: "D2_VAT", targetUserId: null, amount: 800 }],
      invoices: [
        // u1 有一张 30,000 已开票但未上传扫描件 → 应冻结 30,000 可支配余额
        {
          id: "inv1",
          lawyerId: "u1",
          amount: 30000,
          status: "ISSUED",
          scanUploaded: false,
          invoiceCategory: "A_CONFIRMED",
          paymentReceived: true,
          issuedAt: new Date("2026-10-01"),
          createdAt: new Date("2026-10-01")
        },
        // 已上传扫描件的 20,000 不冻结
        {
          id: "inv2",
          lawyerId: "u1",
          amount: 20000,
          status: "ISSUED",
          scanUploaded: true,
          invoiceCategory: "A_CONFIRMED",
          paymentReceived: true,
          issuedAt: new Date("2026-10-02"),
          createdAt: new Date("2026-10-02")
        }
      ]
    });

    const u1 = tableBList.find((b) => b.userId === "u1")!;
    const u2 = tableBList.find((b) => b.userId === "u2")!;

    // u1 进: 100,000 + 1,000 = 101,000; 出: 15,000 + 10,000 + 20,000 + 2,000 = 47,000 → B14 = 54,000
    expect(u1.b14Balance).toBe(54000);
    expect(u1.frozenInvoiceAmount).toBe(30000);
    expect(u1.disposableBalance).toBe(24000);
    expect(u1.pendingPreparedDelta).toBe(-6000);
    expect(u1.projectedBalance).toBe(48000);

    // u2 进: 10,000; 出: 300 → B14 = 9,700
    expect(u2.b14Balance).toBe(9700);

    // A 表核对
    expect(tableA.a1TotalRevenue).toBe(100000);
    expect(tableA.a2MgmtFeeIncome).toBe(15000);
    expect(tableA.a3ExtraMgmtFeeIncome).toBe(300);
    expect(tableA.a14FirmNetBalance).toBe(9300); // 15000 + 300 - 1000 - 5000
    expect(tableA.a14BankCustodyBalance).toBe(73000); // 100000 - 20000 - 2000 - 5000
    // 终极财务恒等式：银行托管总余额 === 律所自有留存净余额 + 全体律师个人余额合计
    expect(tableA.a14BankCustodyBalance).toBe(tableA.a14FirmNetBalance + u1.b14Balance + u2.b14Balance);
    expect(tableA.pendingFirmDelta).toBe(-800);
    expect(tableA.pendingCustodyDelta).toBe(-6800);
  });

  it("C 类先开票后入账超 30 天未收款触发红色警报", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    expect(
      isInvoiceOverdueAlert(
        {
          invoiceCategory: "C_PRE_INVOICE",
          paymentReceived: false,
          status: "ISSUED",
          issuedAt: new Date("2026-10-15T00:00:00Z"),
          createdAt: new Date("2026-10-15T00:00:00Z")
        },
        30,
        now
      )
    ).toBe(true);

    expect(
      isInvoiceOverdueAlert(
        {
          invoiceCategory: "C_PRE_INVOICE",
          paymentReceived: true,
          status: "ISSUED",
          issuedAt: new Date("2026-10-01T00:00:00Z"),
          createdAt: new Date("2026-10-01T00:00:00Z")
        },
        30,
        now
      )
    ).toBe(false);
  });

  it("银行网银 CSV 流水解析支持 BOM、千分位与货币符号", () => {
    const csv = `\uFEFF交易日期,对方户名,入账金额,附言,流水号
2026/11/10,韬冠科技公司,"¥88,500.50",法律顾问费,REF-001
2026-11-11,张三,20000,刑事辩护费,REF-002`;
    const rows = parseBankStatementCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].payerName).toBe("韬冠科技公司");
    expect(rows[0].amount).toBe(88500.5);
    expect(rows[1].bankRef).toBe("REF-002");
  });
});
