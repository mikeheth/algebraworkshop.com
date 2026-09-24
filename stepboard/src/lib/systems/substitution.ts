import { pick, randInt } from "../algebra/random.ts";
import type { EquationLine, MathToken } from "../algebra/types.ts";
import {
  addSubNote,
  asSub,
  coef,
  eq,
  exprPlain,
  exprTokens,
  joinTerms,
  num,
  op,
  plugTerm,
  signedConst,
  term,
  unk,
  withGroup,
} from "./expr.ts";
import type { SystemProblem, SystemSettings, SystemStep, SubLevel } from "./types.ts";

type Spec = {
  isolated: "x" | "y";
  other: "x" | "y";
  m: number;
  k: number;
  coefL: number;
  coefO: number;
  c: number;
  x: number;
  y: number;
  p?: number;
  divisor?: number;
};

const CAP = { topCaption: "Equation 1", bottomCaption: "Equation 2" };

let seq = 0;
function nid(): string {
  seq += 1;
  return `S${seq}`;
}

function push(
  steps: SystemStep[],
  top: EquationLine,
  bottom: EquationLine,
  extra: Omit<SystemStep, "id" | "top" | "bottom" | "topCaption" | "bottomCaption"> &
    Partial<Pick<SystemStep, "topCaption" | "bottomCaption">>,
) {
  steps.push({
    id: nid(),
    top,
    bottom,
    topCaption: extra.topCaption ?? CAP.topCaption,
    bottomCaption: extra.bottomCaption ?? CAP.bottomCaption,
    focus: extra.focus,
    explanation: extra.explanation,
    property: extra.property,
    ask: extra.ask,
    banner: extra.banner,
    annotation: extra.annotation,
    ghost: extra.ghost,
  });
}

export function generateSubstitution(settings: SystemSettings): SystemProblem {
  const level = settings.subLevel ?? "easy";
  for (let i = 0; i < 80; i++) {
    if (level === "easy") {
      const easy = rollEasy(settings.negatives);
      if (!easy) continue;
      return finishEasy(easy);
    }
    const spec = rollExpr(level, settings.negatives);
    if (!spec) continue;
    const L = spec.isolated;
    const O = spec.other;
    return {
      method: "substitution",
      steps: solve(spec),
      solution: { x: spec.x, y: spec.y },
      structureLabel:
        level === "advanced" ? `Hard · isolate ${L} first` : `Medium · ${L} is an expression`,
      prompt: "Solve the system by substitution.",
      holds: (x, y) => {
        const lv = L === "x" ? x : y;
        const ov = O === "x" ? x : y;
        const first = spec.divisor
          ? spec.divisor * lv === spec.divisor * spec.m * ov + spec.divisor * spec.k
          : spec.p
            ? lv + spec.p === spec.m * ov + spec.k + spec.p
            : lv === spec.m * ov + spec.k;
        return first && spec.coefL * lv + spec.coefO * ov === spec.c;
      },
    };
  }
  throw new Error("Could not build a substitution system.");
}

function rollExpr(level: SubLevel, negatives: boolean): Spec | undefined {
  const isolated = pick(["x", "y"] as const);
  const other = isolated === "x" ? "y" : "x";
  const m = negatives && Math.random() < 0.35 ? -randInt(1, 3) : randInt(1, 4);
  const otherVal = negatives && Math.random() < 0.3 ? -randInt(1, 5) : randInt(0, 6);
  const k = negatives ? randInt(-4, 5) : randInt(0, 5);
  const isolatedVal = m * otherVal + k;
  if (Math.abs(isolatedVal) > 18) return undefined;
  const coefL = Math.random() < 0.28 ? 1 : randInt(2, 4);
  const coefO = randInt(1, 5);
  const n = coefO + coefL * m;
  if (n <= 0 || n > 12) return undefined;
  const c = coefL * isolatedVal + coefO * otherVal;
  if (Math.abs(c) > 48) return undefined;
  const x = isolated === "x" ? isolatedVal : otherVal;
  const y = isolated === "y" ? isolatedVal : otherVal;
  const advancedDivide = level === "advanced" && Math.random() < 0.5;
  const p = level === "advanced" && !advancedDivide ? randInt(2, 6) : undefined;
  const divisor = advancedDivide ? pick([2, 3]) : undefined;
  if (divisor && Math.abs(divisor * k) > 24) return undefined;
  return { isolated, other, m, k, coefL, coefO, c, x, y, p, divisor };
}

