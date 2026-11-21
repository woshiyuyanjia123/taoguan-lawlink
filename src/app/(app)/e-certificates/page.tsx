"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Stamp, QrCode, Printer, AlertTriangle, CheckSquare, ExternalLink, CreditCard } from "lucide-react";
import { CERT_TYPES } from "@/lib/taoguan/dictionaries";
import {
  applyElectronicCertificate,
  batchApproveCertificates,
  listElectronicCertificates,
  recordCertificatePrint,
  revokeElectronicCertificate
} from "@/server/taoguan/certificates-actions";

type CertPayload = Awaited<ReturnType<typeof listElectronicCertificates>>;

export default function ElectronicCertificatesPage() {
  const [data, setData] = useState<CertPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const [caseNoLabel, setCaseNoLabel] = useState("");
  const [certType, setCertType] = useState("COURT_APPEARANCE");
  const [recipientOrg, setRecipientOrg] = useState("");
  const [lawyerNames, setLawyerNames] = useState("");
  const [clientName, setClientName] = useState("");
  const [batchCount, setBatchCount] = useState("1");

  async function reload() {
    const res = await listElectronicCertificates();
    setData(res);
  }

  useEffect(() => {
    reload().catch((e) => setErr(e instanceof Error ? e.message : "加载失败"));
  }, []);

  function onApply(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    startTransition(async () => {
      try {
        const res = await applyElectronicCertificate({
          caseNoLabel,
          certType,
          recipientOrg,
          lawyerNames,
          clientName,
          batchCount: Number(batchCount)
        });
        setMsg(`已提交 ${res.count} 份电子函证用印申请，待审核端批量签发电子红章`);
        setCaseNoLabel("");
        setRecipientOrg("");
        await reload();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "提交失败");
      }
    });
  }

  function onBatchApprove() {
    setErr("");
    setMsg("");
    startTransition(async () => {
      try {
        const res = await batchApproveCertificates(selectedIds);
        setSelectedIds([]);
        setMsg(`已批量加盖韬冠律所电子红章并签发 ${res.approvedCount} 份防伪电子函证`);
        await reload();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "批量盖章失败");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">电子办案函证、批量红章签发与对外门户</h1>
          <p className="mt-1 text-sm text-slate-500">
            支持批量申请/批量电子用印、单案超限领用报警、打印次数留痕（第 N 次打印）、二维码公开扫码防伪验真与个人电子名片分享。
          </p>
        </div>
        {data ? (
          <Link
            href={`/public/card/${data.currentUserId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <CreditCard className="h-4 w-4 text-[#0D6E6E]" />
            打开我的微信电子名片
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <Stamp className="h-4 w-4 text-red-600" />
          申请出具电子办案函证（支持一次批量申请多份）
        </div>
        <form onSubmit={onApply} className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">关联收案号 *</label>
            <input className="w-full rounded-lg border px-3 py-2 font-mono" placeholder="(2026)韬冠刑辩字第0001号" value={caseNoLabel} onChange={(e) => setCaseNoLabel(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">函证类型 *</label>
            <select className="w-full rounded-lg border px-3 py-2" value={certType} onChange={(e) => setCertType(e.target.value)}>
              {Object.entries(CERT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">主送机关 / 单位 *</label>
            <input className="w-full rounded-lg border px-3 py-2" placeholder="如：XX市看守所 / XX区人民法院" value={recipientOrg} onChange={(e) => setRecipientOrg(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">指派承办律师 *</label>
            <input className="w-full rounded-lg border px-3 py-2" placeholder="如：张律师、李实习律师" value={lawyerNames} onChange={(e) => setLawyerNames(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">委托人 / 当事人（选填）</label>
            <input className="w-full rounded-lg border px-3 py-2" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">批量申请份数（1–20）</label>
            <input type="number" min={1} max={20} className="w-full rounded-lg border px-3 py-2" value={batchCount} onChange={(e) => setBatchCount(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <button disabled={isPending} className="rounded-lg bg-[#0F2537] px-4 py-2 font-medium text-white hover:bg-[#173A54] disabled:opacity-60">
              提交电子函证用印申请
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">电子函证签发与防伪台账（{data?.certs.length ?? 0}）</h2>
          {data?.isAdmin ? (
            <button
              type="button"
              disabled={selectedIds.length === 0 || isPending}
              onClick={onBatchApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              批量加盖电子红章签发 ({selectedIds.length})
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-2 py-2">选</th>
                <th className="px-3 py-2">函证编号 / 防伪码</th>
                <th className="px-3 py-2">关联案号</th>
                <th className="px-3 py-2">类型与主送单位</th>
                <th className="px-3 py-2">承办律师</th>
                <th className="px-3 py-2">状态与打印留痕</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.certs ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-2 py-2.5">
                    {c.status === "PENDING" ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                        }
                      />
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-mono text-xs font-semibold text-slate-900">{c.certNo}</div>
                    <div className="font-mono text-[11px] text-[#0D6E6E]">码: {c.verifyCode}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {c.caseNoLabel}
                    {c.overLimitAlert ? (
                      <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                        <AlertTriangle className="h-3 w-3" /> 单案出函超限({c.caseLetterCount}份)
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{CERT_TYPES[c.certType] ?? c.certType}</div>
                    <div className="text-xs text-slate-500">{c.recipientOrg}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{c.lawyerNames}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        c.status === "ISSUED"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.status === "REVOKED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {c.status === "ISSUED" ? "已盖红章签发" : c.status === "REVOKED" ? "已作废" : "待审批用印"}
                    </span>
                    <div className="mt-1 text-[11px] text-slate-500">已打印：第 {c.printCount} 次</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={`/public/verify/${encodeURIComponent(c.certNo)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-[#0D6E6E] hover:bg-slate-50"
                      >
                        <QrCode className="h-3.5 w-3.5" /> 验真页
                      </Link>
                      {c.status === "ISSUED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(async () => {
                              const r = await recordCertificatePrint(c.id);
                              setMsg(`已登记 ${c.certNo} 第 ${r.printCount} 次打印留痕`);
                              await reload();
                            })
                          }
                          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          <Printer className="h-3.5 w-3.5" /> 登记打印
                        </button>
                      ) : null}
                      {data?.isAdmin && c.status !== "REVOKED" ? (
                        <button
                          type="button"
                          onClick={() => startTransition(async () => { await revokeElectronicCertificate(c.id); await reload(); })}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          作废
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
