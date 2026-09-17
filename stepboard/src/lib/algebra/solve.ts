import {
  divideAllTermsLine,
  divideGroupLine,
  divideLine,
  evaluateSides,
  lineFromLinear,
  lineFromPresentation,
  operationPhrase,
  substitutionLine,
} from "./format.ts";
import type {
  EquationLine,
  LinearEq,
  PracticeChoice,
  Relation,
  SolveStep,
} from "./types.ts";
import { flipRelation, isInequality, relationOf } from "./types.ts";

function maybeReverse(eq: LinearEq, factor: number): boolean {
  if (isInequality(relationOf(eq)) && factor < 0) {
    eq.relation = flipRelation(relationOf(eq));
    return true;
  }
  return false;
}

function relPhrase(rel: Relation): string {
  switch (rel) {
    case "<":
      return "less than";
    case ">":
      return "greater than";
    case "≤":
      return "less than or equal to";
    case "≥":
      return "greater than or equal to";
    default:
      return "equal to";
  }
}

function testPoint(solution: number, rel: Relation): number {
  if (rel === ">" || rel === "≥") return solution + 1;
  if (rel === "<" || rel === "≤") return solution - 1;
  return solution;
}

function holds(left: number, right: number, rel: Relation): boolean {
  switch (rel) {
    case "<":
      return left < right;
    case ">":
      return left > right;
    case "≤":
      return left <= right;
    case "≥":
      return left >= right;
    default:
      return left === right;
  }
}

function propertyFor(
  kind: "add" | "subtract" | "multiply" | "divide",
  ineq: boolean,
): string {
  const of = ineq ? "Inequality" : "Equality";
  switch (kind) {
    case "add":
      return `Addition Property of ${of}`;
    case "subtract":
      return `Subtraction Property of ${of}`;
    case "multiply":
      return `Multiplication Property of ${of}`;
    case "divide":
      return `Division Property of ${of}`;
  }
}

let stepSeq = 0;
function nid(): string {
  stepSeq += 1;
  return `s${stepSeq}`;
}