function solve(spec: Spec): SystemStep[] {
  seq = 0;
  const { isolated: L, other: O, m, k, coefL, coefO, c, p, divisor } = spec;
  const lv = L === "x" ? spec.x : spec.y;
  const ov = O === "x" ? spec.x : spec.y;
  const expr = exprTokens(m, O, k);
  const plain = exprPlain(m, O, k);
  const solvedTop = eq([unk(L)], asSub(expr));
  const givenTop = divisor
    ? eq(term(divisor, L), exprTokens(m * divisor, O, k * divisor))
    : p
      ? eq(joinTerms([[unk(L)], signedConst(p)]), joinTerms([term(m, O), signedConst(k + p)]))
      : solvedTop;
  const givenBottom = eq(joinTerms([term(coefL, L), term(coefO, O)]), [num(c)]);
  const steps: SystemStep[] = [];
  let top = givenTop;

  push(steps, top, givenBottom, {
    focus: "both",
    property: "Given system",
    explanation: divisor
      ? `${L} is not alone yet. Divide equation 1 so ${L} is an expression, then write that expression in place of ${L}.`
      : p
        ? `${L} is not alone yet. Isolate ${L} in equation 1, then write that expression in place of ${L} in equation 2.`
        : `Equation 1 already names ${L} as an expression. That expression can take ${L}'s place in equation 2.`,
  });

  if (divisor) {
    push(steps, overBoth(term(divisor, L), exprTokens(m * divisor, O, k * divisor), divisor), givenBottom, {
      focus: "top",
      ghost: "bottom",
      property: "Division Property of Equality",
      ask: `Divide both sides of equation 1 by ${divisor}`,
      explanation: `Divide both sides by ${divisor} to undo multiplying ${L} by ${divisor}. Both sides are written over ${divisor}.`,
      banner: { kicker: "", text: `Solve for ${L} first.` },
    });
    push(steps, solvedTop, givenBottom, {
      focus: "top",
      ghost: "bottom",
      property: "Simplify",
      explanation: `Divide each term by ${divisor}. ${L} = ${plain}.`,
    });
    top = solvedTop;
  } else if (p) {
    push(steps, givenTop, givenBottom, {
      focus: "top",
      ghost: "bottom",
      property: "Subtraction Property of Equality",
      ask: `Subtract ${p} from both sides of equation 1`,
      explanation: `Subtract ${p} from both sides of equation 1.`,
      annotation: addSubNote("subtract", p),
      banner: { kicker: "", text: `Solve for ${L} first.` },
    });
    top = solvedTop;
    push(steps, top, givenBottom, {
      focus: "top",
      ghost: "bottom",
      property: "Simplify",
      explanation: `${p} cancels. ${L} = ${plain}.`,
    });
  }

  const replaced = eq(joinTerms([withGroup(coefL, expr, true), term(coefO, O)]), [num(c)]);
  push(steps, top, replaced, {
    focus: "bottom",
    property: "Substitution",
    ask: `Substitute (${plain}) for ${L} in equation 2`,
    explanation: "",
    banner: {
      kicker: "Replace the variable",
      text: `Substitute ${plain} in place of the variable ${L} in the second equation.`,
    },
  });

  const dCoef = coefL * m;
  const dConst = coefL * k;
  const bare = m === 1 && k === 0;
  if (!bare) {
    const distributed = eq(
      joinTerms([term(dCoef, O), dConst === 0 ? [] : signedConst(dConst), term(coefO, O)]),
      [num(c)],
    );
    push(steps, top, distributed, {
      focus: "bottom",
      ghost: "top",
      property: "Distributive Property",
      ask: "Distribute in equation 2",
      explanation:
        coefL === 1
          ? "The 1 in front means one group. Write the terms inside without the parentheses."
          : coefL === -1
            ? "A minus in front of the parentheses changes the sign of each term inside."
            : `Multiply every term inside the parentheses by ${coefL}.`,
    });
  }

  const n = dCoef + coefO;
  const combined = eq(
    joinTerms([term(n, O), dConst === 0 ? [] : signedConst(dConst)]),
    [num(c)],
  );
  push(steps, top, combined, {
    focus: "bottom",
    ghost: "top",
    property: "Combine like terms",
    ask: "Combine like terms in equation 2",
    explanation: bare
      ? `The parentheses only show the substitution. Combine the ${O} terms: ${signed(dCoef)} and ${signed(coefO)}.`
      : `Combine the ${O} terms: ${signed(dCoef)} and ${signed(coefO)}.`,
  });

  const rhs = c - dConst;
  if (dConst !== 0) {
    const adding = dConst < 0;
    const mag = Math.abs(dConst);
    push(steps, top, combined, {
      focus: "bottom",
      ghost: "top",
      property: adding ? "Addition Property of Equality" : "Subtraction Property of Equality",
      ask: adding ? `Add ${mag} to both sides of equation 2` : `Subtract ${mag} from both sides of equation 2`,
      explanation: adding
        ? `Add ${mag} to both sides to undo subtracting ${mag}.`
        : `Subtract ${mag} from both sides to undo adding ${mag}.`,
      annotation: addSubNote(adding ? "add" : "subtract", mag),
    });
    push(steps, top, eq(varSide(n, O), [num(rhs)]), {
      focus: "bottom",
      ghost: n === 1 ? undefined : "top",
      property: "Simplify",
      explanation: `${mag} cancels.`,
    });
  }

  const knownOther = eq([unk(O)], asSub(ov < 0 ? [op("−"), num(-ov)] : [num(ov)]));
  if (n !== 1) {
    const rightVal = dConst !== 0 ? rhs : c;
    push(steps, top, overBoth(varSide(n, O), [num(rightVal)], n), {
      focus: "bottom",
      ghost: "top",
      property: "Division Property of Equality",
      ask: `Divide both sides of equation 2 by ${n}`,
      explanation: `Divide both sides by ${n} to undo multiplying ${O} by ${n}. Both sides are written over ${n}.`,
    });
    push(steps, top, knownOther, {
      focus: "bottom",
      property: "Simplify",
      explanation: `Divide each term by ${n}. ${O} = ${ov}.`,
    });
  } else if (dConst === 0) {
    push(steps, top, knownOther, {
      focus: "bottom",
      property: "Simplify",
      explanation: `The ${O} term is already alone. ${O} = ${ov}.`,
    });
  }

  push(steps, eq([unk(L)], plugExpr(m, ov, k)), knownOther, {
    focus: "top",
    ghost: k === 0 ? undefined : "bottom",
    bottomCaption: `${O} is known`,
    property: "Substitution",
    ask: `Substitute ${ov} for ${O} in equation 1`,
    explanation: "",
    banner: {
      kicker: `Now find ${L}`,
      text: `Use the equation that already names ${L}. Substitute ${ov} for ${O} into equation 1 and solve for ${L}.`,
    },
  });

  if (k !== 0) {
    push(steps, eq([unk(L)], joinTerms([signedConst(m * ov), signedConst(k)])), knownOther, {
      focus: "top",
      bottomCaption: `${O} is known`,
      property: "Simplify",
      explanation: `${m} · ${ov} = ${m * ov}.`,
    });
  }

  const yLine = eq([unk("y")], [num(spec.y)]);
  const xLine = eq([unk("x")], [num(spec.x)]);
  push(steps, xLine, yLine, {
    focus: "both",
    topCaption: "x",
    bottomCaption: "y",
    property: "Solution",
    explanation: `The solution is the pair x = ${spec.x}, y = ${spec.y}.`,
  });

  push(steps, checkTop(spec, givenTop), checkBottom(spec), {
    focus: "both",
    topCaption: "Check equation 1",
    bottomCaption: "Check equation 2",
    property: "Check",
    explanation: `Substitute x = ${spec.x} and y = ${spec.y} into the original equations. Both equations are true, so the solution set (x,y) is (${spec.x},${spec.y}).`,
    banner: {
      kicker: "Check",
      text: "Put the pair back into the original system.",
    },
  });

  return steps;
}

