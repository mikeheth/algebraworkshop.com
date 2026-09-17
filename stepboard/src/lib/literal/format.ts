import type { EquationLine, MathToken } from "../algebra/types.ts";

export function unk(letter: string): MathToken {
  return { type: "var", letter };
}

export function param(letter: string): MathToken {
  return { type: "var", letter, param: true };
}

export function num(n: number): MathToken {
  return { type: "const", value: n };
}

export function coef(n: number): MathToken {
  return { type: "coef", value: n };
}

export function op(value: string): MathToken {
  return { type: "op", value };
}

export function letter(s: string, target: string): MathToken {
  return s === target ? unk(s) : param(s);
}

export function frac(n: MathToken[], d: MathToken[]): MathToken {
  return { type: "frac", num: n, den: d };
}

export function line(left: MathToken[], right: MathToken[]): EquationLine {
  return { left, right, rel: "=" };
}

/** Juxtaposed product: 2πr, ma, Prt. */
export function productTokens(
  factorLetters: string[],
  target: string,
  leading = 1,
): MathToken[] {
  const out: MathToken[] = [];
  if (leading < 0) out.push(op("−"));
  const mag = Math.abs(leading);
  if (mag !== 1) out.push(num(mag));
  for (const L of factorLetters) out.push(letter(L, target));
  return out;
}

export function plusTerm(term: MathToken[]): MathToken[] {
  return [op("+"), ...term];
}

export function minusTerm(term: MathToken[]): MathToken[] {
  return [op("−"), ...term];
}

export function scaledLetter(n: number, L: string, target: string): MathToken[] {
  const out: MathToken[] = [];
  if (n < 0) out.push(op("−"));
  const mag = Math.abs(n);
  if (mag !== 1) out.push(coef(mag));
  out.push(letter(L, target));
  return out;
}

export function divideAnnotation(den: MathToken[]): EquationLine {
  const t = [op("÷"), ...den];
  return { left: t, right: [...t] };
}

export function mulAnnotation(factor: MathToken[]): EquationLine {
  const t = [op("×"), ...factor];
  return { left: t, right: [...t] };
}

export function addSubAnnotation(
  kind: "add" | "subtract",
  term: MathToken[],
): EquationLine {
  const t = [op(kind === "add" ? "+" : "−"), ...term];
  return { left: t, right: [...t] };
}

export function over(numTokens: MathToken[], den: MathToken[]): MathToken[] {
  return [frac(numTokens, den)];
}

export function group(tokens: MathToken[]): MathToken[] {
  return [op("("), { type: "group", tokens }, op(")")];
}

export function parenNum(n: number): MathToken[] {
  return [op("("), num(n), op(")")];
}