export function solveEquation(
  start: LinearEq,
  solution: number,
  strategy: "distribute" | "divide-group" | "divide-all-terms" = "distribute",
): { steps: SolveStep[] } {
  const eq: LinearEq = { ...start, presentation: { ...start.presentation } };
  const steps: SolveStep[] = [];
  const v = eq.variable;

  const ineq = isInequality(relationOf(eq));
  const noun = ineq ? "inequality" : "equation";

  steps.push({
    id: nid(),
    line: lineFromPresentation(eq.presentation, eq),
    explanation: originalExplanation(eq),
    property: ineq ? "Given inequality" : "Given equation",
    isOriginal: true,
  });

  if (eq.presentation.form === "distribute") {
    const p = eq.presentation;
    if (
      strategy === "divide-group" &&
      p.outer !== 0 &&
      eq.rightA === 0 &&
      eq.rightB % p.outer === 0
    ) {
      const reverse = maybeReverse(eq, p.outer);
      steps.push({
        id: nid(),
        line: divideGroupLine(eq),
        explanation: reverse
          ? `${operationPhrase("divide", p.outer)} because ${p.outer}(${v} ${p.innerB < 0 ? "−" : "+"} ${Math.abs(p.innerB)}) is the only term on that side. Dividing by a negative reverses the inequality.`
          : `${operationPhrase("divide", p.outer)} because ${p.outer}(${v} ${p.innerB < 0 ? "−" : "+"} ${Math.abs(p.innerB)}) is the only term on that side. There is nothing else to divide.`,
        property: propertyFor("divide", isInequality(relationOf(eq))),
        operation: { kind: "divide", value: p.outer, reverse },
      });
      Object.assign(eq, {
        leftA: 1,
        leftB: p.innerB,
        rightA: 0,
        rightB: eq.rightB / p.outer,
        presentation: { form: "standard" as const },
      });
      steps.push({
        id: nid(),
        line: lineFromLinear(eq),
        explanation: reverse
          ? `The ${p.outer}s cancel and the inequality sign flips.`
          : `The ${p.outer}s cancel. The grouping is gone, and a simpler ${noun} remains.`,
        property: "Simplify",
      });
    } else {
      const expanded: LinearEq = { ...eq, presentation: { form: "standard" } };
      steps.push({
        id: nid(),
        line: lineFromLinear(expanded),
        explanation: `Distribute ${p.outer} across the parentheses: ${p.outer}(${v} ${p.innerB < 0 ? "−" : "+"} ${Math.abs(p.innerB)}) becomes ${term(p.outer, v)} ${p.outer * p.innerB < 0 ? "−" : "+"} ${Math.abs(p.outer * p.innerB)}.`,
        property: "Distributive Property",
        operation: { kind: "distribute", value: p.outer },
      });
      Object.assign(eq, expanded);
    }
  }

  if (eq.presentation.form === "combine") {
    const p = eq.presentation;
    const combined = p.b1 + p.b2;
    const next: LinearEq = { ...eq, presentation: { form: "standard" } };
    steps.push({
      id: nid(),
      line: lineFromLinear(next),
      explanation: `Combine the constants ${fmtSigned(p.b1)} and ${fmtSigned(p.b2)}: they make ${fmtSigned(combined)}.`,
      property: "Combine like terms",
      operation: { kind: "combine" },
    });
    Object.assign(eq, next);
  }

  if (eq.presentation.form === "quotient") {
    const p = eq.presentation;
    const reverse = maybeReverse(eq, p.divisor);
    const next: LinearEq = { ...eq, presentation: { form: "standard" } };
    steps.push({
      id: nid(),
      line: { ...lineFromPresentation(p, { ...eq, relation: start.relation }), rel: relationOf(eq) },
      annotation: mulAnnotation(p.divisor),
      explanation: reverse
        ? `${operationPhrase("multiply", p.divisor)} to undo the division. Multiplying by a negative reverses the inequality. The fraction stays on the board until the ${p.divisor}s cancel.`
        : `${operationPhrase("multiply", p.divisor)} to undo the division. The fraction stays on the board until the ${p.divisor}s cancel.`,
      property: propertyFor("multiply", isInequality(relationOf(eq))),
      operation: { kind: "multiply", value: p.divisor, reverse },
    });
    Object.assign(eq, next);
    steps.push({
      id: nid(),
      line: lineFromLinear(eq),
      explanation: reverse
        ? `The ${p.divisor}s cancel and the inequality sign flips.`
        : `The ${p.divisor}s cancel. What remains is a simpler ${noun}.`,
      property: "Simplify",
    });
  }

  if (eq.rightA !== 0) {
    const move = eq.rightA;
    const current = lineFromLinear(eq);
    const next: LinearEq = { ...eq, leftA: eq.leftA - move, rightA: 0 };
    const kind = move > 0 ? "subtract" : "add";
    const mag = Math.abs(move);
    steps.push({
      id: nid(),
      line: current,
      annotation: addSubAnnotation(kind, mag, v),
      explanation: `${operationPhrase(kind, mag)} on the ${v} terms so the variable lives on one side. ${term(move, v)} on the right cancels.`,
      property: propertyFor(kind, ineq),
      operation: { kind, value: mag, variable: v },
    });
    Object.assign(eq, next);
    steps.push({
      id: nid(),
      line: lineFromLinear(eq),
      explanation: `Like terms cancel. The variable now sits on one side.`,
      property: "Simplify",
    });
  }

  const allDivisor =
    strategy === "divide-all-terms" ? commonTermDivisor(eq) : null;
  if (allDivisor != null) {
    const d = allDivisor;
    const reverse = maybeReverse(eq, d);
    steps.push({
      id: nid(),
      line: divideAllTermsLine(eq, d),
      explanation: reverse
        ? `${operationPhrase("divide", d)} is acceptable here because every term stays an integer. Dividing by a negative reverses the inequality.`
        : `${operationPhrase("divide", d)} is acceptable here because every term stays an integer. For most problems, undo the constant first; if you do divide, every term must be divided by ${d < 0 ? `−${Math.abs(d)}` : d}.`,
      property: propertyFor("divide", isInequality(relationOf(eq))),
      operation: { kind: "divide", value: d, reverse },
    });
    Object.assign(eq, {
      leftA: eq.leftA / d,
      leftB: eq.leftB / d,
      rightB: eq.rightB / d,
    });
    steps.push({
      id: nid(),
      line: lineFromLinear(eq),
      explanation: reverse
        ? `Each term simplifies and the inequality sign flips.`
        : `Each term simplifies. What remains is a simpler ${noun}.`,
      property: "Simplify",
    });
  }

  if (eq.leftB !== 0) {
    const move = eq.leftB;
    const current = lineFromLinear(eq);
    const next: LinearEq = {
      ...eq,
      leftB: 0,
      rightB: eq.rightB - move,
    };
    const kind = move > 0 ? "subtract" : "add";
    const mag = Math.abs(move);
    steps.push({
      id: nid(),
      line: current,
      annotation: addSubAnnotation(kind, mag),
      explanation: `${operationPhrase(kind, mag)} to undo ${move > 0 ? "adding" : "subtracting"} ${mag} on the left. Inverse operations peel the ${noun} toward ${v}.`,
      property: propertyFor(kind, ineq),
      operation: { kind, value: mag },
    });
    Object.assign(eq, next);
    steps.push({
      id: nid(),
      line: lineFromLinear(eq),
      explanation: `The constants cancel. What remains is a simpler ${noun}.`,
      property: "Simplify",
    });
  }

  if (eq.leftA !== 1 && eq.leftA !== 0) {
    const divisor = eq.leftA;
    const reverse = maybeReverse(eq, divisor);
    const nextRight = eq.rightB / divisor;
    const next: LinearEq = {
      ...eq,
      leftA: 1,
      rightB: Number.isInteger(nextRight) ? nextRight : Math.round(nextRight),
    };
    steps.push({
      id: nid(),
      line: { ...divideLine(eq.leftA, eq.rightB, v, divisor), rel: relationOf(eq) },
      explanation: reverse
        ? `${operationPhrase("divide", divisor)} to undo multiplying ${v} by ${divisor}. Dividing by a negative reverses the inequality.`
        : `${operationPhrase("divide", divisor)} to undo multiplying ${v} by ${divisor}. Both sides are written over ${divisor < 0 ? `−${Math.abs(divisor)}` : divisor} so the coefficient cancels.`,
      property: propertyFor("divide", isInequality(relationOf(eq))),
      operation: { kind: "divide", value: divisor, reverse },
    });
    Object.assign(eq, next);
  }

  const finalRel = relationOf(eq);
  const solutionText = ineq
    ? `${v} is isolated. The solution is ${v} ${finalRel} ${solution}. Every number ${relPhrase(finalRel)} ${solution} works.`
    : `${v} is isolated. The solution is ${v} = ${solution}.`;

  const last = steps[steps.length - 1]!;
  if (isIsolatedVarLine(last.line, v)) {
    last.isSolution = true;
    last.property = "Solution";
    last.explanation = solutionText;
    last.line = { ...last.line, rel: finalRel };
  } else {
    steps.push({
      id: nid(),
      line: {
        left: [{ type: "var", letter: v }],
        right: [{ type: "const", value: solution }],
        rel: finalRel,
      },
      explanation: solutionText,
      property: "Solution",
      isSolution: true,
    });
  }

  if (ineq) {
    const sample = testPoint(solution, finalRel);
    const originalRel = relationOf(start);
    const checkLine = substitutionLine(start, sample);
    steps.push({
      id: nid(),
      line: { ...checkLine, rel: originalRel },
      explanation: `A test number from the solution set: try ${v} = ${sample}. Substitute into the original inequality.`,
      property: "Test a point · check",
      operation: { kind: "check" },
      isCheck: true,
    });
    const sampleValues = evaluateSides(start, sample);
    const ok = holds(sampleValues.left, sampleValues.right, originalRel);
    steps.push({
      id: nid(),
      line: {
        left: [{ type: "const", value: sampleValues.left }],
        right: [{ type: "const", value: sampleValues.right }],
        rel: originalRel,
      },
      explanation: ok
        ? `${sampleValues.left} ${originalRel} ${sampleValues.right} is true, so ${sample} belongs in the solution.`
        : "Check arithmetic — the test number should make the inequality true.",
      property: "True statement",
      isCheck: true,
    });
  } else {
    steps.push({
      id: nid(),
      line: substitutionLine(start, solution),
      explanation: `Substitute ${v} = ${solution} back into the original equation. Both sides match, so the solution checks.`,
      property: "Substitution · check",
      operation: { kind: "check" },
      isCheck: true,
    });

    const values = evaluateSides(start, solution);
    steps.push({
      id: nid(),
      line: {
        left: [{ type: "const", value: values.left }],
        right: [{ type: "const", value: values.right }],
      },
      explanation:
        values.left === values.right
          ? `${values.left} = ${values.right}. The balance holds.`
          : "Check arithmetic — sides should match.",
      property: "True statement",
      isCheck: true,
    });
  }

  return { steps };
}

