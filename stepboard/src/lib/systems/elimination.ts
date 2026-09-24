import { pick, randInt } from "../algebra/random.ts";
import type { EquationLine, MathToken } from "../algebra/types.ts";
import {
  addSubNote,
  eq,
  group,
  joinTerms,
  mulNote,
  num,
  op,
  plugTerm,
  signedConst,
  term,
  unk,
} from "./expr.ts";
import type { ElimStyle, SystemProblem, SystemSettings, SystemStep } from "./types.ts";

type Style = Exclude<ElimStyle, "mix">;

type Spec = {
  style: Style;
  cancel: "x" | "y";
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  x: number;
  y: number;
  mult: number;
};

let seq = 0;
function nid(): string {
  seq += 1;
  return `E${seq}`;
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
    topCaption: extra.topCaption ?? "Equation 1",
    bottomCaption: extra.bottomCaption ?? "Equation 2",
    focus: extra.focus,
    explanation: extra.explanation,
    property: extra.property,
    ask: extra.ask,
    banner: extra.banner,
    annotation: extra.annotation,
  });
}

export function generateElimination(settings: SystemSettings): SystemProblem {
  const want: Style =
    settings.elimStyle === "mix" ? pick(["add", "subtract", "scale"]) : settings.elimStyle;
  for (let i = 0; i < 100; i++) {
    const spec = roll(want, settings.negatives);
    if (!spec) continue;
    const how =
      spec.style === "add"
        ? "add"
        : spec.style === "subtract"
          ? "subtract"
          : `multiply by ${spec.mult}, then add`;
    return {
      method: "elimination",
      steps: solve(spec),
      solution: { x: spec.x, y: spec.y },
      structureLabel: `Elimination · ${how} · ${spec.cancel} cancels`,
      prompt: "Solve the system by elimination.",
      holds: (x, y) =>
        spec.a * x + spec.b * y === spec.c && spec.d * x + spec.e * y === spec.f,
    };
  }
  throw new Error("Could not build an elimination system.");
}

function roll(style: Style, negatives: boolean): Spec | undefined {
  const cancel = pick(["x", "y"] as const);
  const x = negatives && Math.random() < 0.3 ? -randInt(1, 5) : randInt(0, 6);
  const y = negatives && Math.random() < 0.3 ? -randInt(1, 5) : randInt(0, 6);
  let keep1 = randInt(1, 5);
  let keep2 = randInt(1, 6);
  let mag = randInt(1, 4);
  let mult = 1;
  let mag2 = mag;

  if (style === "scale") {
    mult = pick([2, 3]);
    mag = randInt(1, 3);
    mag2 = -mult * mag;
  } else if (style === "add") {
    mag2 = -mag;
  } else {
    mag2 = mag;
    if (keep1 <= keep2) return undefined;
  }

  const a = cancel === "y" ? keep1 : mag;
  const b = cancel === "y" ? mag : keep1;
  const d = cancel === "y" ? keep2 : mag2;
  const e = cancel === "y" ? mag2 : keep2;
  const c = a * x + b * y;
  const f = d * x + e * y;
  if (Math.abs(c) > 42 || Math.abs(f) > 56) return undefined;

  const a1 = style === "scale" ? a * mult : a;
  const b1 = style === "scale" ? b * mult : b;
  const n =
    cancel === "y"
      ? (style === "subtract" ? a1 - d : a1 + d)
      : (style === "subtract" ? b1 - e : b1 + e);
  if (n <= 0 || n > 14) return undefined;
  return { style, cancel, a, b, c, d, e, f, x, y, mult };
}

