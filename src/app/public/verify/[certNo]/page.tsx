import { prisma } from "@/lib/prisma";
import { CERT_TYPES } from "@/lib/taoguan/dictionaries";

export const dynamic = "force-dynamic";

export default async function PublicVerifyCertPage(props: { params: Promise<{ certNo: string }> }) {
  const { certNo } = await props.params;
  const key = decodeURIComponent(certNo).trim();

  const cert = await prisma.electronicCertificate.findFirst({
    where: { OR: [{ certNo: key }, { verifyCode: key }] },
    include: { office: { select: { name: true, city: true } } }
  });

  const isValid = cert?.status === "ISSUED";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className={`px-6 py-6 text-white ${isValid ? "bg-[#0F2537]" : "bg-red-800"}`}>
          <div className="text-xs uppercase tracking-wider text-white/75">韬冠律师事务所 · 电子函证二维码防伪查验</div>
          <h1 className="mt-2 text-2xl font-bold">
            {!cert ? "未查到该函证存证记录" : isValid ? "核验通过 · 真实有效电子函证" : cert.status === "REVOKED" ? "警告：该函证已被作废" : "待审批签发（尚未生效）"}
          </h1>
        </div>

        <div className="p-6 text-sm">
          {!cert ? (
            <p className="text-slate-600">
              查询编号 <span className="font-mono font-bold text-slate-900">{key}</span> 在韬冠律所防伪存证库中无匹配记录，请谨防伪造或核对编号。
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">函证编号</span>
                <span className="font-mono font-semibold text-slate-900">{cert.certNo}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">防伪核验码</span>
                <span className="font-mono font-semibold text-[#0D6E6E]">{cert.verifyCode}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">签发机构</span>
                <span className="font-medium text-slate-900">{cert.office?.name ?? "韬冠律师事务所"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">函证类型</span>
                <span className="font-medium text-slate-900">{CERT_TYPES[cert.certType] ?? cert.certType}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">关联收案号</span>
                <span className="font-mono font-medium text-slate-900">{cert.caseNoLabel}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">主送单位</span>
                <span className="font-medium text-slate-900">{cert.recipientOrg}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">指派承办律师</span>
                <span className="font-medium text-slate-900">{cert.lawyerNames}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">用印签发时间</span>
                <span className="text-slate-700">{cert.issuedAt ? cert.issuedAt.toLocaleString("zh-CN") : "尚未用印"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">累计打印次数</span>
                <span className="font-medium text-slate-700">第 {cert.printCount} 次</span>
              </div>

              {isValid ? (
                <div className="mt-5 flex items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50/40 p-4">
                  <div className="text-center">
                    <div className="inline-flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-red-600/85 text-red-700">
                      <span className="text-[10px] font-bold">韬冠律所</span>
                      <span className="text-lg leading-none">★</span>
                      <span className="text-[9px] font-semibold">电子业务专用章</span>
                    </div>
                    <div className="mt-2 text-xs text-red-700/80">{cert.sealText} · 电子防伪印记</div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
