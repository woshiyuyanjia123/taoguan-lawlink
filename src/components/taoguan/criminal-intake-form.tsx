"use client";

import { useState, useTransition } from "react";
import { amountToChineseUppercase } from "@/lib/taoguan/chinese-money";
import {
  CLIENT_SUSPECT_RELATIONS,
  COERCIVE_MEASURES,
  COMMON_CRIMINAL_CHARGES,
  CRIMINAL_FEE_MODES,
  CRIMINAL_STAGES
} from "@/lib/taoguan/dictionaries";
import { saveCriminalIntakeDraft } from "@/server/taoguan/criminal-intake";

interface Props {
  offices: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  personalParties: Array<{ id: string; name: string; idNumber: string | null }>;
  onSaved: (msg: string) => Promise<void>;
  onError: (err: string) => void;
}

export function CriminalIntakeForm({ offices, users, personalParties, onSaved, onError }: Props) {
  const [isPending, startTransition] = useTransition();
  const [officeId, setOfficeId] = useState(offices[0]?.id ?? "");
  const [caseTitle, setCaseTitle] = useState("");
  const [isProxyFiling, setIsProxyFiling] = useState(false);
  const [leadLawyerId, setLeadLawyerId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientIdNo, setClientIdNo] = useState("");
  const [clientIsSuspect, setClientIsSuspect] = useState(false);
  const [clientSuspectRelation, setClientSuspectRelation] = useState<string>(CLIENT_SUSPECT_RELATIONS[0]);
  const [suspectName, setSuspectName] = useState("");
  const [victimName, setVictimName] = useState("");
  const [selectedCharges, setSelectedCharges] = useState<string[]>(["诈骗罪"]);
  const [coerciveMeasure, setCoerciveMeasure] = useState<string>(COERCIVE_MEASURES[1]);
  const [coerciveAuthorityRegion, setCoerciveAuthorityRegion] = useState("");
  const [coerciveAuthorityName, setCoerciveAuthorityName] = useState("");
  const [handlingAuthorityRegion, setHandlingAuthorityRegion] = useState("");
  const [handlingAuthorityName, setHandlingAuthorityName] = useState("");
  const [entrustStageSummary, setEntrustStageSummary] = useState("");
  const [feeMode, setFeeMode] = useState<number>(1);
  const [feeSubOption, setFeeSubOption] = useState("一审裁判文书止");
  const [selectedStages, setSelectedStages] = useState<string[]>(["侦查"]);
  const [feeAmount, setFeeAmount] = useState("50000");
  const [meetingUnitPrice, setMeetingUnitPrice] = useState("3000");
  const [meetingCount, setMeetingCount] = useState("2");
  const [incidentalCivil, setIncidentalCivil] = useState(false);
  const [incidentalCivilFee, setIncidentalCivilFee] = useState("");
  const [feeRemark, setFeeRemark] = useState("");
  const [isForeignRelated, setIsForeignRelated] = useState(false);
  const [isGangRelated, setIsGangRelated] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [signingPath, setSigningPath] = useState<"CLIENT_FIRST" | "FIRM_FIRST">("CLIENT_FIRST");

  const effectiveFee =
    feeMode === 5 ? Math.round(Number(meetingUnitPrice || 0) * Number(meetingCount || 0) * 100) / 100 : Number(feeAmount || 0);

  function toggleStage(stage: string) {
    if (feeMode === 4) {
      setSelectedStages([stage]);
      return;
    }
    setSelectedStages((prev) => (prev.includes(stage) ? prev.filter((x) => x !== stage) : [...prev, stage]));
  }

  function toggleCharge(charge: string) {
    setSelectedCharges((prev) => (prev.includes(charge) ? prev.filter((x) => x !== charge) : [...prev, charge]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError("");
    startTransition(async () => {
      try {
        await saveCriminalIntakeDraft({
          officeId: officeId || null,
          caseTitle,
          isProxyFiling,
          leadLawyerId: isProxyFiling ? leadLawyerId || null : null,
          clientName,
          clientIdNo,
          clientIsSuspect,
          clientSuspectRelation,
          suspects: [{ name: clientIsSuspect ? clientName : suspectName || clientName }],
          victims: victimName.trim() ? [{ name: victimName.trim() }] : [],
          charges: selectedCharges,
          coerciveMeasure,
          coerciveAuthorityRegion,
          coerciveAuthorityName,
          handlingAuthorityRegion,
          handlingAuthorityName,
          entrustStageSummary,
          feeMode,
          feeSubOption,
          selectedStages,
          feeAmount: effectiveFee,
          meetingUnitPrice: feeMode === 5 ? Number(meetingUnitPrice || 0) : null,
          meetingCount: feeMode === 5 ? Number(meetingCount || 0) : null,
          incidentalCivil,
          incidentalCivilFee: incidentalCivil ? Number(incidentalCivilFee || 0) : null,
          feeRemark,
          isForeignRelated,
          isGangRelated,
          isSensitive,
          signingPath
        });
        setCaseTitle("");
        await onSaved("刑事辩护收案草稿已保存（30天自动清理，委托人已写入个人主体库）");
      } catch (ex) {
        onError(ex instanceof Error ? ex.message : "保存失败");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <h2 className="font-semibold text-slate-900">刑事辩护收案审批填报（完整对齐 7 选 1 收费 · 18 阶段 · 双签章路径）</h2>
        {personalParties.length > 0 ? (
          <select
            className="rounded border px-2 py-1 text-xs"
            defaultValue=""
            onChange={(e) => {
              const p = personalParties.find((x) => x.id === e.target.value);
              if (p) {
                setClientName(p.name);
                setClientIdNo(p.idNumber ?? "");
              }
            }}
          >
            <option value="">从个人主体库一键填入老客户…</option>
            {personalParties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.idNumber ? `(${p.idNumber})` : ""}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">归属办公室</label>
          <select className="w-full rounded-lg border px-3 py-2" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
            <option value="">默认本办公室</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">案件简称 *</label>
          <input className="w-full rounded-lg border px-3 py-2" placeholder="如：张某涉嫌诈骗罪侦查阶段辩护" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">签约用印路径 *</label>
          <select className="w-full rounded-lg border px-3 py-2" value={signingPath} onChange={(e) => setSigningPath(e.target.value as "CLIENT_FIRST" | "FIRM_FIRST")}>
            <option value="CLIENT_FIRST">路径 A：委托手续客户先签章</option>
            <option value="FIRM_FIRST">路径 B：委托手续律所先电子用印（客户实体回寄）</option>
          </select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input id="proxyFiling" type="checkbox" checked={isProxyFiling} onChange={(e) => setIsProxyFiling(e.target.checked)} />
          <label htmlFor="proxyFiling" className="text-xs font-medium">
            他人代为发起（须选案件负责人为第一审批人）
          </label>
        </div>
        {isProxyFiling ? (
          <div className="sm:col-span-2">
            <select className="w-full rounded-lg border px-3 py-2" value={leadLawyerId} onChange={(e) => setLeadLawyerId(e.target.value)} required>
              <option value="">请选择案件负责人（第一审批人）</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-xs text-slate-500">委托人姓名 / 机构名称 *</label>
          <input className="w-full rounded-lg border px-3 py-2" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">委托人身份证号 / 信用代码</label>
          <input className="w-full rounded-lg border px-3 py-2 font-mono" value={clientIdNo} onChange={(e) => setClientIdNo(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input id="clientSuspect" type="checkbox" checked={clientIsSuspect} onChange={(e) => setClientIsSuspect(e.target.checked)} />
          <label htmlFor="clientSuspect" className="text-xs">
            委托人即嫌疑人/被告人本人
          </label>
        </div>

        {!clientIsSuspect ? (
          <>
            <div>
              <label className="mb-1 block text-xs text-slate-500">嫌疑人 / 被告人姓名 *</label>
              <input className="w-full rounded-lg border px-3 py-2" value={suspectName} onChange={(e) => setSuspectName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">委托人与嫌疑人关系</label>
              <select className="w-full rounded-lg border px-3 py-2" value={clientSuspectRelation} onChange={(e) => setClientSuspectRelation(e.target.value)}>
                {CLIENT_SUSPECT_RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        <div>
          <label className="mb-1 block text-xs text-slate-500">被害人 / 自诉人（选填，办案阶段补齐）</label>
          <input className="w-full rounded-lg border px-3 py-2" value={victimName} onChange={(e) => setVictimName(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">强制措施状态</label>
          <select className="w-full rounded-lg border px-3 py-2" value={coerciveMeasure} onChange={(e) => setCoerciveMeasure(e.target.value)}>
            {COERCIVE_MEASURES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">强制措施决定机构（省市区 + 名称）</label>
          <div className="flex gap-1.5">
            <input className="w-1/2 rounded-lg border px-2 py-2" placeholder="省/市/区县" value={coerciveAuthorityRegion} onChange={(e) => setCoerciveAuthorityRegion(e.target.value)} />
            <input className="w-1/2 rounded-lg border px-2 py-2" placeholder="机关名称" value={coerciveAuthorityName} onChange={(e) => setCoerciveAuthorityName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">当前办理机构（省市区 + 名称）</label>
          <div className="flex gap-1.5">
            <input className="w-1/2 rounded-lg border px-2 py-2" placeholder="省/市/区县" value={handlingAuthorityRegion} onChange={(e) => setHandlingAuthorityRegion(e.target.value)} />
            <input className="w-1/2 rounded-lg border px-2 py-2" placeholder="公检法机关" value={handlingAuthorityName} onChange={(e) => setHandlingAuthorityName(e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-slate-600">涉嫌罪名（支持数罪多选，已选：{selectedCharges.join("、") || "无"}）</div>
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border bg-slate-50 p-2">
          {COMMON_CRIMINAL_CHARGES.map((c) => {
            const on = selectedCharges.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCharge(c)}
                className={`rounded px-2 py-0.5 text-xs ${on ? "bg-[#0F2537] text-white" : "bg-white text-slate-600 hover:bg-slate-200"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-2 font-medium text-slate-900">委托方式与收费标准（7 选 1）</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CRIMINAL_FEE_MODES.map((m) => (
            <label key={m.code} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 ${feeMode === m.code ? "border-[#0D6E6E] bg-white" : "border-transparent bg-white/60"}`}>
              <input type="radio" name="feeMode" checked={feeMode === m.code} onChange={() => setFeeMode(m.code)} className="mt-1" />
              <div>
                <div className="text-xs font-semibold text-slate-900">{m.label}</div>
                <div className="text-[11px] text-slate-500">{m.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {feeMode === 1 ? (
            <div>
              <label className="mb-1 block text-xs text-slate-500">不分阶段终止期限选项</label>
              <select className="w-full rounded-lg border bg-white px-3 py-2" value={feeSubOption} onChange={(e) => setFeeSubOption(e.target.value)}>
                <option value="一审裁判文书止">选项A：至一审裁判文书 / 10日内会见止</option>
                <option value="二审终审裁判文书止">选项B：至二审终审裁判文书止</option>
              </select>
            </div>
          ) : null}

          {feeMode === 6 ? (
            <div>
              <label className="mb-1 block text-xs text-slate-500">法律援助类型</label>
              <select className="w-full rounded-lg border bg-white px-3 py-2" value={feeSubOption} onChange={(e) => setFeeSubOption(e.target.value)}>
                <option value="司法部门委托指定法律援助">司法部门委托指定法律援助</option>
                <option value="律所内部公益安排法律援助">律所内部公益安排法律援助</option>
              </select>
            </div>
          ) : null}

          {feeMode === 5 ? (
            <>
              <div>
                <label className="mb-1 block text-xs text-slate-500">单次会见/咨询单价（元）</label>
                <input type="number" className="w-full rounded-lg border bg-white px-3 py-2 font-mono" value={meetingUnitPrice} onChange={(e) => setMeetingUnitPrice(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">当前约定次数</label>
                <input type="number" className="w-full rounded-lg border bg-white px-3 py-2 font-mono" value={meetingCount} onChange={(e) => setMeetingCount(e.target.value)} />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-slate-500">律师费金额（元）</label>
              <input type="number" step="0.01" className="w-full rounded-lg border bg-white px-3 py-2 font-mono" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} />
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">系统自动核算中文大写（不可手改）</label>
            <div className="rounded-lg border border-dashed border-[#0D6E6E]/40 bg-white px-3 py-2 font-semibold text-[#0D6E6E]">
              ¥{effectiveFee.toLocaleString("zh-CN", { minimumFractionDigits: 2 })} （人民币：{amountToChineseUppercase(effectiveFee)}）
            </div>
          </div>
        </div>

        {(feeMode === 2 || feeMode === 3 || feeMode === 4) ? (
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-slate-600">
              委托阶段选择（18 项，{feeMode === 4 ? "当前为单选" : "当前支持多选"}）：
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CRIMINAL_STAGES.map((st) => {
                const on = selectedStages.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleStage(st)}
                    className={`rounded px-2 py-1 text-xs ${on ? "bg-[#0D6E6E] text-white" : "border bg-white text-slate-600"}`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <input id="incCivil" type="checkbox" checked={incidentalCivil} onChange={(e) => setIncidentalCivil(e.target.checked)} />
            <label htmlFor="incCivil" className="text-xs">含刑事附带民事诉讼</label>
          </div>
          {incidentalCivil ? (
            <input type="number" className="rounded-lg border bg-white px-3 py-1.5 font-mono text-xs" placeholder="附带民诉另收律师费(元)" value={incidentalCivilFee} onChange={(e) => setIncidentalCivilFee(e.target.value)} />
          ) : null}
          <input className="rounded-lg border bg-white px-3 py-1.5 text-xs sm:col-span-2" placeholder="收费说明 / 分期付款节点（选择6/7必填）" value={feeRemark} onChange={(e) => setFeeRemark(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={isForeignRelated} onChange={(e) => setIsForeignRelated(e.target.checked)} /> 涉外案件</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={isGangRelated} onChange={(e) => setIsGangRelated(e.target.checked)} /> 涉黑案件</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)} /> 敏感案件</label>
          <input className="rounded border px-2.5 py-1" placeholder="委托时案件阶段简述" value={entrustStageSummary} onChange={(e) => setEntrustStageSummary(e.target.value)} />
        </div>
        <button disabled={isPending} className="rounded-lg bg-[#0F2537] px-5 py-2 font-medium text-white hover:bg-[#173A54] disabled:opacity-60">
          {isPending ? "保存中…" : "暂存刑事辩护收案草稿"}
        </button>
      </div>
    </form>
  );
}
