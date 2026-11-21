import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EMPLOYMENT_TYPES } from "@/lib/taoguan/dictionaries";

export const dynamic = "force-dynamic";

export default async function PublicLawyerCardPage(props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      barLicenseNo: true,
      employmentType: true,
      publicCardBio: true,
      publicCardSpecialties: true,
      active: true,
      office: { select: { name: true, city: true } }
    }
  });

  if (!user || !user.active) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F2537] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-[#0F2537] to-[#173A54] px-6 py-7 text-white">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[#C8A24D]/50 bg-[#C8A24D]/15 px-3 py-1 text-xs font-medium text-[#F5D98E]">
              韬冠律师事务所 · 电子名片
            </span>
            <span className="text-xs text-white/70">{user.office?.name ?? "韬冠总所"}</span>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#C8A24D] text-2xl font-bold text-[#0F2537]">
              {user.name.slice(0, 1)}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
              <p className="mt-0.5 text-sm text-white/80">
                {EMPLOYMENT_TYPES[user.employmentType] ?? "执业律师"}
                {user.office?.city ? ` · ${user.office.city}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6 text-sm text-slate-700">
          {user.barLicenseNo ? (
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-400">执业证号</span>
              <span className="font-mono font-medium text-slate-900">{user.barLicenseNo}</span>
            </div>
          ) : null}
          {user.phone ? (
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-400">联系电话</span>
              <a href={`tel:${user.phone}`} className="font-medium text-[#0D6E6E] underline">
                {user.phone}
              </a>
            </div>
          ) : null}
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-400">工作邮箱</span>
            <a href={`mailto:${user.email}`} className="font-medium text-slate-900">
              {user.email}
            </a>
          </div>
          {user.publicCardSpecialties ? (
            <div className="border-b border-slate-100 pb-3">
              <div className="mb-1.5 text-slate-400">专业擅长领域</div>
              <p className="leading-relaxed text-slate-800">{user.publicCardSpecialties}</p>
            </div>
          ) : null}
          {user.publicCardBio ? (
            <div>
              <div className="mb-1.5 text-slate-400">律师简介</div>
              <p className="leading-relaxed text-slate-700">{user.publicCardBio}</p>
            </div>
          ) : null}
        </div>

        <div className="bg-slate-50 px-6 py-4 text-center text-xs text-slate-500">
          韬冠律所全流程综合管理系统（TaoGuan LawLink）官方认证电子名片 · 可直接转发微信
        </div>
      </div>
    </main>
  );
}
