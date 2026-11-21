"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeftRight, Download, Landmark, Lock, CheckCircle2, Wallet } from "lucide-react";
import { FinanceBankInvoiceTab } from "@/components/taoguan/finance-bank-invoice-tab";
import { PERSONAL_FINANCE_REQUEST_TYPES } from "@/lib/taoguan/dictionaries";
import {
  confirmPeerTransfer,
  createBatchD,
  createOrUpdateBatchC,
  createPeerTransfer,
  getFinanceAbcdDashboard,
  submitPersonalFinanceRequest,
  transitionBatchC,
  transitionBatchD
} from "@/server/taoguan/finance-abcd-actions";

type DashboardData = Awaited<ReturnType<typeof getFinanceAbcdDashboard>>;

function fmt(n: number) {
  return `¥${Number(n || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FinanceAbcdPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [officeFilter, setOfficeFilter] = useState("");
  const [tab, setTab] = useState<"AB" | "CD" | "TRANSFER" | "BANK_INV">("AB");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // 自由互转表单
  const [toUserId, setToUserId] = useState("");
  const [transferAmt, setTransferAmt] = useState("");
  const [transferMemo, setTransferMemo] = useState("");

  // 我的财务 6 类申请
  const [reqType, setReqType] = useState("C1_SALARY");
  const [reqAmt, setReqAmt] = useState("");
  const [reqReason, setReqReason] = useState("");

  // C 月表快速创建
  const [cYearMonth, setCYearMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cUserId, setCUserId] = useState("");
  const [cSalary, setCSalary] = useState("10000");
  const [cSocial, setCSocial] = useState("1500");
  const [cHousing, setCHousing] = useState("1200");
  const [cTax, setCTax] = useState("600");

  // D 单表快速创建
  const [dTitle, setDTitle] = useState("单次财务操作单");
  const [dItemType, setDItemType] = useState("D1_FIRM_PAY");
  const [dTargetUserId, setDTargetUserId] = useState("");
  const [dAmount, setDAmount] = useState("2000");
  const [dReason, setDReason] = useState("");

  async function reload(oid = officeFilter) {
    const res = await getFinanceAbcdDashboard(oid || undefined);
    setData(res);
    if (!cUserId && res.users[0]) setCUserId(res.users[0].id);
  }

  useEffect(() => {
    reload(officeFilter).catch((e) => setErr(e instanceof Error ? e.message : "加载失败"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeFilter]);

  function runAction(fn: () => Promise<void>, okMsg: string) {
    setErr("");
    setMsg("");
    startTransition(async () => {
      try {
        await fn();
        setMsg(okMsg);
        await reload(officeFilter);
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "操作失败");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">内部流水账财务 ABCD 四表与个人虚拟账套</h1>
          <p className="mt-1 text-sm text-slate-500">
            严格执行《9.10版需求说明书》精确勾稽：A 首席观察表、B 个人虚拟账户（含未传发票冻结额）、C/D 预备保存解锁下载计次落账、自由互转自动扣 3% 入 A3、上下联尺子式银行拆单。
          </p>
        </div>
        <select className="rounded-lg border bg-white px-3 py-2 text-sm" value={officeFilter} onChange={(e) => setOfficeFilter(e.target.value)}>
          <option value="">全所汇总口径</option>
          {(data?.offices ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.code})
            </option>
          ))}
        </select>
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div> : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[
          { key: "AB" as const, label: "A 律所总账 & B 个人观察表", icon: Landmark },
          { key: "BANK_INV" as const, label: "银行流水尺子对账 & A/B/C/D 开票", icon: Wallet },
          { key: "CD" as const, label: "C 月度发放表 & D 单次操作表", icon: Download },
          { key: "TRANSFER" as const, label: "自由互转(3%) & 我的财务申请", icon: ArrowLeftRight }
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium ${
                tab === t.key ? "bg-[#0F2537] text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {data && tab === "AB" ? (
        <div className="space-y-6">
          {/* A 首席观察表 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">A 首席观察表（律所账号 · 只读精确勾稽）</h2>
              <div className="text-xs text-slate-500">
                预备保存待落账预览：律所留存 {fmt(data.tableA.pendingFirmDelta)} · 银行托管 {fmt(data.tableA.pendingCustodyDelta)}
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-4 lg:grid-cols-5">
              {[
                ["A1 总创收 (ΣB1)", data.tableA.a1TotalRevenue],
                ["A2 收管理费 (ΣB2)", data.tableA.a2MgmtFeeIncome],
                ["A3 收附加管理费 (ΣB5)", data.tableA.a3ExtraMgmtFeeIncome],
                ["A4 实发工资 (ΣB6)", data.tableA.a4PaidSalary],
                ["A5 扣社保 (ΣB7)", data.tableA.a5SocialSecurity],
                ["A6 扣公积金 (ΣB8)", data.tableA.a6HousingFund],
                ["A7 预收个税 (ΣB9)", data.tableA.a7PrepaidTax],
                ["A8 个税结差 (D3)", data.tableA.a8TaxRefund],
                ["A9 管理费结差 (D4)", data.tableA.a9MgmtRefund],
                ["A10 个人报销 (ΣB12)", data.tableA.a10PersonalReimbursement],
                ["A11 个人对外付款 (ΣB13)", data.tableA.a11PersonalOutPay],
                ["A12 律所对外付款 (D1)", data.tableA.a12FirmOutPay],
                ["A13 扣增值税 (D2)", data.tableA.a13VatDeduction],
                ["A14 律所自有留存净余额", data.tableA.a14FirmNetBalance],
                ["A14 银行托管总余额", data.tableA.a14BankCustodyBalance]
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 font-mono text-base font-bold text-slate-900">{fmt(Number(val))}</div>
                </div>
              ))}
            </div>
          </section>

          {/* B 个人观察表 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">B 个人虚拟账户观察表（含未传发票冻结额与实际可支配余额）</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2.5 py-2">人员 / 办公室</th>
                    <th className="px-2 py-2">B1 创收</th>
                    <th className="px-2 py-2">B2 管理费</th>
                    <th className="px-2 py-2">B3/B4 互转</th>
                    <th className="px-2 py-2">B5 附加3%</th>
                    <th className="px-2 py-2">B6-B9 薪税险</th>
                    <th className="px-2 py-2">B10-11 结差</th>
                    <th className="px-2 py-2">B12-13 报销外付</th>
                    <th className="px-2 py-2">B14 账面余额</th>
                    <th className="px-2 py-2">未传发票冻结</th>
                    <th className="px-2 py-2">实际可支配</th>
                    <th className="px-2 py-2">预备变化后</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {data.tableBList.map((b) => (
                    <tr key={b.userId}>
                      <td className="px-2.5 py-2 font-sans">
                        <div className="font-semibold text-slate-900">{b.userName}</div>
                        <div className="text-[11px] text-slate-500">{b.officeName}</div>
                      </td>
                      <td className="px-2 py-2 text-emerald-700">{fmt(b.b1Revenue)}</td>
                      <td className="px-2 py-2 text-slate-600">{fmt(b.b2MgmtFee)}</td>
                      <td className="px-2 py-2">-{fmt(b.b3TransferOut)} / +{fmt(b.b4TransferIn)}</td>
                      <td className="px-2 py-2 text-amber-700">{fmt(b.b5ExtraMgmtFee)}</td>
                      <td className="px-2 py-2">{fmt(b.b6Salary + b.b7SocialSecurity + b.b8HousingFund + b.b9PersonalTax)}</td>
                      <td className="px-2 py-2 text-emerald-700">+{fmt(b.b10TaxRefund + b.b11MgmtRefund)}</td>
                      <td className="px-2 py-2">{fmt(b.b12Reimbursement + b.b13PersonalOutPay)}</td>
                      <td className="px-2 py-2 font-bold text-slate-900">{fmt(b.b14Balance)}</td>
                      <td className="px-2 py-2 font-semibold text-red-600">{fmt(b.frozenInvoiceAmount)}</td>
                      <td className="px-2 py-2 font-bold text-[#0D6E6E]">{fmt(b.disposableBalance)}</td>
                      <td className="px-2 py-2 text-sky-700">{fmt(b.projectedBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {data && tab === "BANK_INV" ? <FinanceBankInvoiceTab data={data} runAction={runAction} /> : null}

      {data && tab === "CD" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* C 财务操作月表 */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">C 财务操作月表（预备保存 → 解锁下载第N次 → 已办理原子落账）</h2>
            {data.isFinanceAdmin ? (
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                <input className="rounded border bg-white px-2.5 py-1.5 font-mono" value={cYearMonth} onChange={(e) => setCYearMonth(e.target.value)} />
                <select className="rounded border bg-white px-2.5 py-1.5" value={cUserId} onChange={(e) => setCUserId(e.target.value)}>
                  {data.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <input type="number" className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="C1 实发工资" value={cSalary} onChange={(e) => setCSalary(e.target.value)} />
                <input type="number" className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="C2-7 社保合计" value={cSocial} onChange={(e) => setCSocial(e.target.value)} />
                <input type="number" className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="C8 公积金" value={cHousing} onChange={(e) => setCHousing(e.target.value)} />
                <input type="number" className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="C11 预扣个税" value={cTax} onChange={(e) => setCTax(e.target.value)} />
                <button
                  type="button"
                  disabled={isPending || !cUserId}
                  onClick={() => {
                    const u = data.users.find((x) => x.id === cUserId);
                    runAction(async () => {
                      await createOrUpdateBatchC({
                        officeId: officeFilter || null,
                        yearMonth: cYearMonth,
                        rows: [
                          {
                            userId: cUserId,
                            userName: u?.name || "律师",
                            c1Salary: Number(cSalary || 0),
                            c2Pension: Number(cSocial || 0),
                            c3Medical: 0,
                            c4Unemployment: 0,
                            c5Critical: 0,
                            c6Maternity: 0,
                            c7Injury: 0,
                            c8HousingFund: Number(cHousing || 0),
                            c9Reimbursement: 0,
                            c10PersonalOutPay: 0,
                            c11PersonalTax: Number(cTax || 0)
                          }
                        ]
                      });
                    }, "C 月度操作表草稿已创建");
                  }}
                  className="col-span-2 rounded-lg bg-[#0F2537] py-1.5 font-medium text-white"
                >
                  新建 C 月表批次
                </button>
              </div>
            ) : null}

            <div className="space-y-2 text-xs">
              {data.batchesC.map((b) => (
                <div key={b.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {b.yearMonth} C月表（{b.rows.length}人） · 状态：{b.status}
                    </span>
                    <span className="font-mono text-slate-500">已下载：第 {b.downloadCount} 次</span>
                  </div>
                  {data.isFinanceAdmin ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {b.status === "DRAFT" ? (
                        <button type="button" onClick={() => runAction(async () => { await transitionBatchC(b.id, "PREPARE"); }, "C表已预备保存：A/B表实时展示预备变化值，下载键已解锁")} className="rounded bg-amber-600 px-2.5 py-1 text-white">
                          1. 预备保存（解锁下载）
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={b.status === "DRAFT"}
                        onClick={() => runAction(async () => { const r = await transitionBatchC(b.id, "RECORD_DOWNLOAD"); setMsg(`已记录第 ${r.downloadCount} 次下载留痕`); }, "已记录下载计数")}
                        className="inline-flex items-center gap-1 rounded border px-2.5 py-1 disabled:opacity-40"
                      >
                        {b.status === "DRAFT" ? <Lock className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                        2. 下载网银发放单（第{b.downloadCount + 1}次）
                      </button>
                      {b.status === "PREPARED" ? (
                        <button type="button" onClick={() => runAction(async () => { await transitionBatchC(b.id, "COMPLETE"); }, "C表已办理：资金已原子落账至A/B观察表")} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-white">
                          <CheckCircle2 className="h-3 w-3" /> 3. 确认已办理落账
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* D 财务操作单表 */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">D 财务操作单表（D1对外付 / D2增值税 / D3个税结差 / D4管理费结差）</h2>
            {data.isFinanceAdmin ? (
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                <input className="rounded border bg-white px-2.5 py-1.5" value={dTitle} onChange={(e) => setDTitle(e.target.value)} />
                <select className="rounded border bg-white px-2.5 py-1.5" value={dItemType} onChange={(e) => setDItemType(e.target.value)}>
                  <option value="D1_FIRM_PAY">D1 律所对外付款 (入A12)</option>
                  <option value="D2_VAT">D2 扣增值税 (入A13)</option>
                  <option value="D3_TAX_REFUND">D3 个税结差退还 (A8→B10)</option>
                  <option value="D4_MGMT_REFUND">D4 管理费结差退还 (A9→B11)</option>
                </select>
                {(dItemType === "D3_TAX_REFUND" || dItemType === "D4_MGMT_REFUND") ? (
                  <select className="rounded border bg-white px-2.5 py-1.5" value={dTargetUserId} onChange={(e) => setDTargetUserId(e.target.value)}>
                    <option value="">选择退还目标律师…</option>
                    {data.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input type="number" step="0.01" className="rounded border bg-white px-2.5 py-1.5 font-mono" placeholder="金额(元)" value={dAmount} onChange={(e) => setDAmount(e.target.value)} />
                <input className="col-span-2 rounded border bg-white px-2.5 py-1.5" placeholder="事由说明" value={dReason} onChange={(e) => setDReason(e.target.value)} />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const tu = data.users.find((x) => x.id === dTargetUserId);
                    runAction(async () => {
                      await createBatchD({
                        officeId: officeFilter || null,
                        title: dTitle,
                        rows: [{ itemType: dItemType, targetUserId: dTargetUserId || null, targetName: tu?.name, amount: Number(dAmount || 0), reason: dReason }]
                      });
                      setDReason("");
                    }, "D 单次操作表草稿已创建");
                  }}
                  className="col-span-2 rounded-lg bg-[#0F2537] py-1.5 font-medium text-white"
                >
                  新建 D 单次操作表
                </button>
              </div>
            ) : null}

            <div className="space-y-2 text-xs">
              {data.batchesD.map((b) => (
                <div key={b.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {b.title} · 状态：{b.status}
                    </span>
                    <span className="font-mono text-slate-500">已下载：第 {b.downloadCount} 次</span>
                  </div>
                  {data.isFinanceAdmin ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {b.status === "DRAFT" ? (
                        <button type="button" onClick={() => runAction(async () => { await transitionBatchD(b.id, "PREPARE"); }, "D表已预备保存，下载已解锁")} className="rounded bg-amber-600 px-2.5 py-1 text-white">
                          1. 预备保存
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={b.status === "DRAFT"}
                        onClick={() => runAction(async () => { await transitionBatchD(b.id, "RECORD_DOWNLOAD"); }, "已记录 D 表下载计数")}
                        className="rounded border px-2.5 py-1 disabled:opacity-40"
                      >
                        2. 下载操作单
                      </button>
                      {b.status === "PREPARED" ? (
                        <button type="button" onClick={() => runAction(async () => { await transitionBatchD(b.id, "COMPLETE"); }, "D表已办理并落账至A/B表")} className="rounded bg-emerald-600 px-2.5 py-1 text-white">
                          3. 确认已办理
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {data && tab === "TRANSFER" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 自由互转 */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">律师个人账号自由互转（无需审核 · 收款确认自动扣 3% 入 A3）</h2>
            <div className="grid gap-2.5 text-sm">
              <select className="rounded-lg border px-3 py-2" value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
                <option value="">选择收款同事账号…</option>
                {data.users
                  .filter((u) => u.id !== data.currentUserId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.office?.name ?? "总所"})
                    </option>
                  ))}
              </select>
              <input type="number" step="0.01" className="rounded-lg border px-3 py-2 font-mono" placeholder="划拨金额(元)" value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} />
              <input className="rounded-lg border px-3 py-2" placeholder="划拨附言（如：协办分账）" value={transferMemo} onChange={(e) => setTransferMemo(e.target.value)} />
              <button
                type="button"
                disabled={!toUserId || !transferAmt || isPending}
                onClick={() =>
                  runAction(async () => {
                    await createPeerTransfer({ toUserId, amount: Number(transferAmt), memo: transferMemo });
                    setTransferAmt("");
                    setTransferMemo("");
                  }, "互转申请已发送，待收款同事点击确认即自动生效")
                }
                className="rounded-lg bg-[#0D6E6E] py-2 font-medium text-white disabled:opacity-50"
              >
                发起自由划拨
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {data.peerTransfers.map((tr) => (
                <div key={tr.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5">
                  <div>
                    <div className="font-medium">
                      {tr.fromUser.name} → {tr.toUser.name} · <span className="font-mono font-bold">{fmt(Number(tr.amount))}</span>
                    </div>
                    <div className="text-slate-500">
                      附加管理费(3%)：{fmt(Number(tr.surchargeAmount))} · 实得：{fmt(Number(tr.netAmount))} · 状态：{tr.status}
                    </div>
                  </div>
                  {tr.status === "PENDING_RECEIVER" && (tr.toUserId === data.currentUserId || data.isFinanceAdmin) ? (
                    <button type="button" onClick={() => runAction(async () => { await confirmPeerTransfer(tr.id, "确认收到划拨"); }, "已确认收款，B3/B4/B5 与 A3 已同步落账")} className="rounded bg-emerald-600 px-2.5 py-1 text-white">
                      确认收款生效
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* 我的财务 6 类资金申请 */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">我的财务：6 类资金申请与定期对账确认</h2>
            <div className="grid gap-2.5 text-sm">
              <select className="rounded-lg border px-3 py-2" value={reqType} onChange={(e) => setReqType(e.target.value)}>
                {Object.entries(PERSONAL_FINANCE_REQUEST_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input type="number" step="0.01" className="rounded-lg border px-3 py-2 font-mono" placeholder="申请金额(元)" value={reqAmt} onChange={(e) => setReqAmt(e.target.value)} />
              <input className="rounded-lg border px-3 py-2" placeholder="申请理由 / 报销明细 / 对账说明" value={reqReason} onChange={(e) => setReqReason(e.target.value)} />
              <button
                type="button"
                disabled={!reqAmt || !reqReason || isPending}
                onClick={() =>
                  runAction(async () => {
                    await submitPersonalFinanceRequest({ requestType: reqType, amount: Number(reqAmt), reason: reqReason });
                    setReqAmt("");
                    setReqReason("");
                  }, "资金申请已提交，审核通过后将自动汇入 C/D 财务操作表")
                }
                className="rounded-lg bg-[#0F2537] py-2 font-medium text-white disabled:opacity-50"
              >
                提交资金申请
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {data.personalRequests.map((rq) => (
                <div key={rq.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <div className="font-medium">
                      {rq.applicant.name} · {PERSONAL_FINANCE_REQUEST_TYPES[rq.requestType] ?? rq.requestType}
                    </div>
                    <div className="text-slate-500">{rq.reason}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold">{fmt(Number(rq.amount))}</div>
                    <div className="text-[11px] text-slate-500">{rq.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