function varSide(n: number, letter: string): MathToken[] {
  if (n === 1) return [unk(letter)];
  if (n === -1) return [op("−"), unk(letter)];
  return term(n, letter);
}

function plugExpr(m: number, value: number, k: number): MathToken[] {
  const inner: MathToken[] = asSub(
    value < 0 ? [op("("), op("−"), num(-value), op(")")] : [op("("), num(value), op(")")],
  );
  let factor: MathToken[];
  if (m === 1) factor = inner;
  else if (m === -1) factor = [op("−"), ...inner];
  else if (m < 0) factor = [op("−"), coef(-m), ...inner];
  else factor = [coef(m), ...inner];
  return joinTerms([factor, k === 0 ? [] : signedConst(k)]);
}

function checkTop(spec: Spec, givenTop: EquationLine): EquationLine {
  const L = spec.isolated;
  const O = spec.other;
  const lv = L === "x" ? spec.x : spec.y;
  const ov = O === "x" ? spec.x : spec.y;
  if (spec.divisor) {
    return eq(plugTerm(spec.divisor, lv, true), plugExpr(spec.m * spec.divisor, ov, spec.k * spec.divisor));
  }
  if (spec.p) {
    return eq(
      joinTerms([plugTerm(1, lv, true), signedConst(spec.p)]),
      joinTerms([plugTerm(spec.m, ov, true), signedConst(spec.k + spec.p)]),
    );
  }
  void givenTop;
  return eq([num(lv)], plugExpr(spec.m, ov, spec.k));
}

