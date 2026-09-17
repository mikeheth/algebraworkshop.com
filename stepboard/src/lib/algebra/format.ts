import type { EquationLine, LinearEq, MathToken, Presentation, Relation } from "./types.ts";
import { relationOf } from "./types.ts";

function withRel(line: EquationLine, rel: Relation): EquationLine {
  return { ...line, rel };
}

export function abs(n: number): number {
  return Math.abs(n);
}

export function sideFromLinear(
  a: number,
  b: number,
  variable: string,
): MathToken[] {
  if (a === 0 && b === 0) return [{ type: "const", value: 0 }];

  const tokens: MathToken[] = [];

  if (a !== 0) {
    tokens.push(...variableTerm(a, variable, true));
  }

  if (b !== 0) {
    if (tokens.length === 0) {
      tokens.push({ type: "const", value: b });
    } else {
      tokens.push({ type: "op", value: b < 0 ? "−" : "+" });
      tokens.push({ type: "const", value: abs(b) });
    }
  }

  return tokens;
}

export function variableTerm(
  coef: number,
  variable: string,
  isFirst: boolean,
): MathToken[] {
  const tokens: MathToken[] = [];
  if (!isFirst) {
    tokens.push({ type: "op", value: coef < 0 ? "−" : "+" });
  } else if (coef < 0) {
    tokens.push({ type: "op", value: "−" });
  }

  const mag = abs(coef);
  if (mag !== 1) {
    tokens.push({ type: "coef", value: mag });
  }
  tokens.push({ type: "var", letter: variable });
  return tokens;
}

export function lineFromLinear(eq: LinearEq): EquationLine {
  return withRel(
    {
      left: sideFromLinear(eq.leftA, eq.leftB, eq.variable),
      right: sideFromLinear(eq.rightA, eq.rightB, eq.variable),
    },
    relationOf(eq),
  );
}

export function lineFromPresentation(
  p: Presentation,
  eq: LinearEq,
): EquationLine {
  const v = eq.variable;
  const rel = relationOf(eq);
  switch (p.form) {
    case "distribute": {
      const inner: MathToken[] = [
        { type: "var", letter: v },
        { type: "op", value: p.innerB < 0 ? "−" : "+" },
        { type: "const", value: abs(p.innerB) },
      ];
      return withRel(
        {
          left: [
            { type: "coef", value: p.outer },
            { type: "op", value: "(" },
            { type: "group", tokens: inner },
            { type: "op", value: ")" },
          ],
          right: sideFromLinear(eq.rightA, eq.rightB, v),
        },
        rel,
      );
    }
    case "combine": {
      const left = variableTerm(p.a, v, true);
      left.push({ type: "op", value: p.b1 < 0 ? "−" : "+" });
      left.push({ type: "const", value: abs(p.b1) });
      left.push({ type: "op", value: p.b2 < 0 ? "−" : "+" });
      left.push({ type: "const", value: abs(p.b2) });
      return withRel({ left, right: sideFromLinear(0, eq.rightB, v) }, rel);
    }
    case "quotient": {
      const inner = sideFromLinear(1, p.innerB, v);
      return withRel(
        {
          left: [
            {
              type: "frac",
              num: [{ type: "group", tokens: inner }],
              den: [{ type: "const", value: p.divisor }],
            },
          ],
          right: [{ type: "const", value: p.right }],
        },
        rel,
      );
    }
    default:
      return lineFromLinear(eq);
  }
}

export function divideLine(
  a: number,
  b: number,
  variable: string,
  divisor: number,
): EquationLine {
  return {
    left: [
      {
        type: "frac",
        num: sideFromLinear(a, 0, variable),
        den: signedNumeric(divisor, "coef"),
      },
    ],
    right: [
      {
        type: "frac",
        num: signedNumeric(b, "const"),
        den: signedNumeric(divisor, "const"),
      },
    ],
  };
}

/** a(x + b) / a = c / a — the grouping stays one term. Only when it is the whole side. */
export function divideGroupLine(eq: LinearEq): EquationLine {
  const p = eq.presentation;
  const grouped = lineFromPresentation(p, eq);
  const divisor =
    p.form === "distribute" ? p.outer : eq.leftA || 1;
  return withRel(
    {
      left: [
        {
          type: "frac",
          num: grouped.left,
          den: signedNumeric(divisor, "coef"),
        },
      ],
      right: [
        {
          type: "frac",
          num: grouped.right,
          den: signedNumeric(divisor, "const"),
        },
      ],
    },
    relationOf(eq),
  );
}

/** (ax)/d ± b/d = c/d — every term is divided, not just the variable. */
export function divideAllTermsLine(eq: LinearEq, divisor: number): EquationLine {
  return withRel(
    {
      left: divideSideTerms(eq.leftA, eq.leftB, eq.variable, divisor),
      right: divideSideTerms(eq.rightA, eq.rightB, eq.variable, divisor),
    },
    relationOf(eq),
  );
}

