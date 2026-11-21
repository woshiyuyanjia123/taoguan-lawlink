/**
 * 人民币数字金额转财务规范中文大写（支持至千亿级，精确到分）。
 * 严格遵循《管理软件开发需求说明书 9.10 版》与刑事辩护收案二级页面批注要求。
 */

const CN_DIGITS = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
const CN_RADICES = ["", "拾", "佰", "仟"];
const CN_BIG_RADICES = ["", "万", "亿", "兆"];

export function amountToChineseUppercase(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "零元整";
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(num)) return "零元整";
  if (Math.abs(num) >= 1e15) return "金额超出上限";

  const isNegative = num < 0;
  const cents = Math.round(Math.abs(num) * 100);
  if (cents === 0) return "零元整";

  const integerPart = Math.floor(cents / 100);
  const jiao = Math.floor((cents % 100) / 10);
  const fen = cents % 10;

  let out = "";

  if (integerPart > 0) {
    const intStr = String(integerPart);
    let zeroCount = 0;
    const len = intStr.length;

    for (let i = 0; i < len; i++) {
      const pos = len - 1 - i;
      const digit = Number(intStr[i]);
      const quotient = Math.floor(pos / 4);
      const modulus = pos % 4;

      if (digit === 0) {
        zeroCount++;
      } else {
        if (zeroCount > 0) {
          out += CN_DIGITS[0];
        }
        zeroCount = 0;
        out += CN_DIGITS[digit] + CN_RADICES[modulus];
      }

      if (modulus === 0 && zeroCount < 4) {
        out += CN_BIG_RADICES[quotient];
        zeroCount = 0;
      }
    }
    out += "元";
  }

  if (jiao === 0 && fen === 0) {
    out += "整";
  } else {
    if (jiao > 0) {
      out += CN_DIGITS[jiao] + "角";
    } else if (integerPart > 0) {
      out += "零";
    }
    if (fen > 0) {
      out += CN_DIGITS[fen] + "分";
    }
  }

  return isNegative ? `负${out}` : out;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toCents(value: number | string | { toString(): string } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}
