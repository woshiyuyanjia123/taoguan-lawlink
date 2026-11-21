import { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getFirmProfile } from "@/server/settings/firm-profile";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "登录 — 韬冠律所全流程管理系统"
};

/** 墨案 01 效果图：左侧深墨品牌面板 + 右侧表单面板，全屏分栏 */
export default async function LoginPage() {
  const profile = await getFirmProfile().catch(() => null);
  const firmName = profile?.firmName || "韬冠律所";

  return (
    <div className="mo-login">
      <div className="login">
        <div className="brand-panel">
          <div className="bp-brand">
            <div className="bp-mark">
              <svg width="19" height="19" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="2.2" y="2.4" width="11.6" height="2.4" rx="1" fill="#C8A24D" />
                <rect x="6.7" y="4.8" width="2.6" height="8.8" rx="1" fill="#fff" />
                <rect x="3" y="11.2" width="10" height="2.2" rx="1" fill="#00A6A6" />
              </svg>
            </div>
            <div>
              <div className="bp-name">{firmName}</div>
              <div className="bp-sub">全流程综合管理系统 · TaoGuan LawLink</div>
            </div>
          </div>

          <div className="bp-hero">
            <div className="bp-eyebrow">TAOGUAN LAWLINK · 多端协同工作台</div>
            <h1 className="bp-title">
              让每一件案件，
              <br />
              都<span className="hl">有迹可循</span>。
            </h1>
            <p className="bp-desc">
              覆盖多办公室与管委会治理、12 步收案与真假利冲裁决、电子函证防伪验真、银行流水尺子对账与内部财务 ABCD 四表，支持 Web / Windows / macOS / 手机 App 全端协同。
            </p>
            <div className="bp-points">
              <div className="bp-point">
                <div className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M9 12l2 2 4-5" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </div>
                全域无空格利冲检索与管委会双路径裁决
              </div>
              <div className="bp-point">
                <div className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 3l7 4v5c0 4.4-3 8-7 9-4-1-7-4.6-7-9V7z" />
                  </svg>
                </div>
                内部流水账 ABCD 四表与银行流水拆单核销
              </div>
              <div className="bp-point">
                <div className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <path d="M14 3v6h6" />
                  </svg>
                </div>
                电子红章函证二维码验真与一键顺序归档
              </div>
            </div>
          </div>

          <div className="bp-foot">
            <span>{firmName} · 公网/私有化多端部署</span>
            <span>MIT License · Based on LawLink</span>
          </div>
        </div>

        <div className="form-panel">
          <div className="fp-body">
            <h2 className="fp-title">登录 {firmName}</h2>
            <p className="fp-sub">使用工作账号登录（支持 PC / macOS 桌面端与手机 App）</p>
            <Suspense fallback={<LoginFallback />}>
              <LoginForm />
            </Suspense>
            <div className="fp-protect">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 3l7 4v5c0 4.4-3 8-7 9-4-1-7-4.6-7-9V7z" />
                <path d="M12 11v4M12 8h.01" />
              </svg>
              <span>登录保护已开启：连续 5 次失败将临时锁定 15 分钟；管理员可要求两步验证。</span>
            </div>
          </div>
          <div className="fp-foot">
            遇到登录问题请联系所内管理员<span className="sep">·</span>登录行为将被记录审计
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex h-56 items-center justify-center text-[var(--t-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}