function divideSideTerms(
  a: number,
  b: number,
  variable: string,
  divisor: number,
): MathToken[] {
  const tokens: MathToken[] = [];
  if (a !== 0) {
    tokens.push({
      type: "frac",
      num: sideFromLinear(a, 0, variable),
      den: signedNumeric(divisor, "coef"),
    });
  }
  if (b !== 0) {
    if (tokens.length > 0) {
      tokens.push({ type: "op", value: b < 0 ? "−" : "+" });
    } else if (b < 0) {
      tokens.push({ type: "op", value: "−" });
    }
    tokens.push({
      type: "frac",
      num: [{ type: "const", value: abs(b) }],
      den: signedNumeric(divisor, "const"),
    });
  }
  if (tokens.length === 0) {
    tokens.push({
      type: "frac",
      num: [{ type: "const", value: 0 }],
      den: signedNumeric(divisor, "const"),
    });
  }
  return tokens;
}

function signedNumeric(
  n: number,
  kind: "coef" | "const",
): MathToken[] {
  if (n < 0) {
    return [
      { type: "op", value: "−" },
      { type: kind, value: abs(n) },
    ];
  }
  return [{ type: kind, value: n }];
}

export function substitutionLine(
  eq: LinearEq,
  solution: number,
): EquationLine {
  const p = eq.presentation;
  if (p.form === "quotient") {
    const inner: MathToken[] = [];
    inner.push({ type: "var", letter: String(solution) });
    if (p.innerB !== 0) {
      inner.push({ type: "op", value: p.innerB < 0 ? "−" : "+" });
      inner.push({ type: "const", value: abs(p.innerB) });
    }
    return {
      left: [
        {
          type: "frac",
          num: inner,
          den: [{ type: "const", value: p.divisor }],
        },
      ],
      right: [{ type: "const", value: p.right }],
    };
  }
  if (p.form === "distribute") {
    return {
      left: [
        { type: "coef", value: p.outer },
        { type: "op", value: "(" },
        { type: "var", letter: String(solution) },
        { type: "op", value: p.innerB < 0 ? "−" : "+" },
        { type: "const", value: abs(p.innerB) },
        { type: "op", value: ")" },
      ],
      right: substituteSide(eq.rightA, eq.rightB, eq.variable, solution),
    };
  }
  return {
    left: substituteSide(eq.leftA, eq.leftB, eq.variable, solution),
    right: substituteSide(eq.rightA, eq.rightB, eq.variable, solution),
  };
}

export function evaluateSides(
  eq: LinearEq,
  solution: number,
): { left: number; right: number } {
  const p = eq.presentation;
  if (p.form === "quotient") {
    return {
      left: (solution + p.innerB) / p.divisor,
      right: p.right,
    };
  }
  if (p.form === "distribute") {
    return {
      left: p.outer * (solution + p.innerB),
      right: eq.rightA * solution + eq.rightB,
    };
  }
  return {
    left: eq.leftA * solution + eq.leftB,
    right: eq.rightA * solution + eq.rightB,
  };
}

function substituteSide(
  a: number,
  b: number,
  _variable: string,
  x: number,
): MathToken[] {
  if (a === 0 && b === 0) return [{ type: "const", value: 0 }];
  const tokens: MathToken[] = [];
  if (a !== 0) {
    if (a < 0) tokens.push({ type: "op", value: "−" });
    const mag = abs(a);
    if (mag !== 1) tokens.push({ type: "coef", value: mag });
    tokens.push({ type: "op", value: "(" });
    tokens.push({ type: "var", letter: String(x) });
    tokens.push({ type: "op", value: ")" });
  }
  if (b !== 0) {
    if (tokens.length === 0) {
      tokens.push({ type: "const", value: b });
    } else {
      tokens.push({ type: "op", value: b < 0 ? "−" : "+" });
      tokens.push({ type: "const", value: abs(b) });
    }
  }
  return tokens;
}

export function formatNumber(n: number): string {
  if (Object.is(n, -0)) return "0";
  return String(n);
}

export function operationPhrase(
  kind: "add" | "subtract" | "multiply" | "divide",
  value: number,
): string {
  const mag = abs(value);
  switch (kind) {
    case "add":
      return `Add ${mag} to both sides`;
    case "subtract":
      return `Subtract ${mag} from both sides`;
    case "multiply":
      return `Multiply both sides by ${mag}`;
    case "divide":
      return value < 0
        ? `Divide both sides by −${mag}`
        : `Divide both sides by ${mag}`;
  }
}

export function equationPlain(line: EquationLine): string {
  const rel = line.rel ?? "=";
  return `${tokensPlain(line.left)} ${rel} ${tokensPlain(line.right)}`;
}

function tokensPlain(tokens: MathToken[]): string {
  return tokens
    .map((t) => {
      switch (t.type) {
        case "coef":
          return String(t.value);
        case "var":
          return t.letter;
        case "const":
          return String(t.value);
        case "op":
          return t.value === "−" ? "-" : t.value === "×" ? "*" : t.value;
        case "frac":
          return `(${tokensPlain(t.num)})/(${tokensPlain(t.den)})`;
        case "group":
          return tokensPlain(t.tokens);
      }
    })
    .join("");
}
