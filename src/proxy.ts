import { withAuth } from "next-auth/middleware";

/**
 * 全站默认要求登录。
 * `matcher` 显式排除 /login、/api/auth/*、静态资源等公开路径。
 */
export default withAuth({
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: [
    /*
     * 匹配所有路径，但排除：
     *   /login            登录页本身
     *   /public/*         对外免登录 H5（律师电子名片、客户开票填报、电子函证防伪验真）
     *   /api/auth         NextAuth 路由
     *   /api/public       对外免登录公开接口与扫码登录握手
     *   /api/health       健康检查（桌面端与手机 App 探活）
     *   /api/calendar     v0.50 ICS 日历订阅（token 即凭证，日历客户端无 cookie）
     *   /manifest.webmanifest / /sw.js PWA 静态资产
     *   /_next/*          Next 内部资源（含 HMR websocket）
     *   静态文件（.png .ico .svg 等）
     */
    "/((?!login|public|api/auth|api/public|api/health|api/calendar|manifest\\.webmanifest|sw\\.js|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)"
  ]
};