export function solveByDividingGroup(start: LinearEq, solution: number) {
  return solveEquation(start, solution, "divide-group");
}

export function solveByDividingAllTerms(start: LinearEq, solution: number) {
  return solveEquation(start, solution, "divide-all-terms");
}

/** Coefficient that divides every term on a two-term (ax + b = c) equation. */
export function commonTermDivisor(eq: LinearEq): number | null {
  if (eq.presentation.form === "distribute") return null;
  if (eq.presentation.form === "quotient") return null;
  if (eq.rightA !== 0) return null;
  const d = eq.leftA;
  if (d === 0 || d === 1 || d === -1) return null;
  if (eq.leftB === 0) return null;
  if (eq.leftB % d !== 0 || eq.rightB % d !== 0) return null;
  return d;
}

export function practiceChoices(
  step: SolveStep,
  all: SolveStep[],
  eq?: LinearEq,
): PracticeChoice[] {
  const next = nextActionable(step, all);
  if (!next?.operation || next.isCheck) return [];

  const correct: PracticeChoice = {
    id: "ok",
    label: labelFor(
      next.operation.kind,
      next.operation.value,
      next.operation.variable,
      next.operation.reverse,
    ),
    kind: next.operation.kind,
    value: next.operation.value,
    variable: next.operation.variable,
    correct: true,
    reverse: next.operation.reverse,
  };

  const distractors: PracticeChoice[] = [];
  const used = new Set<string>([correct.label]);

  const push = (c: PracticeChoice) => {
    if (used.has(c.label)) return;
    used.add(c.label);
    distractors.push(c);
  };

  if (next.operation.kind === "subtract" && next.operation.value != null) {
    const v = next.operation.variable;
    push({
      id: "d1",
      label: labelFor("add", next.operation.value, v),
      kind: "add",
      value: next.operation.value,
      variable: v,
      correct: false,
      whyWrong: v
        ? `Adding that term would stack more of the variable on both sides. Subtract so the ${v} terms cancel.`
        : "Adding would move farther from zero on that term. Use the inverse of addition — subtraction.",
    });
    if (v) {
      push({
        id: "d-drop-var",
        label: labelFor("subtract", next.operation.value),
        kind: "subtract",
        value: next.operation.value,
        correct: false,
        whyWrong: `That subtracts a constant. Subtract ${termLabel(next.operation.value, v)} so the variable terms cancel.`,
      });
    } else {
      const d = eq ? commonTermDivisor(eq) : null;
      if (d != null) {
        push({
          id: "ok-div-all",
          label: labelFor("divide", d),
          kind: "divide",
          value: d,
          correct: true,
          apply: "divide-all-terms",
        });
      }
      if (d == null || Math.abs(next.operation.value) !== Math.abs(d)) {
        push({
          id: "d2",
          label: labelFor("divide", next.operation.value),
          kind: "divide",
          value: next.operation.value,
          correct: false,
          whyWrong:
            "If you divide, every term must be divided — not only the variable term. That move would not keep whole numbers on every term, so undo the constant first.",
        });
      }
    }
  }
  if (next.operation.kind === "add" && next.operation.value != null) {
    const v = next.operation.variable;
    push({
      id: "d1",
      label: labelFor("subtract", next.operation.value, v),
      kind: "subtract",
      value: next.operation.value,
      variable: v,
      correct: false,
      whyWrong: v
        ? "The variable term on the right is already negative. Add its opposite so those terms cancel."
        : "The constant is already negative. Add its opposite so the constant cancels.",
    });
    if (v) {
      push({
        id: "d-drop-var",
        label: labelFor("add", next.operation.value),
        kind: "add",
        value: next.operation.value,
        correct: false,
        whyWrong: `That adds a constant. Add ${termLabel(next.operation.value, v)} so the variable terms cancel.`,
      });
    } else {
      const d = eq ? commonTermDivisor(eq) : null;
      if (d != null) {
        push({
          id: "ok-div-all",
          label: labelFor("divide", d),
          kind: "divide",
          value: d,
          correct: true,
          apply: "divide-all-terms",
        });
      }
      if (d == null || Math.abs(next.operation.value || 2) !== Math.abs(d)) {
        push({
          id: "d2",
          label: labelFor("divide", next.operation.value || 2),
          kind: "divide",
          value: next.operation.value,
          correct: false,
          whyWrong:
            "If you divide, every term must be divided — not only the variable term. Undo the constant first so you stay with integers.",
        });
      }
    }
  }
  if (next.operation.kind === "divide" && next.operation.value != null) {
    const mag = Math.abs(next.operation.value) || 2;
    if (next.operation.reverse) {
      push({
        id: "d-no-flip",
        label: labelFor("divide", next.operation.value),
        kind: "divide",
        value: next.operation.value,
        correct: false,
        whyWrong:
          "You divided, but the coefficient is negative. Dividing by a negative reverses the inequality.",
      });
    }
    push({
      id: "d1",
      label: labelFor("subtract", mag),
      kind: "subtract",
      value: mag,
      correct: false,
      whyWrong:
        "The variable term is already alone. Subtracting would re-introduce a constant you just removed.",
    });
    push({
      id: "d2",
      label: labelFor("multiply", mag),
      kind: "multiply",
      value: mag,
      correct: false,
      whyWrong:
        "Multiplication is the inverse of division. Here the variable is multiplied, so divide.",
    });
  }
  if (next.operation.kind === "multiply" && next.operation.value != null) {
    const mag = next.operation.value;
    push({
      id: "d1",
      label: labelFor("divide", mag),
      kind: "divide",
      value: mag,
      correct: false,
      whyWrong:
        "The variable is in a quotient. Multiply to cancel the denominator.",
    });
    push({
      id: "d2",
      label: labelFor("subtract", mag),
      kind: "subtract",
      value: mag,
      correct: false,
      whyWrong: "A constant subtraction does not undo a fraction bar.",
    });
  }
  if (next.operation.kind === "distribute") {
    const outer =
      next.operation.value ??
      (eq?.presentation.form === "distribute" ? eq.presentation.outer : 2);
    const rhs = eq?.rightB;
    const even =
      outer !== 0 &&
      eq?.rightA === 0 &&
      rhs != null &&
      Number.isInteger(rhs / outer) &&
      Math.abs(outer) > 1;

    if (even) {
      push({
        id: "ok-div",
        label: labelFor("divide", outer),
        kind: "divide",
        value: outer,
        correct: true,
        apply: "divide-group",
      });
    } else {
      push({
        id: "d1",
        label: labelFor("divide", outer || 2),
        kind: "divide",
        value: outer || 2,
        correct: false,
        whyWrong:
          rhs != null && outer && rhs % outer !== 0
            ? `${outer} does not divide ${rhs} evenly. Distribute so you stay with integers.`
            : "Distribute to expand the grouping, then isolate the variable.",
      });
    }
    push({
      id: "d2",
      label: "Combine like terms",
      kind: "combine",
      correct: false,
      whyWrong: "There are no like terms to combine until you distribute or divide the grouping.",
    });
  }
  if (next.operation.kind === "combine") {
    push({
      id: "d1",
      label: labelFor("divide", 2),
      kind: "divide",
      value: 2,
      correct: false,
      whyWrong:
        "Combine the constants first so you are dividing into a simpler equation.",
    });
    push({
      id: "d2",
      label: "Distribute",
      kind: "distribute",
      correct: false,
      whyWrong: "There is nothing in parentheses to distribute here.",
    });
  }

  push({
    id: "d3",
    label: "Swap both sides",
    kind: "check",
    correct: false,
    whyWrong:
      "Swapping sides does not isolate the variable. Use inverse operations.",
  });

  const mixed = [correct, ...distractors.slice(0, 3)];
  for (let i = mixed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = mixed[i]!;
    mixed[i] = mixed[j]!;
    mixed[j] = tmp;
  }
  return mixed.slice(0, 4);
}