function solve(spec: Spec): SystemStep[] {
  seq = 0;
  const steps: SystemStep[] = [];
  const cancel = spec.cancel;
  const other = cancel === "x" ? "y" : "x";
  let top = standard(spec.a, spec.b, spec.c);
  let bottom = standard(spec.d, spec.e, spec.f);
  const saved = standard(spec.a, spec.b, spec.c);

  push(steps, top, bottom, {
    focus: "both",
    property: "Given system",
    explanation: intro(spec),
  });

  if (spec.style === "scale") {
    top = standard(spec.a * spec.mult, spec.b * spec.mult, spec.c * spec.mult);
    push(steps, top, bottom, {
      focus: "top",
      property: "Multiplication Property of Equality",
      ask: `Multiply equation 1 by ${spec.mult}`,
      explanation: `Multiply every term of equation 1 by ${spec.mult}. The ${cancel} coefficients are now opposites.`,
      annotation: mulNote(spec.mult),
      banner: {
        kicker: "Match a column",
        text: `The ${cancel} coefficients do not cancel yet.`,
      },
    });
  }

  const a1 = spec.style === "scale" ? spec.a * spec.mult : spec.a;
  const b1 = spec.style === "scale" ? spec.b * spec.mult : spec.b;
  const c1 = spec.style === "scale" ? spec.c * spec.mult : spec.c;
  const sub = spec.style === "subtract";
  const xCoef = sub ? a1 - spec.d : a1 + spec.d;
  const yCoef = sub ? b1 - spec.e : b1 + spec.e;
  const rhs = sub ? c1 - spec.f : c1 + spec.f;
  const n = cancel === "y" ? xCoef : yCoef;
  const known = other === "x" ? spec.x : spec.y;

    const second = sub ? -spec.f : spec.f;
    const rawRight =
      second === 0 ? [num(c1), op("+"), num(0)] : joinTerms([[num(c1)], signedConst(second)]);
    const summed = eq(
      joinTerms([
        group(joinTerms([term(a1, "x"), sub ? term(-spec.d, "x") : term(spec.d, "x")])),
        group(joinTerms([term(b1, "y"), sub ? term(-spec.e, "y") : term(spec.e, "y")])),
      ]),
      rawRight,
    );

  push(steps, summed, saved, {
    focus: "top",
    topCaption: sub ? "Equation 1 − equation 2" : "Sum",
    bottomCaption: "Equation 1, saved",
    property: sub ? "Subtraction Property of Equality" : "Addition Property of Equality",
    ask: sub ? "Subtract the equations" : "Add the equations",
    explanation: sub
      ? `Subtract equation 2 from equation 1. The ${cancel} terms match, so that column is 0.`
      : `Add the left sides and the right sides. The ${cancel} terms are opposites, so that column is 0.`,
    banner: {
      kicker: sub ? "Subtract" : "Add",
      text: `One column drops out. Equation 1 stays on the board for the other letter.`,
    },
  });

  const simplified = eq(varSide(n, other), [num(rhs)]);
  push(steps, simplified, saved, {
    focus: "top",
    topCaption: sub ? "Difference" : "Sum",
    bottomCaption: "Equation 1, saved",
    property: "Simplify",
    explanation: `The ${cancel} column is 0. ${coefPhrase(n, other)} = ${rhs}.`,
  });

  const knownLine = eq([unk(other)], [num(known)]);
  if (n !== 1) {
    push(steps, knownLine, saved, {
      focus: "top",
      topCaption: sub ? "Difference" : "Sum",
      bottomCaption: "Equation 1, saved",
      property: "Division Property of Equality",
      ask: `Divide both sides by ${n}`,
      explanation: `Divide both sides by ${n}. ${other} = ${known}.`,
    });
  }

  backSub(steps, spec, other, known, knownLine);
  finish(steps, spec);
  return steps;
}

