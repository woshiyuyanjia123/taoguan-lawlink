"use client";

import { useEffect, useState, useTransition } from "react";
import { UserCheck, BookCheck, ClipboardList, Lock, Unlock, FileCheck2 } from "lucide-react";
import { ADMIN_REQUEST_TYPES, EMPLOYMENT_TYPES } from "@/lib/taoguan/dictionaries";
import {
  acknowledgePolicyDocument,
  getHrAdminDashboard,
  publishPolicyDocument,
  reviewAdminWorkflowRequest,
  reviewHrLifecycleRecord,
  submitAdminWorkflowRequest,
  submitHrLifecycleRecord,
  toggleUserOffboardGate
} from "@/server/taoguan/hr-admin-actions";

type HrPayload = Awaited<ReturnType<typeof getHrAdminDashboard>>;

export default function HrAdminPage() {
  const [data, setData] = useState<HrPayload | null>(null);
  const [tab, setTab] = useState<"HR" | "POLICY" | "ADMIN">("HR");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const [recordType, setRecordType] = useState<"ONBOARDING" | "PROFILE_CHANGE" | "OFFBOARDING">("ONBOARDING");
  const [officeId, setOfficeId] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME_LAWYER");
  const [hrSummary, setHrSummary] = useState("");

  const [policyTitle, setPolicyTitle] = useState("");
  const [policyVersion, setPolicyVersion] = useState("v1.0");
  const [policyContent, setPolicyContent] = useState("");

  const [adminType, setAdminType] = useState<"PROCUREMENT" | "EXTERNAL_CONTRACT" | "EXTERNAL_PAYMENT" | "RECRUITMENT" | "GENERAL">("PROCUREMENT");
  const [adminTitle, setAdminTitle] = useState("");
  const [adminAmount, setAdminAmount] = useState("");
  const [adminCounterparty, setAdminCounterparty] = useState("");
  const [adminDesc, setAdminDesc] = useState("");

  async function reload() {
    const res = await getHrAdminDashboard();
    setData(res);
  }

  useEffect(() => {
    reload().catch((e) => setErr(e instanceof Error ? e.message : "加载失败"));
  }, []);

  function runAction(fn: () => Promise<void>, successText: string) {
    setErr("");
    setMsg("");
    startTransition(async () => {
      try {
        await fn();
        setMsg(successText);
        await reload();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "操作失败");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">人事入离职档案、规章水印签收与一般行政</h1>
        <p className="mt-1 text-sm text-slate-500">
          依据《9.10版需求说明书》：支持入职分所建档、线下谈妥后审批岗解锁线上离职并生成编号人事电子档案、规章制度多版本并列水印确认、采购/外签/付款/招聘行政审批。
        </p>
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div> : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[
          { key: "HR" as const, label: "人事入离职与人员名册", icon: UserCheck },
          { key: "POLICY" as const, label: "规章制度与水印确认", icon: BookCheck },
          { key: "ADMIN" as const, label: "一般行政事务审批", icon: ClipboardList }
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

      {tab === "HR" ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">发起人事申请（入职分所 / 信息变更 / 离职电子归档）</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await submitHrLifecycleRecord({ recordType, officeId: officeId || null, employmentType, summary: hrSummary });
                  setHrSummary("");
                }, "人事申请已提交至审核端");
              }}
              className="grid gap-3 text-sm sm:grid-cols-3"
            >
              <div>
                <label className="mb-1 block text-xs text-slate-500">申请类型</label>
                <select className="w-full rounded-lg border px-3 py-2" value={recordType} onChange={(e) => setRecordType(e.target.value as "ONBOARDING" | "PROFILE_CHANGE" | "OFFBOARDING")}>
                  <option value="ONBOARDING">入职建档 / 分所归属申请</option>
                  <option value="PROFILE_CHANGE">在职岗位或个人信息变更</option>
                  <option value="OFFBOARDING">离职申请（须审批岗先解锁）</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">目标归属办公室</label>
                <select className="w-full rounded-lg border px-3 py-2" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                  <option value="">保持当前办公室</option>
                  {(data?.offices ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">执业人员类型</label>
                <select className="w-full rounded-lg border px-3 py-2" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                  {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs text-slate-500">申请说明与交接情况 *</label>
                <textarea className="w-full rounded-lg border px-3 py-2" rows={2} value={hrSummary} onChange={(e) => setHrSummary(e.target.value)} required />
              </div>
              <div className="sm:col-span-3">
                <button disabled={isPending} className="rounded-lg bg-[#0F2537] px-4 py-2 text-white hover:bg-[#173A54]">
                  提交人事流程
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">在职 / 离职人员名册与离职闸门控制</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2">姓名</th>
                    <th className="px-3 py-2">归属办公室</th>
                    <th className="px-3 py-2">执业类别</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">线上离职通道</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.users ?? []).map((u) => (
                    <tr key={u.id}>
                      <td className="px-3 py-2 font-medium">{u.name}</td>
                      <td className="px-3 py-2">{u.office?.name ?? "韬冠总所"}</td>
                      <td className="px-3 py-2">{EMPLOYMENT_TYPES[u.employmentType] ?? u.employmentType}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${u.employmentStatus === "OFFBOARDED" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>
                          {u.employmentStatus === "OFFBOARDED" ? "已离职（档案保留）" : "在职"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {data?.isAdmin ? (
                          <button
                            type="button"
                            onClick={() =>
                              runAction(
                                async () => { await toggleUserOffboardGate(u.id, !u.offboardAllowed); },
                                u.offboardAllowed ? "已关闭该人员离职申请通道" : "已开放该人员线上离职申请通道"
                              )
                            }
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            {u.offboardAllowed ? <Unlock className="h-3.5 w-3.5 text-amber-600" /> : <Lock className="h-3.5 w-3.5 text-slate-400" />}
                            {u.offboardAllowed ? "已开放（点击关闭）" : "未开放（点击解锁）"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">{u.offboardAllowed ? "已开放" : "锁定"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">人事审批与离职电子归档台账（{data?.hrRecords.length ?? 0}）</h2>
            <div className="space-y-2 text-sm">
              {(data?.hrRecords ?? []).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {r.user.name} · [{r.recordType}] · {r.office?.name ?? "总所"}
                      {r.archiveNo ? <span className="ml-2 font-mono text-xs text-[#0D6E6E]">档案号: {r.archiveNo}</span> : null}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{r.summary}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span>
                    {data?.isAdmin && r.status === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => runAction(async () => { await reviewHrLifecycleRecord({ recordId: r.id, decision: "APPROVED" }); }, "已批准并完成人事建档/离职电子归档")}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-xs text-white"
                        >
                          批准归档
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(async () => { await reviewHrLifecycleRecord({ recordId: r.id, decision: "REJECTED" }); }, "已退回人事申请")}
                          className="rounded bg-red-600 px-2.5 py-1 text-xs text-white"
                        >
                          退回
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "POLICY" ? (
        <div className="space-y-6">
          {data?.isAdmin ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-slate-900">发布新版本规章制度（历史确认版本自动并列留存）</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await publishPolicyDocument({ title: policyTitle, version: policyVersion, content: policyContent });
                    setPolicyTitle("");
                    setPolicyContent("");
                  }, "新规章制度已发布并推送全员签收确认");
                }}
                className="grid gap-3 text-sm sm:grid-cols-4"
              >
                <div className="sm:col-span-3">
                  <input className="w-full rounded-lg border px-3 py-2" placeholder="制度名称，如《韬冠律所利益冲突与风控管理办法》" value={policyTitle} onChange={(e) => setPolicyTitle(e.target.value)} required />
                </div>
                <div>
                  <input className="w-full rounded-lg border px-3 py-2 font-mono" placeholder="版本号 v1.0" value={policyVersion} onChange={(e) => setPolicyVersion(e.target.value)} required />
                </div>
                <div className="sm:col-span-4">
                  <textarea className="w-full rounded-lg border px-3 py-2" rows={3} placeholder="制度正文内容…" value={policyContent} onChange={(e) => setPolicyContent(e.target.value)} required />
                </div>
                <div className="sm:col-span-4">
                  <button disabled={isPending} className="rounded-lg bg-[#0F2537] px-4 py-2 text-white">发布规章制度</button>
                </div>
              </form>
            </section>
          ) : null}

          <div className="space-y-4">
            {(data?.policies ?? []).map((p) => {
              const myAck = p.acknowledgements.find((a) => a.userId === data?.currentUser?.id);
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {p.title} <span className="ml-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs">{p.version}</span>
                      </h3>
                      <div className="text-xs text-slate-500">
                        发布人：{p.publishedBy} · 已确认人数：{p.acknowledgements.length}
                      </div>
                    </div>
                    {myAck ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs text-emerald-800">
                        <FileCheck2 className="h-3.5 w-3.5" />
                        已阅遵守 · 水印码 {myAck.watermarkCode}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => runAction(async () => { await acknowledgePolicyDocument(p.id); }, "已签署确认并生成防伪水印留痕")}
                        className="rounded-lg bg-[#0D6E6E] px-3.5 py-1.5 text-xs font-medium text-white"
                      >
                        我已阅读并承诺遵守（生成水印回执）
                      </button>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{p.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === "ADMIN" ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">发起一般行政事务申请（采购 / 外签合约 / 对外付款 / 招聘）</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await submitAdminWorkflowRequest({
                    requestType: adminType,
                    title: adminTitle,
                    amount: adminAmount ? Number(adminAmount) : null,
                    counterparty: adminCounterparty,
                    description: adminDesc
                  });
                  setAdminTitle("");
                  setAdminAmount("");
                  setAdminCounterparty("");
                  setAdminDesc("");
                }, "一般行政申请已提交");
              }}
              className="grid gap-3 text-sm sm:grid-cols-3"
            >
              <div>
                <select className="w-full rounded-lg border px-3 py-2" value={adminType} onChange={(e) => setAdminType(e.target.value as "PROCUREMENT" | "EXTERNAL_CONTRACT" | "EXTERNAL_PAYMENT" | "RECRUITMENT" | "GENERAL")}>
                  {Object.entries(ADMIN_REQUEST_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input className="w-full rounded-lg border px-3 py-2" placeholder="申请事项标题 *" value={adminTitle} onChange={(e) => setAdminTitle(e.target.value)} required />
              </div>
              <div>
                <input type="number" step="0.01" className="w-full rounded-lg border px-3 py-2" placeholder="涉及金额（元，选填）" value={adminAmount} onChange={(e) => setAdminAmount(e.target.value)} />
              </div>
              <div>
                <input className="w-full rounded-lg border px-3 py-2" placeholder="对方单位/供应商（选填）" value={adminCounterparty} onChange={(e) => setAdminCounterparty(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <input className="w-full rounded-lg border px-3 py-2" placeholder="详细事由与预算说明 *" value={adminDesc} onChange={(e) => setAdminDesc(e.target.value)} required />
              </div>
              <div className="sm:col-span-3">
                <button disabled={isPending} className="rounded-lg bg-[#0F2537] px-4 py-2 text-white">提交行政审批</button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">行政审批记录（{data?.adminRequests.length ?? 0}）</h2>
            <div className="space-y-2 text-sm">
              {(data?.adminRequests ?? []).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      [{ADMIN_REQUEST_TYPES[r.requestType] ?? r.requestType}] {r.title}
                      {r.amount ? <span className="ml-2 font-mono text-[#0D6E6E]">¥{Number(r.amount).toLocaleString()}</span> : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      申请人：{r.applicant.name} · {r.office?.name ?? "总所"} · {r.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span>
                    {data?.isAdmin && (r.status === "PENDING" || r.status === "COMMITTEE_REVIEW") ? (
                      <>
                        {r.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => runAction(async () => { await reviewAdminWorkflowRequest({ requestId: r.id, decision: "COMMITTEE_REVIEW" }); }, "已上报管理委员会终审")}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            报管委会
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => runAction(async () => { await reviewAdminWorkflowRequest({ requestId: r.id, decision: "APPROVED" }); }, "行政申请已批准")}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-xs text-white"
                        >
                          批准
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(async () => { await reviewAdminWorkflowRequest({ requestId: r.id, decision: "REJECTED" }); }, "行政申请已驳回")}
                          className="rounded bg-red-600 px-2.5 py-1 text-xs text-white"
                        >
                          驳回
                        </button>
                      </>
                    ) : null}
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
