"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, PauseCircle, PlayCircle, Copy, ShieldAlert } from "lucide-react";
import {
  createOrCloneOffice,
  listEmergencyPauses,
  listOffices,
  resumeEmergencyPause,
  triggerEmergencyPause
} from "@/server/taoguan/governance";

type OfficeRow = Awaited<ReturnType<typeof listOffices>>[number];
type PauseRow = Awaited<ReturnType<typeof listEmergencyPauses>>[number];

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<OfficeRow[]>([]);
  const [pauses, setPauses] = useState<PauseRow[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [isPending, startTransition] = useTransition();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [caseNoPrefix, setCaseNoPrefix] = useState("TG");
  const [managementFeeRate, setManagementFeeRate] = useState("0.15");
  const [peerTransferFeeRate, setPeerTransferFeeRate] = useState("0.03");
  const [cloneFromId, setCloneFromId] = useState("");

  const [pauseModule, setPauseModule] = useState("GLOBAL");
  const [pauseTargetId, setPauseTargetId] = useState("");
  const [pauseReason, setPauseReason] = useState("");

  async function reload() {
    const [o, p] = await Promise.all([listOffices(), listEmergencyPauses()]);
    setOffices(o);
    setPauses(p);
  }

  useEffect(() => {
    reload().catch((e) => setErr(e instanceof Error ? e.message : "加载失败"));
  }, []);

  function onCreateOffice(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    startTransition(async () => {
      try {
        await createOrCloneOffice({
          code,
          name,
          city,
          caseNoPrefix,
          managementFeeRate: Number(managementFeeRate),
          peerTransferFeeRate: Number(peerTransferFeeRate),
          invoiceAlertDays: 30,
          letterAlertLimit: 10,
          cloneFromId: cloneFromId || undefined
        });
        setCode("");
        setName("");
        setCity("");
        setMsg("已创建新办公室并同步复制流程费率与规则");
        await reload();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "创建办公室失败");
      }
    });
  }

  function onTriggerPause(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    startTransition(async () => {
      try {
        await triggerEmergencyPause({
          module: pauseModule,
          targetId: pauseTargetId || undefined,
          reason: pauseReason
        });
        setPauseReason("");
        setPauseTargetId("");
        setMsg("已触发流程紧急暂停，受控写入节点已即时锁定");
        await reload();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "暂停触发失败");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">多办公室、唯一管委会与超管紧急暂停</h1>
        <p className="mt-1 text-sm text-slate-500">
          依据《9.10版需求说明书》：全所共享大数据库，各办公室独立运行与统计，之上设唯一最高“管理委员会”；超级管理员可一键克隆新分所并在任意业务流程节点触发紧急暂停。
        </p>
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Building2 className="h-4 w-4 text-[#0D6E6E]" />
            创建 / 一键克隆分所办公室
          </div>
          <form onSubmit={onCreateOffice} className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">办公室编码（唯一，如 NJ / SZ / SH）</label>
              <input className="w-full rounded-lg border px-3 py-2 font-mono" value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">办公室全称</label>
              <input className="w-full rounded-lg border px-3 py-2" placeholder="如：韬冠南京办公室" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">所在城市</label>
              <input className="w-full rounded-lg border px-3 py-2" placeholder="如：南京市" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">收案号前缀</label>
              <input className="w-full rounded-lg border px-3 py-2 font-mono" value={caseNoPrefix} onChange={(e) => setCaseNoPrefix(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">律所管理费比例（默认 0.15 = 15%）</label>
              <input className="w-full rounded-lg border px-3 py-2 font-mono" value={managementFeeRate} onChange={(e) => setManagementFeeRate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">互转附加管理费率（默认 0.03 = 3%）</label>
              <input className="w-full rounded-lg border px-3 py-2 font-mono" value={peerTransferFeeRate} onChange={(e) => setPeerTransferFeeRate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">从已有办公室一键克隆费率与阈值（可选）</label>
              <select className="w-full rounded-lg border px-3 py-2" value={cloneFromId} onChange={(e) => setCloneFromId(e.target.value)}>
                <option value="">不克隆，按上方数值新建</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2537] px-4 py-2 text-white hover:bg-[#173A54] disabled:opacity-60">
                <Copy className="h-4 w-4" />
                {isPending ? "处理中…" : "创建办公室"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-amber-900">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            超管任意流程紧急暂停控制台
          </div>
          <form onSubmit={onTriggerPause} className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">暂停范围模块</label>
                <select className="w-full rounded-lg border px-3 py-2" value={pauseModule} onChange={(e) => setPauseModule(e.target.value)}>
                  <option value="GLOBAL">GLOBAL · 全所全部流程紧急冻结</option>
                  <option value="INTAKE">INTAKE · 收案审批流程</option>
                  <option value="CONFLICT">CONFLICT · 利益冲突解决程序</option>
                  <option value="FINANCE">FINANCE · 收费开票与ABCD财务</option>
                  <option value="SEAL">SEAL · 电子函证与用印签发</option>
                  <option value="HR">HR · 人事入离职流程</option>
                  <option value="ADMIN">ADMIN · 一般行政事务</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">指定单据 ID（留空表示整模块暂停）</label>
                <input className="w-full rounded-lg border px-3 py-2 font-mono" placeholder="可选" value={pauseTargetId} onChange={(e) => setPauseTargetId(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">紧急暂停原因（拦截时实时展示给操作人）</label>
              <input className="w-full rounded-lg border px-3 py-2" placeholder="如：月度结账核对期间暂停出款操作" value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} required />
            </div>
            <button disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-60">
              <PauseCircle className="h-4 w-4" />
              立即触发紧急暂停
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {pauses.filter((p) => p.active).length === 0 ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">当前无生效中的紧急暂停锁，全所流程正常运转。</div>
            ) : (
              pauses
                .filter((p) => p.active)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs">
                    <div>
                      <span className="font-mono font-bold text-red-700">[{p.module}]</span>{" "}
                      <span className="text-red-900">{p.reason}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => startTransition(async () => { await resumeEmergencyPause(p.id); await reload(); })}
                      className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      解除暂停
                    </button>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">已配置办公室与管理委员会清单（{offices.length}）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">编码</th>
                <th className="px-3 py-2">名称</th>
                <th className="px-3 py-2">层级标识</th>
                <th className="px-3 py-2">案号前缀</th>
                <th className="px-3 py-2">管理费率 / 互转费率</th>
                <th className="px-3 py-2">开票红警 / 函证上限</th>
                <th className="px-3 py-2">关联人员</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {offices.map((o) => (
                <tr key={o.id}>
                  <td className="px-3 py-2.5 font-mono font-medium">{o.code}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{o.name}</td>
                  <td className="px-3 py-2.5">
                    {o.isCommittee ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">唯一最高管理委员会</span>
                    ) : o.isHeadquarters ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">总所</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">独立分所</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{o.caseNoPrefix}</td>
                  <td className="px-3 py-2.5 font-mono">
                    {(Number(o.managementFeeRate) * 100).toFixed(1)}% / {(Number(o.peerTransferFeeRate) * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5">
                    {o.invoiceAlertDays} 天 / {o.letterAlertLimit} 份
                  </td>
                  <td className="px-3 py-2.5">{o._count.users} 人</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