function backSub(
  steps: SystemStep[],
  spec: Spec,
  knownLetter: "x" | "y",
  known: number,
  knownLine: EquationLine,
) {
  const missing = knownLetter === "x" ? "y" : "x";
  const coefMissing = missing === "x" ? spec.a : spec.b;
  const coefKnown = knownLetter === "x" ? spec.a : spec.b;
  const product = coefKnown * known;

  const pluggedLeft =
    missing === "y"
      ? joinTerms([plugTerm(spec.a, spec.x), term(spec.b, "y")])
      : joinTerms([term(spec.a, "x"), plugTerm(spec.b, spec.y)]);

  push(steps, knownLine, eq(pluggedLeft, [num(spec.c)]), {
    focus: "bottom",
    topCaption: `${knownLetter} is known`,
    bottomCaption: "Equation 1",
    property: "Substitution",
    ask: `Replace ${knownLetter} with ${known}`,
    explanation: `${knownLetter} is ${known}. Write that number into equation 1. This replacement is a number, not a new expression.`,
    banner: {
      kicker: `Now find ${missing}`,
      text: "Use the saved equation.",
    },
  });

  const afterLeft =
    missing === "y"
      ? joinTerms([signedConst(product), term(spec.b, "y")])
      : joinTerms([term(spec.a, "x"), signedConst(product)]);
  push(steps, knownLine, eq(afterLeft, [num(spec.c)]), {
    focus: "bottom",
    topCaption: `${knownLetter} is known`,
    bottomCaption: "Equation 1",
    property: "Simplify",
    explanation: `${coefKnown} · ${known} = ${product}.`,
  });

  const rhs = spec.c - product;
  if (product !== 0) {
    const adding = product < 0;
    const mag = Math.abs(product);
    push(steps, knownLine, eq(varSide(coefMissing, missing), [num(rhs)]), {
      focus: "bottom",
      topCaption: `${knownLetter} is known`,
      bottomCaption: "Equation 1",
      property: adding ? "Addition Property of Equality" : "Subtraction Property of Equality",
      ask: adding ? `Add ${mag} to both sides` : `Subtract ${mag} from both sides`,
      explanation: adding ? `Add ${mag} to both sides.` : `Subtract ${mag} from both sides.`,
      annotation: addSubNote(adding ? "add" : "subtract", mag),
    });
  }

  if (coefMissing !== 1) {
    const found = missing === "x" ? spec.x : spec.y;
    push(steps, knownLine, eq([unk(missing)], [num(found)]), {
      focus: "bottom",
      topCaption: `${knownLetter} is known`,
      bottomCaption: "Equation 1",
      property: "Division Property of Equality",
      ask: `Divide both sides by ${coefMissing}`,
      explanation: `Divide both sides by ${coefMissing}. ${missing} = ${found}.`,
    });
  }
}

function finish(steps: SystemStep[], spec: Spec) {
  push(steps, eq([unk("x")], [num(spec.x)]), eq([unk("y")], [num(spec.y)]), {
    focus: "both",
    topCaption: "x",
    bottomCaption: "y",
    property: "Solution",
    explanation: `The solution is the pair x = ${spec.x}, y = ${spec.y}.`,
  });
  push(
    steps,
    eq(joinTerms([plugTerm(spec.a, spec.x), plugTerm(spec.b, spec.y)]), [num(spec.c)]),
    eq(joinTerms([plugTerm(spec.d, spec.x), plugTerm(spec.e, spec.y)]), [num(spec.f)]),
    {
      focus: "both",
      topCaption: "Check equation 1",
      bottomCaption: "Check equation 2",
      property: "Check",
      explanation: `Substitute x = ${spec.x} and y = ${spec.y} into the original equations. Both equations are true, so the solution set (x,y) is (${spec.x},${spec.y}).`,
      banner: { kicker: "Check", text: "Put the pair back into the original system." },
    },
  );
}

function intro(spec: Spec): string {
  if (spec.style === "scale") {
    return `No column cancels yet. Multiply equation 1 by ${spec.mult} so the ${spec.cancel} terms become opposites, then add.`;
  }
  if (spec.style === "subtract") {
    return `The ${spec.cancel} terms match. Subtract the equations and that column drops out.`;
  }
  return `The ${spec.cancel} terms are opposites. Add the equations and that column drops out.`;
}

function standard(a: number, b: number, c: number): EquationLine {
  return eq(joinTerms([term(a, "x"), term(b, "y")]), [num(c)]);
}

function varSide(n: number, letter: string): MathToken[] {
  if (n === 1) return [unk(letter)];
  if (n === -1) return [op("−"), unk(letter)];
  return term(n, letter);
}

function coefPhrase(n: number, letter: string): string {
  if (n === 1) return letter;
  return `${n}${letter}`;
}
