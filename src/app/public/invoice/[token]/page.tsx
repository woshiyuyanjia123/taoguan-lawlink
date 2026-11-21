"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { amountToChineseUppercase } from "@/lib/taoguan/chinese-money";

interface PublicInvoiceData {
  token: string;
  officeName: string;
  caseNoLabel: string | null;
  invoiceType: string;
  amount: number;
  clientTitle: string;
  taxNo: string;
  clientAddressPhone: string;
  clientBankAccount: string;
  applicantEmail: string;
  remark: string;
  status: string;
  issuedAt: string | null;
  scanUploaded: boolean;
  scanFileName: string | null;
}

export default function PublicInvoicePortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [data, setData] = useState<PublicInvoiceData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/invoice/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "加载失败");
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载开票单失败"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/api/public/invoice/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "提交失败");
      setData({ ...data, status: json.status });
      setMessage("开票抬头与税务信息已提交确认，律所财务开票后将发送至指定邮箱。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="bg-[#0F2537] px-6 py-5 text-white">
          <div className="text-xs text-[#F5D98E]">韬冠律所 · 客户免登录自助开票通道</div>
          <h1 className="mt-1 text-xl font-bold">律师费开票信息核对与填报</h1>
        </div>

        <div className="p-6">
          {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {message ? <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}

          {!data ? (
            <div className="py-10 text-center text-sm text-slate-500">{error ? "链接无效或已失效" : "正在加载开票单…"}</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">出票办公室</span>
                  <span className="font-medium">{data.officeName}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500">关联案号</span>
                  <span className="font-mono font-medium">{data.caseNoLabel || "待赋正式案号"}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500">开票金额</span>
                  <span className="text-base font-bold text-[#0F2537]">¥{data.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="mt-1 text-right text-xs text-slate-500">大写：{amountToChineseUppercase(data.amount)}</div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">当前状态</span>
                  <span className="font-medium text-[#0D6E6E]">
                    {data.status === "ISSUED" ? "已开具发票" : data.status === "CLIENT_FILLED" ? "客户已核对提交，待财务开票" : "待客户核对/填报"}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">发票抬头（必填）</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={data.clientTitle}
                  disabled={data.status === "ISSUED"}
                  onChange={(e) => setData({ ...data, clientTitle: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">纳税人识别号 / 个人身份证号</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  value={data.taxNo}
                  disabled={data.status === "ISSUED"}
                  onChange={(e) => setData({ ...data, taxNo: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">专票地址及电话（专票必填）</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={data.clientAddressPhone}
                  disabled={data.status === "ISSUED"}
                  onChange={(e) => setData({ ...data, clientAddressPhone: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">专票开户行及账号（专票必填）</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={data.clientBankAccount}
                  disabled={data.status === "ISSUED"}
                  onChange={(e) => setData({ ...data, clientBankAccount: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">接收电子发票邮箱</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={data.applicantEmail}
                  disabled={data.status === "ISSUED"}
                  onChange={(e) => setData({ ...data, applicantEmail: e.target.value })}
                />
              </div>

              {data.status !== "ISSUED" ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-[#0F2537] py-2.5 font-medium text-white hover:bg-[#173A54] disabled:opacity-60"
                >
                  {saving ? "正在提交…" : "确认并提交开票信息"}
                </button>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  电子发票已开具完成{data.scanFileName ? `（附件：${data.scanFileName}）` : ""}，请联系承办律师或查收邮箱。
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