function nextActionable(
  current: SolveStep,
  all: SolveStep[],
): SolveStep | undefined {
  const idx = all.findIndex((s) => s.id === current.id);
  for (let i = idx + 1; i < all.length; i++) {
    const s = all[i]!;
    if (s.isCheck) continue;
    if (s.operation) return s;
    if (s.isSolution) return s;
  }
  return undefined;
}

function labelFor(
  kind: PracticeChoice["kind"],
  value?: number,
  variable?: string,
  reverse?: boolean,
): string {
  const t = termLabel(value, variable);
  switch (kind) {
    case "add":
      return `Add ${t} to both sides`;
    case "subtract":
      return `Subtract ${t} from both sides`;
    case "multiply":
      return reverse
        ? `Multiply both sides by ${t} and reverse the inequality`
        : `Multiply both sides by ${t}`;
    case "divide":
      return reverse
        ? `Divide both sides by ${t} and reverse the inequality`
        : `Divide both sides by ${t}`;
    case "distribute":
      return "Distribute";
    case "combine":
      return "Combine like terms";
    case "check":
      return "Check by substituting";
  }
}

function termLabel(value?: number, variable?: string): string {
  if (variable) {
    if (value == null || Math.abs(value) === 1) {
      return value === -1 ? `−${variable}` : variable;
    }
    return `${value}${variable}`;
  }
  if (value != null && value < 0) return `−${Math.abs(value)}`;
  return String(value ?? "");
}

