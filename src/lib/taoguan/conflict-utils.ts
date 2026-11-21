/**
 * 全域便捷利益冲突检索清洗与核验工具：
 * 严格遵循《管理软件开发需求说明书 9.10 版》第 61 行“输入框不接受空格输入”防绕过规则。
 */

export function sanitizeConflictKeyword(raw: string): string {
  return raw.replace(/[\s\u3000\u00A0]+/g, "").trim();
}

export function validateConflictKeyword(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  if (/[\s\u3000\u00A0]/.test(raw)) {
    return { ok: false, error: "利益冲突检索词严禁包含空格，请去除空格后重新检索" };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "请输入至少 2 个字符的主体名称、统一社会信用代码或身份证号" };
  }
  return { ok: true, value: trimmed };
}

export function buildVerifyCode(prefix = "TG"): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  return `${prefix}-${stamp}-${rand}`;
}
