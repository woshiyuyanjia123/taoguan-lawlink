import type { LucideIcon } from "lucide-react";
import {
  House,
  Folder,
  SquareCheck,
  CalendarDays,
  Users,
  CreditCard,
  ChartColumn,
  Calculator,
  Package,
  FolderArchive,
  Contact,
  Compass,
  Megaphone,
  BookText,
  Scale,
  Landmark,
  Stamp,
  UserCog
} from "lucide-react";
import type { NavCounts } from "@/server/layout/nav-counts";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  countKey?: keyof NavCounts;
};

/**
 * 侧栏单列：按「工作台 → 案件动线 → 刑辩收案与利冲 → 财务 ABCD → 函证与人事」平铺。
 */
export const primaryNav: NavItem[] = [
  { label: "工作台", href: "/", icon: House },
  { label: "案件", href: "/matters", icon: Folder, countKey: "matters" },
  { label: "刑辩与利冲", href: "/criminal-intake", icon: Scale },
  { label: "审批", href: "/approvals", icon: SquareCheck, countKey: "approvals" },
  { label: "日程", href: "/schedule", icon: CalendarDays },
  { label: "客户", href: "/clients", icon: Users, countKey: "clients" },
  { label: "财务", href: "/finance", icon: CreditCard },
  { label: "ABCD四表", href: "/finance-abcd", icon: Landmark },
  { label: "电子函证", href: "/e-certificates", icon: Stamp },
  { label: "人事行政", href: "/hr-admin", icon: UserCog },
  { label: "报表", href: "/reports", icon: ChartColumn }
];

// 原顶栏「应用」聚合入口：实务工具=全局弹窗；法律导航=外链；其余为独立页
export const APP_ITEMS: { label: string; icon: LucideIcon; kind: "tools" | "link" | "external"; href?: string }[] = [
  { label: "实务工具", icon: Calculator, kind: "tools" },
  { label: "快递跟踪", href: "/express", icon: Package, kind: "link" },
  { label: "律所文书", href: "/firm-resources", icon: FolderArchive, kind: "link" },
  { label: "公告指引", href: "/announcements", icon: Megaphone, kind: "link" },
  { label: "制度规范", href: "/policy", icon: BookText, kind: "link" },
  { label: "通讯录", href: "/contacts", icon: Contact, kind: "link" },
  { label: "法律导航", href: "https://yesen.cn", icon: Compass, kind: "external" }
];