function originalExplanation(eq: LinearEq): string {
  const ineq = isInequality(relationOf(eq));
  switch (eq.presentation.form) {
    case "distribute":
      return eq.rightA !== 0
        ? `A grouped expression sits on the left, and ${eq.variable} also appears on the right. Expand, then collect like terms.`
        : `A grouped expression sits on the left. Expand with the distributive property before isolating ${eq.variable}.`;
    case "combine":
      return `Two constants share the left side with ${eq.variable}. Combine them first so only one constant remains.`;
    case "quotient":
      return `${eq.variable} is inside a quotient. Undo the division, then isolate ${eq.variable}.`;
    default:
      if (eq.rightA !== 0) {
        return `${eq.variable} appears on both sides. Collect the variable terms, then undo constants and coefficients.`;
      }
      if (eq.leftA !== 1 && eq.leftB !== 0) {
        return ineq
          ? `This is a two-step inequality: undo the constant, then undo the coefficient of ${eq.variable}. If you divide by a negative, reverse the inequality.`
          : `This is a two-step equation: undo the constant, then undo the coefficient of ${eq.variable}.`;
      }
      if (eq.leftB !== 0) {
        return `A constant is added to ${eq.variable}. Use the inverse operation on both sides.`;
      }
      return ineq
        ? `${eq.variable} is multiplied by a coefficient. Divide both sides to isolate it. If that coefficient is negative, reverse the inequality.`
        : `${eq.variable} is multiplied by a coefficient. Divide both sides to isolate it.`;
  }
}

