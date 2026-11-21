"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, ShieldAlert, Lock, CheckCircle2, MessageSquare, FileCheck } from "lucide-react";
import { CriminalIntakeForm } from "@/components/taoguan/criminal-intake-form";
import { CRIMINAL_WORKFLOW_LABELS } from "@/lib/taoguan/dictionaries";
import {
  advanceConflictResolution,
  advanceCriminalSigningStep,
  handleProxyLeadAction,
  listCriminalIntakesAndPools,
  postConflictMeetingMessage,
  quickGlobalConflictSearch,
  submitCriminalConflictLock
} from "@/server/taoguan/criminal-intake";

type Payload = Awaited<ReturnType<typeof listCriminalIntakesAndPools>>;
type QuickSearchRes = Awaited<ReturnType<typeof quickGlobalConflictSearch>>;

export default function CriminalIntakePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const [kw, setKw] = useState("");
  const [searchRes, setSearchRes] = useState<QuickSearchRes | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  async function reload() {
    const res = await listCriminalIntakesAndPools();
    setData(res);
  }

  useEffect(() => {
    reload().catch((e) => setErr(e instanceof Error ? e.message : "加载失败"));
  }, []);

  function run(fn: () => Promise<void>, okText: string) {
    setErr("");
    setMsg("");
    startTransition(async () => {
      try {
        await fn();
        setMsg(okText);
        await reload();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "操作失败");
      }
    });
  }

  function onQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    startTransition(async () => {
      try {
        const res = await quickGlobalConflictSearch(kw);
        setSearchRes(res);
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "检索失败");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">刑事辩护专项收案、全域无空格利冲与双路径签章</h1>
        <p className="mt-1 text-sm text-slate-500">
          严格对齐《9.10版需求说明书》12 步收案闭环：便捷无空格全域检索 → 7 选 1 刑事填报 → 提利冲永久锁表 → 真假利冲管委会非对称终审 → 双路径用印与实体原件核验赋正式案号。
        </p>
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div> : null}

      {/* 便捷性利益冲突全域搜索窗口（禁止空格输入） */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
          <Search className="h-4 w-4 text-[#0D6E6E]" />
          全域便捷利益冲突检索窗口（严禁空格输入 · 跨分所全库检索）
        </div>
        <form onSubmit={onQuickSearch} className="flex flex-wrap gap-2">
          <input
            className="min-w-[260px] flex-1 rounded-lg border px-3 py-2 text-sm"
            placeholder="输入委托人/对方/第三人全称、信用代码或身份证号（禁止输入空格）"
            value={kw}
            onChange={(e) => setKw(e.target.value.replace(/[\s\u3000]+/g, ""))}
          />
          <button disabled={isPending} className="rounded-lg bg-[#0D6E6E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b5c5c]">
            立即全域检索
          </button>
        </form>
        {searchRes ? (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-slate-800">
              检索词「{searchRes.keyword}」共命中 <span className={searchRes.totalHits > 0 ? "text-red-600" : "text-emerald-700"}>{searchRes.totalHits}</span> 条关联记录
            </div>
            {searchRes.matters.map((m) => (
              <div key={m.id} className="mt-1 text-slate-600">[正式案件] {m.internalCode} · {m.title}（主办：{m.owner?.name ?? "—"}）</div>
            ))}
            {searchRes.intakes.map((i) => (
              <div key={i.id} className="mt-1 text-slate-600">[收案在途] {i.title}（负责人：{i.ownerUser?.name ?? "—"}）</div>
            ))}
            {searchRes.criminalProfiles.map((c) => (
              <div key={c.id} className="mt-1 text-slate-600">[刑辩专项] {c.formalCaseNo ?? "未赋正式案号"} · {c.caseTitle}（委托人：{c.clientName}）</div>
            ))}
          </div>
        ) : null}
      </section>

      {data ? (
        <CriminalIntakeForm
          offices={data.offices}
          users={data.users}
          personalParties={data.personalParties}
          onSaved={async (m) => {
            setMsg(m);
            await reload();
          }}
          onError={(e) => setErr(e)}
        />
      ) : null}

      {/* 刑事辩护收案流程列表与 12 步状态推进 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">刑事辩护收案审批台账（{data?.profiles.length ?? 0}）</h2>
        <div className="space-y-3 text-sm">
          {(data?.profiles ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    <span>{p.caseTitle}</span>
                    {p.formalCaseNo ? <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs text-emerald-800">{p.formalCaseNo}</span> : null}
                    {p.lockedAt ? (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        <Lock className="h-3 w-3" /> 主表已锁定
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    委托人：{p.clientName} · 办公室：{p.office?.name ?? "总所"} · 费用：¥{Number(p.feeAmount).toLocaleString()}（{p.feeAmountChinese}）· 路径：
                    {p.signingPath === "FIRM_FIRST" ? "路径B 律所先电子红章" : "路径A 客户先签章"}
                  </div>
                </div>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-900">
                  {CRIMINAL_WORKFLOW_LABELS[p.workflowStep] ?? p.workflowStep}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {p.isProxyFiling && p.leadTakeoverStatus === "PENDING" ? (
                  <>
                    <button type="button" onClick={() => run(async () => { await handleProxyLeadAction({ profileId: p.id, action: "CONFIRMED" }); }, "案件负责人已同意代为发起")} className="rounded bg-emerald-600 px-2.5 py-1 text-xs text-white">
                      主办同意代发
                    </button>
                    <button type="button" onClick={() => run(async () => { await handleProxyLeadAction({ profileId: p.id, action: "TAKEN_OVER" }); }, "案件负责人已接管主表")} className="rounded bg-sky-600 px-2.5 py-1 text-xs text-white">
                      主办直接接管
                    </button>
                    <button type="button" onClick={() => run(async () => { await handleProxyLeadAction({ profileId: p.id, action: "RETURNED" }); }, "已退回代为发起人")} className="rounded border px-2.5 py-1 text-xs">
                      退回修改
                    </button>
                  </>
                ) : null}

                {p.workflowStep === "DRAFT" ? (
                  <button
                    type="button"
                    onClick={() =>
                      run(async () => {
                        const r = await submitCriminalConflictLock(p.id);
                        if (r.hitCount > 0) setMsg(`已永久锁定主表并自动发起利冲提示（命中 ${r.hitCount} 条，请进入下方利冲解决台）`);
                      }, "已提交利益冲突审查并永久锁定主表")
                    }
                    className="inline-flex items-center gap-1 rounded bg-[#0F2537] px-3 py-1 text-xs text-white"
                  >
                    <Lock className="h-3.5 w-3.5" /> 提交利冲审查（锁表）
                  </button>
                ) : null}

                {p.workflowStep === "CONFLICT_LOCKED" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => run(async () => { await advanceCriminalSigningStep({ profileId: p.id, signingPath: "CLIENT_FIRST", targetStep: "CLIENT_SIGN_REVIEW" }); }, "已进入路径A：客户先签章审核")}
                      className="rounded bg-[#0D6E6E] px-3 py-1 text-xs text-white"
                    >
                      路径A：客户先签章提交
                    </button>
                    <button
                      type="button"
                      onClick={() => run(async () => { await advanceCriminalSigningStep({ profileId: p.id, signingPath: "FIRM_FIRST", targetStep: "FIRM_SEAL_PENDING" }); }, "已进入路径B：提交管委会先电子用印")}
                      className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700"
                    >
                      路径B：申请律所先电子红章
                    </button>
                  </>
                ) : null}

                {p.workflowStep === "FIRM_SEAL_PENDING" && data?.isAdmin ? (
                  <button
                    type="button"
                    onClick={() => run(async () => { await advanceCriminalSigningStep({ profileId: p.id, targetStep: "FIRM_SEALED_WAITING_RETURN" }); }, "已加盖锁位电子红章，等待客户实体盖章回寄")}
                    className="rounded bg-red-600 px-3 py-1 text-xs text-white"
                  >
                    管委会电子用印放行
                  </button>
                ) : null}

                {(p.workflowStep === "CLIENT_SIGN_REVIEW" || p.workflowStep === "FIRM_SEALED_WAITING_RETURN") ? (
                  <button
                    type="button"
                    onClick={() => run(async () => { await advanceCriminalSigningStep({ profileId: p.id, targetStep: "ORIGINAL_VERIFY" }); }, "已上传双签回件并提交纸质原件待审核核验")}
                    className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-1 text-xs text-white"
                  >
                    <FileCheck className="h-3.5 w-3.5" /> 提交双签件与纸质原件
                  </button>
                ) : null}

                {p.workflowStep === "ORIGINAL_VERIFY" && data?.isAdmin ? (
                  <button
                    type="button"
                    onClick={() => run(async () => { await advanceCriminalSigningStep({ profileId: p.id, targetStep: "FORMAL_ACCEPTED" }); }, "三件一致核验通过，已自动生成正式收案号转入在办")}
                    className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> 收到并同意（赋正式收案号）
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 统一真/假利益冲突解决与管委会会议纪要平台 */}
      <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 font-semibold text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          统一利益冲突解决平台与多方会议纪要（初级审核无权单方驳回真利冲，须报管委会终审）
        </div>
        <div className="space-y-4 text-sm">
          {(data?.resolutions ?? []).length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">当前暂无命中利益冲突待解决记录。</div>
          ) : (
            (data?.resolutions ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-amber-200/80 bg-amber-50/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-900">
                    {r.caseTitle} <span className="ml-2 text-xs font-normal text-slate-500">命中关键词：{r.hitKeywords}</span>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">{r.status}</span>
                </div>

                <div className="mt-3 space-y-1.5 rounded-lg bg-white p-3 text-xs">
                  <div className="font-medium text-slate-600">会议纪要与多方对话留痕（{r.messages.length} 条）</div>
                  {r.messages.map((m) => (
                    <div key={m.id} className="border-b border-slate-100 pb-1 last:border-0">
                      <span className="font-semibold text-slate-800">{m.senderName}</span>{" "}
                      <span className="text-[11px] text-[#0D6E6E]">[{m.senderRoleLabel}]</span>：{m.content}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    className="min-w-[220px] flex-1 rounded-lg border bg-white px-3 py-1.5 text-xs"
                    placeholder="输入利冲解决方案说明 / 会议纪要发言 / 管委会裁定意见…"
                    value={noteById[r.id] ?? ""}
                    onChange={(e) => setNoteById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => run(async () => { await postConflictMeetingMessage({ resolutionId: r.id, content: noteById[r.id] || "" }); setNoteById((prev) => ({ ...prev, [r.id]: "" })); }, "已记入多方会议纪要")}
                    className="inline-flex items-center gap-1 rounded border bg-white px-2.5 py-1.5 text-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> 纪要发言
                  </button>
                  <button
                    type="button"
                    onClick={() => run(async () => { await advanceConflictResolution({ resolutionId: r.id, action: "ESCALATE_TO_COMMITTEE", note: noteById[r.id] || "转呈管委会终审" }); }, "已上报管理委员会终审裁决")}
                    className="rounded bg-amber-600 px-2.5 py-1.5 text-xs text-white"
                  >
                    上呈管委会终审
                  </button>
                  {data?.isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => run(async () => { await advanceConflictResolution({ resolutionId: r.id, action: "COMMITTEE_APPROVE", note: noteById[r.id] || "管委会裁定解决通过" }); }, "管委会终审：利冲解决通过，收案恢复")}
                        className="rounded bg-emerald-600 px-2.5 py-1.5 text-xs text-white"
                      >
                        管委会裁定通过
                      </button>
                      <button
                        type="button"
                        onClick={() => run(async () => { await advanceConflictResolution({ resolutionId: r.id, action: "COMMITTEE_REJECT", note: noteById[r.id] || "管委会裁定真利冲拒绝收案" }); }, "管委会终审：已拒绝收案并归档留痕")}
                        className="rounded bg-red-600 px-2.5 py-1.5 text-xs text-white"
                      >
                        管委会拒绝收案
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
