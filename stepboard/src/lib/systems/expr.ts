import type { EquationLine, MathToken } from "../algebra/types.ts";
import { coef, frac, group, line, num, op, unk } from "../literal/format.ts";

export { coef, frac, group, line, num, op, unk };

export function term(n: number, letter: string): MathToken[] {
  if (n === 0) return [];
  const mag = Math.abs(n);
  const out: MathToken[] = [];
  if (n < 0) out.push(op("−"));
  if (mag !== 1) out.push(coef(mag));
  out.push(unk(letter));
  return out;
}

export function signedConst(n: number): MathToken[] {
  if (n === 0) return [];
  if (n < 0) return [op("−"), num(-n)];
  return [num(n)];
}

/** Join terms. A term that already starts with − keeps that sign. */
export function joinTerms(parts: MathToken[][]): MathToken[] {
  const out: MathToken[] = [];
  for (const part of parts) {
    if (part.length === 0) continue;
    if (out.length === 0) {
      out.push(...part);
      continue;
    }
    const head = part[0];
    if (head?.type === "op" && head.value === "−") out.push(...part);
    else out.push(op("+"), ...part);
  }
  return out.length ? out : [num(0)];
}

export function exprTokens(m: number, letter: string, k: number): MathToken[] {
  return joinTerms([term(m, letter), k === 0 ? [] : signedConst(k)]);
}

export function exprPlain(m: number, letter: string, k: number): string {
  const mag = Math.abs(m);
  const core = `${m < 0 ? "−" : ""}${mag === 1 ? "" : mag}${letter}`;
  if (k === 0) return core;
  if (k > 0) return `${core} + ${k}`;
  return `${core} − ${-k}`;
}

export function withGroup(n: number, inner: MathToken[], markInner = false): MathToken[] {
  const g = markInner ? asSub(group(inner)) : group(inner);
  const mag = Math.abs(n);
  if (n === 1) return g;
  if (n === -1) return [op("−"), ...g];
  if (n < 0) return [op("−"), coef(mag), ...g];
  return [coef(mag), ...g];
}

export function plugTerm(n: number, value: number, markValue = false): MathToken[] {
  const mag = Math.abs(n);
  let inner =
    value < 0 ? [op("("), op("−"), num(-value), op(")")] : [op("("), num(value), op(")")];
  if (markValue) inner = asSub(inner);
  if (n === 1) return inner;
  if (n === -1) return [op("−"), ...inner];
  if (n < 0) return [op("−"), coef(mag), ...inner];
  return [coef(mag), ...inner];
}

export function eq(left: MathToken[], right: MathToken[]): EquationLine {
  return line(left, right);
}

/** Mark a copied value or expression. Only these tokens are colored on the substitution board. */
export function asSub(tokens: MathToken[]): MathToken[] {
  return tokens.map(markToken);
}

function markToken(token: MathToken): MathToken {
  if (token.type === "group") return { ...token, sub: true, tokens: token.tokens.map(markToken) };
  if (token.type === "frac") {
    return { ...token, sub: true, num: token.num.map(markToken), den: token.den.map(markToken) };
  }
  return { ...token, sub: true };
}

export function mulNote(factor: number): EquationLine {
  const t = [op("×"), num(factor)];
  return { left: t, right: [...t] };
}

export function addSubNote(kind: "add" | "subtract", n: number): EquationLine {
  const t = [op(kind === "add" ? "+" : "−"), num(n)];
  return { left: t, right: [...t] };
}