function term(coef: number, variable: string): string {
  if (coef === 1) return variable;
  if (coef === -1) return `−${variable}`;
  return `${coef}${variable}`;
}

function fmtSigned(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}

function addSubAnnotation(
  kind: "add" | "subtract",
  mag: number,
  variable?: string,
): EquationLine {
  const sign = kind === "add" ? "+" : "−";
  const termTokens = variable
    ? mag === 1
      ? [
          { type: "op" as const, value: sign },
          { type: "var" as const, letter: variable },
        ]
      : [
          { type: "op" as const, value: sign },
          { type: "coef" as const, value: mag },
          { type: "var" as const, letter: variable },
        ]
    : [
        { type: "op" as const, value: sign },
        { type: "const" as const, value: mag },
      ];
  return { left: termTokens, right: [...termTokens] };
}

function mulAnnotation(value: number): EquationLine {
  const t = [
    { type: "op" as const, value: "×" },
    { type: "const" as const, value: value },
  ];
  return { left: t, right: [...t] };
}

function isIsolatedVarLine(line: EquationLine, v: string): boolean {
  const left = line.left;
  const right = line.right;
  return (
    left.length === 1 &&
    left[0]?.type === "var" &&
    left[0].letter === v &&
    right.length === 1 &&
    right[0]?.type === "const"
  );
}

export function nextPracticeIndex(steps: SolveStep[], from: number): number {
  let i = from + 1;
  while (
    i < steps.length &&
    !steps[i]!.operation &&
    !steps[i]!.isSolution &&
    !steps[i]!.isCheck
  ) {
    i++;
  }
  if (i >= steps.length || steps[i]!.isCheck) {
    const sol = steps.findIndex((s) => s.isSolution);
    return sol >= 0 ? sol : from;
  }
  // Show the simplified result of this inverse before asking again.
  let land = i;
  for (let j = i + 1; j < steps.length; j++) {
    const s = steps[j]!;
    if (s.isCheck) break;
    if (s.operation) break;
    land = j;
  }
  return land;
}