function checkBottom(spec: Spec): EquationLine {
  const lv = spec.isolated === "x" ? spec.x : spec.y;
  const ov = spec.other === "x" ? spec.x : spec.y;
  return eq(joinTerms([plugTerm(spec.coefL, lv, true), plugTerm(spec.coefO, ov, true)]), [num(spec.c)]);
}

function signed(n: number): string {
  return n < 0 ? `−${-n}` : String(n);
}

function overBoth(left: MathToken[], right: MathToken[], divisor: number): EquationLine {
  const den = [num(divisor)];
  return eq([{ type: "frac", num: left, den }], [{ type: "frac", num: right, den: [...den] }]);
}

type EasySpec = {
  letter: "x" | "y";
  other: "x" | "y";
  value: number;
  otherVal: number;
  /** When set, equation 1 is (divisor)·letter = divisor·value. */
  divisor?: number;
  coefKnown: number;
  coefOther: number;
  c: number;
  x: number;
  y: number;
};

function rollEasy(negatives: boolean): EasySpec | undefined {
  const letter = pick(["x", "y"] as const);
  const other = letter === "x" ? "y" : "x";
  const value = negatives && Math.random() < 0.3 ? -randInt(1, 6) : randInt(1, 8);
  const divisor = Math.random() < 0.5 ? pick([2, 3, 4, 5]) : undefined;
  const coefKnown = pick([1, 1, 2, 3]);
  const coefOther = pick([1, 2, 3]);
  const otherVal = negatives && Math.random() < 0.25 ? -randInt(1, 5) : randInt(0, 8);
  const c = coefKnown * value + coefOther * otherVal;
  if (Math.abs(c) > 40) return undefined;
  if (divisor && Math.abs(divisor * value) > 36) return undefined;
  const x = letter === "x" ? value : otherVal;
  const y = letter === "y" ? value : otherVal;
  return { letter, other, value, otherVal, divisor, coefKnown, coefOther, c, x, y };
}

function finishEasy(spec: EasySpec): SystemProblem {
  return {
    method: "substitution",
    steps: solveEasy(spec),
    solution: { x: spec.x, y: spec.y },
    structureLabel: spec.divisor ? "Easy · one step to a number" : "Easy · a letter is a number",
    prompt: "Solve the system by substitution.",
    holds: (x, y) => {
      const known = spec.letter === "x" ? x : y;
      const other = spec.letter === "x" ? y : x;
      const first = spec.divisor ? spec.divisor * known === spec.divisor * spec.value : known === spec.value;
      return first && spec.coefKnown * known + spec.coefOther * other === spec.c;
    },
  };
}

