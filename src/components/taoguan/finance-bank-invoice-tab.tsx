"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, FileSpreadsheet, Receipt, Upload } from "lucide-react";
import { amountToChineseUppercase } from "@/lib/taoguan/chinese-money";
import { INVOICE_CATEGORIES } from "@/lib/taoguan/dictionaries";
import {
  confirmBankAllocationByLawyer,
  createInvoicePortalRequest,
  importBankStatementCsvAction,
  pushBankAllocationToLawyer,
  updateInvoicePortalStatus
} from "@/server/taoguan/bank-invoice-actions";
import type { getFinanceAbcdDashboard } from "@/server/taoguan/finance-abcd-actions";

type DashboardData = Awaited<ReturnType<typeof getFinanceAbcdDashboard>>;

export function FinanceBankInvoiceTab({
  data,
  runAction
}: {
  data: DashboardData;
  runAction: (fn: () => Promise<void>, okMsg: string) => void;
}) {
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().slice(0, 7));
  const [csvText, setCsvText] = useState(
    "交易日期,对方户名,入账金额,附言,流水号\n2026-11-18,示范委托有限公司,50000,代理费首期,BNK-20261118-001"
  );

  // 尺子比对核销表单
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [caseNoLabel, setCaseNoLabel] = useState("(2026)韬冠民字第0001号");
  const [clientName, setClientName] = useState("");
  const [lawyerId, setLawyerId] = useState(data.users[0]?.id ?? "");
  const [matchMode, setMatchMode] = useState<"FULL" | "PARTIAL" | "SPLIT">("FULL");
  const [allocAmount, setAllocAmount] = useState("");
  const [splitNote, setSplitNote] = useState("");

  // A/B/C/D 开票门户表单
  const [invCaseNo, setInvCaseNo] = useState("");
  const [invCat, setInvCat] = useState<"A_CONFIRMED" | "B_WAIT_CONFIRM" | "C_PRE_INVOICE" | "D_OTHER">("A_CONFIRMED");
  const [invType, setInvType] = useState<"ELECTRONIC_NORMAL" | "SPECIAL_VAT">("ELECTRONIC_NORMAL");
  const [invAmount, setInvAmount] = useState("10000");
  const [invTitle, setInvTitle] = useState("");
  const [invTaxNo, setInvTaxNo] = useState("");
  const [invSpecialNote, setInvSpecialNote] = useState("");

  return (
    <div className="space-y-6">
      {/* 律师待确认入账清单 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">
          律师逐笔入账确认与拆单同屏关联（确认后自动记入 B1 个人创收并扣 B2 管理费入 A2）
        </h2>
        <div className="space-y-2 text-sm">
          {data.pendingAllocations.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">暂无银行流水核销推送记录。</div>
          ) : (
            data.pendingAllocations.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <div className="font-medium text-slate-900">
                    {a.caseNoLabel} · {a.clientName} ·{" "}
                    <span className="font-mono font-bold text-[#0D6E6E]">¥{Number(a.amount).toLocaleString()}</span>
                    <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">
                      {a.matchMode === "SPLIT" ? "一笔拆多案" : a.matchMode === "PARTIAL" ? "部分入账" : "单笔相符"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    原银行流水：{a.entry.payerName}（总额 ¥{Number(a.entry.amount).toLocaleString()}）· 管理费扣收 ¥
                    {Number(a.managementFeeAmount).toLocaleString()}
                    {a.splitNote ? ` · 拆单说明：${a.splitNote}` : ""}
                  </div>
                </div>
                <div>
                  {a.status === "CONFIRMED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 已确认入账（已记B1/B2）
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        runAction(async () => {
                          await confirmBankAllocationByLawyer(a.id, "核对无误，确认入账");
                        }, "入账已确认，个人 B1 创收与律所 A2 管理费已原子入账")
                      }
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      确认入账
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 审核端：上下联尺子式银行网银流水导入与核销推送 */}
      {data.isFinanceAdmin ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <FileSpreadsheet className="h-4 w-4 text-[#0D6E6E]" />
            审核端：银行网银流水 CSV 导入与上下联尺子式拆单核销
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <input className="w-36 rounded-lg border px-3 py-1.5 font-mono text-xs" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
                <button
                  type="button"
                  onClick={() =>
                    runAction(async () => {
                      await importBankStatementCsvAction({ yearMonth, fileName: `网银流水_${yearMonth}.csv`, csvText });
                    }, `已导入 ${yearMonth} 银行网银流水`)
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-[#0F2537] px-3 py-1.5 text-xs text-white"
                >
                  <Upload className="h-3.5 w-3.5" /> 解析并导入本月流水
                </button>
              </div>
              <textarea className="w-full rounded-lg border p-2.5 font-mono text-xs" rows={4} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
            </div>

            <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
              <div className="font-semibold text-slate-800">选中流水推送至律师入账确认（防重复推送 · 支持一笔拆多案）</div>
              <select className="w-full rounded border bg-white px-2.5 py-1.5" value={selectedEntryId} onChange={(e) => setSelectedEntryId(e.target.value)}>
                <option value="">选择银行进账流水行…</option>
                {data.bankBatches.flatMap((b) =>
                  b.entries
                    .filter((e) => e.status !== "MATCHED")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        [{b.yearMonth}] {e.payerName} · 总额¥{Number(e.amount)} (已拆¥{Number(e.allocatedAmount)}) · {e.memo}
                      </option>
                    ))
                )}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="对应收案号" value={caseNoLabel} onChange={(e) => setCaseNoLabel(e.target.value)} />
                <input className="rounded border bg-white px-2.5 py-1.5" placeholder="委托人名称" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                <select className="rounded border bg-white px-2.5 py-1.5" value={lawyerId} onChange={(e) => setLawyerId(e.target.value)}>
                  {data.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      主办律师：{u.name}
                    </option>
                  ))}
                </select>
                <select className="rounded border bg-white px-2.5 py-1.5" value={matchMode} onChange={(e) => setMatchMode(e.target.value as "FULL" | "PARTIAL" | "SPLIT")}>
                  <option value="FULL">单笔相符（全额提取）</option>
                  <option value="PARTIAL">部分入账</option>
                  <option value="SPLIT">拆分对应（一笔拆多案）</option>
                </select>
                {matchMode !== "FULL" ? (
                  <input type="number" step="0.01" className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="本案拆入金额(元)" value={allocAmount} onChange={(e) => setAllocAmount(e.target.value)} />
                ) : null}
                <input className="rounded border bg-white px-2.5 py-1.5" placeholder="拆单/比对说明" value={splitNote} onChange={(e) => setSplitNote(e.target.value)} />
              </div>
              <button
                type="button"
                disabled={!selectedEntryId}
                onClick={() =>
                  runAction(async () => {
                    await pushBankAllocationToLawyer({
                      entryId: selectedEntryId,
                      caseNoLabel,
                      clientName: clientName || "委托人",
                      lawyerId,
                      matchMode,
                      amount: Number(allocAmount || 0),
                      splitNote
                    });
                    setAllocAmount("");
                    setSplitNote("");
                  }, "已推送给主办律师等待入账确认")
                }
                className="rounded-lg bg-[#0D6E6E] px-3 py-1.5 font-medium text-white disabled:opacity-50"
              >
                提取并推送给律师确认
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* A/B/C/D 开票管理、微信免登录填报、未传发票冻结余额与 30 天红警 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Receipt className="h-4 w-4 text-[#0D6E6E]" />
            A/B/C/D 开票管理、客户免登录填报与发票冻结风控
          </div>
          {data.overdueInvoices.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-3.5 w-3.5" /> C 类预开票超 30 天未收款红警：{data.overdueInvoices.length} 笔
            </span>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAction(async () => {
              await createInvoicePortalRequest({
                caseNoLabel: invCaseNo,
                invoiceCategory: invCat,
                invoiceType: invType,
                amount: Number(invAmount),
                clientTitle: invTitle,
                taxNo: invTaxNo,
                specialNote: invSpecialNote
              });
              setInvTitle("");
              setInvSpecialNote("");
            }, "开票申请已生成，并创建客户微信免登录自助核对链接");
          }}
          className="mb-4 grid gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs sm:grid-cols-4"
        >
          <input className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="收案号 *" value={invCaseNo} onChange={(e) => setInvCaseNo(e.target.value)} required />
          <input className="rounded border bg-white px-2.5 py-1.5" placeholder="客户开票抬头 *" value={invTitle} onChange={(e) => setInvTitle(e.target.value)} required />
          <input className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="税号/身份证号" value={invTaxNo} onChange={(e) => setInvTaxNo(e.target.value)} />
          <input type="number" step="0.01" className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="金额(元) *" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} required />
          <select className="rounded border bg-white px-2.5 py-1.5" value={invCat} onChange={(e) => setInvCat(e.target.value as "A_CONFIRMED" | "B_WAIT_CONFIRM" | "C_PRE_INVOICE" | "D_OTHER")}>
            {Object.entries(INVOICE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="rounded border bg-white px-2.5 py-1.5" value={invType} onChange={(e) => setInvType(e.target.value as "ELECTRONIC_NORMAL" | "SPECIAL_VAT")}>
            <option value="ELECTRONIC_NORMAL">1. 电子普通发票</option>
            <option value="SPECIAL_VAT">2. 增值税专用发票</option>
          </select>
          <input className="rounded border bg-white px-2.5 py-1.5" placeholder="C/D类必填特别说明" value={invSpecialNote} onChange={(e) => setInvSpecialNote(e.target.value)} />
          <button className="rounded-lg bg-[#0F2537] px-3 py-1.5 font-medium text-white">提交开票 ({amountToChineseUppercase(Number(invAmount))})</button>
        </form>

        <div className="space-y-2 text-xs">
          {data.invoices.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <div className="font-semibold text-slate-900">
                  {inv.clientTitle} · <span className="font-mono">¥{Number(inv.amount).toLocaleString()}</span> · {INVOICE_CATEGORIES[inv.invoiceCategory] ?? inv.invoiceCategory}
                </div>
                <div className="mt-0.5 text-slate-500">
                  案号：{inv.caseNoLabel || "—"} · 状态：{inv.status}
                  {inv.status === "ISSUED" && !inv.scanUploaded ? (
                    <span className="ml-2 font-semibold text-red-600">⚠ 未上传发票扫描件（已冻结 B 表可支配余额）</span>
                  ) : null}
                  {inv.scanUploaded ? <span className="ml-2 text-emerald-700">✓ 已上传扫描件（余额已解冻）</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/public/invoice/${inv.token}`} target="_blank" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[#0D6E6E] hover:bg-slate-50">
                  客户填报H5 <ExternalLink className="h-3 w-3" />
                </Link>
                {data.isFinanceAdmin && (inv.status === "PENDING" || inv.status === "CLIENT_FILLED") ? (
                  <button type="button" onClick={() => runAction(async () => { await updateInvoicePortalStatus({ id: inv.id, action: "ISSUE" }); }, "已标记开具发票（上传扫描件前自动冻结对应余额）")} className="rounded bg-amber-600 px-2 py-1 text-white">
                    标记已开票
                  </button>
                ) : null}
                {inv.status === "ISSUED" && !inv.scanUploaded ? (
                  <button type="button" onClick={() => runAction(async () => { await updateInvoicePortalStatus({ id: inv.id, action: "UPLOAD_SCAN", scanFileName: `电子发票_${inv.caseNoLabel}.pdf` }); }, "已登记发票扫描件，B 表冻结余额已秒级解冻")} className="rounded bg-emerald-600 px-2 py-1 text-white">
                    上传发票解冻余额
                  </button>
                ) : null}
                {inv.invoiceCategory === "C_PRE_INVOICE" && !inv.paymentReceived ? (
                  <button type="button" onClick={() => runAction(async () => { await updateInvoicePortalStatus({ id: inv.id, action: "MARK_PAID" }); }, "已确认到账，解除 C 类未付款红警")} className="rounded border border-emerald-300 px-2 py-1 text-emerald-700">
                    标记已回款
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
