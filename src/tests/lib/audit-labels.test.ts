/**
 * 审计标签完整性（第七轮体检 · 跨平台纯 Node.js 扫描实现）。
 *
 * auditActionLabel 按词拼装：action 的任何一个词未在 words 中登记，整条即降级为
 * 「其他操作（详见技术详情）」。本测试递归扫描全仓 action/targetType 字面量做元断言，
 * 同时兼容 Windows / macOS / Linux，不依赖外部 grep 命令。
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { auditActionLabel, auditTargetLabel } from "@/lib/audit-labels";

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function scan(regex: RegExp): string[] {
  const roots = ["src/server", "src/app", "src/lib"].map((d) => path.join(process.cwd(), d));
  const files = roots.flatMap((r) => collectSourceFiles(r));
  const found = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    for (const match of content.matchAll(regex)) {
      if (match[1]) found.add(match[1]);
    }
  }
  return [...found].sort();
}

describe("审计动作标签", () => {
  it("全仓每个 action 都能拼出中文，不落到「其他操作」", () => {
    const actions = scan(/action:\s*"([A-Z_]+)"/g);
    expect(actions.length).toBeGreaterThan(150); // 扫描确实生效
    const degraded = actions.filter((a) => auditActionLabel(a) === "其他操作（详见技术详情）");
    expect(degraded, `以下动作缺词条，请补 src/lib/audit-labels.ts 的 words：\n${degraded.join("\n")}`).toEqual([]);
  });

  it("全仓每个 targetType 都有中文标签，不落到「其他对象」", () => {
    const types = scan(/targetType:\s*"([A-Za-z]+)"/g);
    expect(types.length).toBeGreaterThan(40);
    const degraded = types.filter((t) => auditTargetLabel(t) === "其他对象");
    expect(degraded, `以下对象缺标签，请补 src/lib/audit-labels.ts 的 targetLabels：\n${degraded.join("\n")}`).toEqual([]);
  });

  it("本轮补齐的敏感操作可读", () => {
    expect(auditActionLabel("CLIENT_ID_REVEAL")).toBe("客户 · 证件号 · 查看明文");
    expect(auditActionLabel("ARCHIVE_BORROW_RETURN")).toBe("归档 · 借阅 · 归还");
    expect(auditActionLabel("USER_TOTP_REBIND_RESET")).toBe("用户 · 二次验证 · 重新绑定 · 重置");
    expect(auditTargetLabel("ArchiveBorrowRequest")).toBe("案卷借阅申请");
  });
});