function solveEasy(spec: EasySpec): SystemStep[] {
  seq = 0;
  const { letter: L, other: O, value, otherVal, divisor, coefKnown, coefOther, c } = spec;
  const knownTop = eq([unk(L)], asSub(value < 0 ? [op("−"), num(-value)] : [num(value)]));
  const givenTop = divisor ? eq(term(divisor, L), [num(divisor * value)]) : knownTop;
  const givenBottom = eq(joinTerms([term(coefKnown, L), term(coefOther, O)]), [num(c)]);
  const steps: SystemStep[] = [];

  push(steps, givenTop, givenBottom, {
    focus: "both",
    property: "Given system",
    explanation: divisor
      ? `Equation 1 is one step from a number. Find ${L}, then write that number in place of ${L} in equation 2.`
      : `Equation 1 already says ${L} is ${value}. A number can take ${L}'s place in equation 2.`,
  });

  let top = givenTop;
  if (divisor) {
    push(steps, overBoth(term(divisor, L), [num(divisor * value)], divisor), givenBottom, {
      focus: "top",
      ghost: "bottom",
      property: "Division Property of Equality",
      ask: `Divide both sides of equation 1 by ${divisor}`,
      explanation: `Divide both sides by ${divisor} to undo multiplying ${L} by ${divisor}. Both sides are written over ${divisor}.`,
      banner: { kicker: "", text: `Solve for ${L} first.` },
    });
    push(steps, knownTop, givenBottom, {
      focus: "top",
      ghost: "bottom",
      property: "Simplify",
      explanation: `Divide each term by ${divisor}. ${L} = ${value}.`,
    });
    top = knownTop;
  }

  const replacedLeft =
    coefKnown === 1
      ? joinTerms([asSub(signedConst(value)), term(coefOther, O)])
      : joinTerms([plugTerm(coefKnown, value, true), term(coefOther, O)]);
  push(steps, top, eq(replacedLeft, [num(c)]), {
    focus: "bottom",
    property: "Substitution",
    ask: `Substitute ${value} for ${L} in equation 2`,
    explanation: "",
    banner: {
      kicker: "Replace the variable",
      text: `Substitute ${value} in place of the variable ${L} in the second equation.`,
    },
  });

  const product = coefKnown * value;
  let bottom = eq(replacedLeft, [num(c)]);
  if (coefKnown !== 1) {
    bottom = eq(joinTerms([signedConst(product), term(coefOther, O)]), [num(c)]);
    push(steps, top, bottom, {
      focus: "bottom",
      ghost: "top",
      property: "Simplify",
      explanation: `${coefKnown} · ${value} = ${product}.`,
    });
  }

  const rhs = c - product;
  if (product !== 0) {
    const adding = product < 0;
    const mag = Math.abs(product);
    push(steps, top, bottom, {
      focus: "bottom",
      ghost: "top",
      property: adding ? "Addition Property of Equality" : "Subtraction Property of Equality",
      ask: adding ? `Add ${mag} to both sides of equation 2` : `Subtract ${mag} from both sides of equation 2`,
      explanation: adding
        ? `Add ${mag} to both sides to undo subtracting ${mag}.`
        : `Subtract ${mag} from both sides to undo adding ${mag}.`,
      annotation: addSubNote(adding ? "add" : "subtract", mag),
    });
    bottom = eq(varSide(coefOther, O), [num(rhs)]);
    push(steps, top, bottom, {
      focus: "bottom",
      ghost: coefOther === 1 ? undefined : "top",
      property: "Simplify",
      explanation: `${mag} cancels.`,
    });
  }

  const knownOther = eq([unk(O)], [num(otherVal)]);
  if (coefOther !== 1) {
    push(steps, top, overBoth(varSide(coefOther, O), [num(rhs)], coefOther), {
      focus: "bottom",
      ghost: "top",
      property: "Division Property of Equality",
      ask: `Divide both sides of equation 2 by ${coefOther}`,
      explanation: `Divide both sides by ${coefOther} to undo multiplying ${O} by ${coefOther}. Both sides are written over ${coefOther}.`,
    });
    push(steps, top, knownOther, {
      focus: "bottom",
      property: "Simplify",
      explanation: `Divide each term by ${coefOther}. ${O} = ${otherVal}.`,
    });
  } else if (product === 0) {
    push(steps, top, knownOther, {
      focus: "bottom",
      property: "Simplify",
      explanation: `${O} is already alone. ${O} = ${otherVal}.`,
    });
  }

  push(steps, eq([unk("x")], [num(spec.x)]), eq([unk("y")], [num(spec.y)]), {
    focus: "both",
    topCaption: "x",
    bottomCaption: "y",
    property: "Solution",
    explanation: `The solution is the pair x = ${spec.x}, y = ${spec.y}.`,
  });

  const check1 = divisor
    ? eq(plugTerm(divisor, value, true), [num(divisor * value)])
    : eq([unk(L)], asSub(value < 0 ? [op("−"), num(-value)] : [num(value)]));
  const check2 = eq(
    joinTerms([plugTerm(coefKnown, value, true), plugTerm(coefOther, otherVal, true)]),
    [num(c)],
  );
  push(steps, check1, check2, {
    focus: "both",
    topCaption: "Check equation 1",
    bottomCaption: "Check equation 2",
    property: "Check",
    explanation: `Substitute x = ${spec.x} and y = ${spec.y} into the original equations. Both equations are true, so the solution set (x,y) is (${spec.x},${spec.y}).`,
    banner: { kicker: "Check", text: "Put the pair back into the original system." },
  });

  return steps;
}
