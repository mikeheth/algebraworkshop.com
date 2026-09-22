import type { EquationLine, MathToken, SolveStep } from "../algebra/types.ts";
import type { FormulaSpec } from "./types.ts";
import type { LitWord } from "./word-problems.ts";
import {
  addSubAnnotation,
  frac,
  group,
  letter,
  line,
  minusTerm,
  mulAnnotation,
  num,
  op,
  over,
  param,
  plusTerm,
  productTokens,
  scaledLetter,
  unk,
} from "./format.ts";

let seq = 0;
function nid(): string {
  seq += 1;
  return `L${seq}`;
}

function step(
  line: EquationLine,
  explanation: string,
  property: string,
  extra: Partial<SolveStep> = {},
): SolveStep {
  return { id: nid(), line, explanation, property, ...extra };
}

function isTargetLeft(ln: EquationLine, target: string): boolean {
  return (
    ln.left.length === 1 &&
    ln.left[0]?.type === "var" &&
    ln.left[0].letter === target &&
    !ln.left[0].param
  );
}

function swapToTarget(steps: SolveStep[], current: EquationLine, target: string): EquationLine {
  if (isTargetLeft(current, target)) return current;
  if (
    current.right.length === 1 &&
    current.right[0]?.type === "var" &&
    current.right[0].letter === target &&
    !current.right[0].param
  ) {
    const swapped = line(current.right, current.left);
    steps.push(
      step(
        swapped,
        `Put ${target} on the left. The two sides are equal, so they may swap.`,
        "Symmetric Property of Equality",
      ),
    );
    return swapped;
  }
  return current;
}

function markSolution(steps: SolveStep[], target: string, exprPlain: string) {
  const last = steps[steps.length - 1]!;
  last.isSolution = true;
  last.property = "Solution";
  last.explanation = `${target} is isolated. ${target} = ${exprPlain}.`;
}

function startCheck(
  steps: SolveStep[],
  original: EquationLine,
  target: string,
  exprPlain: string,
) {
  steps.push(
    step(
      original,
      `Substitute ${target} = ${exprPlain} into the original formula.`,
      "Check",
      { isCheck: true },
    ),
  );
}

export function appendNowSolve(steps: SolveStep[], word: LitWord): void {
  const sol = steps.find((s) => s.isSolution);
  const { apply } = word;
  if (sol) {
    steps.push(
      step(sol.line, "Substitute the given numbers into:", "Now solve", { isApply: true }),
    );
  }
  steps.push(
    step(
      apply.plugged,
      `Replace the other letters with the given numbers.`,
      "Substitute",
      { isApply: true },
    ),
  );
  if (apply.simplified) {
    steps.push(
      step(
        apply.simplified,
        apply.simplifyNote ?? "Simplify the numbers.",
        "Simplify",
        { isApply: true },
      ),
    );
  }
  steps.push(step(apply.result, apply.conclusion, "Answer", { isApply: true }));
}

export function solveLiteral(spec: FormulaSpec, target: string): SolveStep[] {
  seq = 0;
  const shape = spec.shape;
  if (shape.type === "product") return solveProduct(shape.isolated, shape.factors, target, shape.coef ?? 1);
  if (shape.type === "linear") return solveLinear(shape.y, shape.m, shape.x, shape.b, target);
  if (shape.type === "scaled-sum") return solveScaledSum(shape.p, shape.coef, shape.a, shape.b, target);
  if (shape.type === "axc") return solveAxc(shape.a, shape.x, shape.b, shape.c, target);
  if (shape.type === "half-product") return solveHalfProduct(shape.isolated, shape.a, shape.b, target);
  if (shape.type === "mean") return solveMean(shape.m, shape.a, shape.b, target);
  return solveTemp(target);
}

function solveProduct(
  isolated: string,
  factors: string[],
  target: string,
  coef: number,
): SolveStep[] {
  const steps: SolveStep[] = [];
  const original = line([param(isolated)], productTokens(factors, target, coef));
  steps.push(
    step(
      original,
      `${isolated} is the product of ${joinLetters(coef, factors)}. Isolate ${target} by dividing away everything else.`,
      "Given equation",
      { isOriginal: true },
    ),
  );

  const others = factors.filter((f) => f !== target);
  const den = productTokens(others, target, coef);
  const label = productLabel(coef, others);

  if (den.length) {
    const rightNow = productTokens(factors, target, coef);
    steps.push(
      step(
        line(over([param(isolated)], den), over(rightNow, den)),
        `Divide both sides by ${label} to undo multiplying by ${label}.`,
        "Division Property of Equality",
        {
          operation: {
            kind: "divide",
            variable: others.join("") || undefined,
            value: coef !== 1 ? coef : undefined,
          },
        },
      ),
    );
    const simplifiedLeft = [frac([param(isolated)], [...den])];
    steps.push(
      step(
        line(simplifiedLeft, [unk(target)]),
        `${label} cancels on the right. ${target} remains.`,
        "Simplify",
      ),
    );
  }

  let current = steps[steps.length - 1]!.line;
  current = swapToTarget(steps, current, target);
  const expr = plain(current.right);
  markSolution(steps, target, expr);

  const checkRight: MathToken[] = [];
  if (coef !== 1) checkRight.push(num(coef));
  for (const f of factors) {
    if (f === target) {
      checkRight.push(op("("), ...current.right, op(")"));
    } else {
      checkRight.push(param(f));
    }
  }
  startCheck(steps, original, target, expr);
  steps.push(
    step(
      line([param(isolated)], checkRight),
      `Replace ${target} with ${expr}.`,
      "Substitute",
      { isCheck: true },
    ),
  );
  steps.push(
    step(
      line([param(isolated)], [param(isolated)]),
      `The extra factors cancel. ${isolated} = ${isolated}, so the formula checks.`,
      "True statement",
      { isCheck: true },
    ),
  );
  return steps;
}

function solveLinear(y: string, m: string, x: string, b: string, target: string): SolveStep[] {
  const steps: SolveStep[] = [];
  const mx = [...scaledLetter(1, m, target).filter((t) => t.type !== "op" || t.value !== "−"), unk(x)].map((t) =>
    t.type === "var" && t.letter === m ? param(m) : t,
  );
  // mx as m then x
  const mxTokens = [letter(m, target), letter(x, target)];
  const original = line([param(y)], [...mxTokens, ...plusTerm([letter(b, target)])]);
  steps.push(
    step(
      original,
      `${y} equals ${m}${x} plus ${b}. Undo the addend, then undo the coefficient of ${x === target ? x : "the variable"}.`,
      "Given equation",
      { isOriginal: true },
    ),
  );

  if (target === b) {
    const mxTerm = [param(m), param(x)];
    steps.push(
      step(
        original,
        `Subtract ${m}${x} from both sides to undo adding that term.`,
        "Subtraction Property of Equality",
        { operation: { kind: "subtract", variable: `${m}${x}` }, annotation: addSubAnnotation("subtract", mxTerm) },
      ),
    );
    const after = line([... [param(y)], ...minusTerm(mxTerm)], [unk(b)]);
    steps.push(step(after, `${m}${x} cancels on the right. ${b} is isolated.`, "Simplify"));
    const swapped = swapToTarget(steps, after, b);
    markSolution(steps, b, plain(swapped.right));
    pushLinearCheck(steps, original, y, m, x, b, target, swapped.right);
    return steps;
  }

  // solve for x
  steps.push(
    step(
      original,
      `Subtract ${b} from both sides to undo adding ${b}.`,
      "Subtraction Property of Equality",
      { operation: { kind: "subtract", variable: b }, annotation: addSubAnnotation("subtract", [param(b)]) },
    ),
  );
  const afterSub = line([param(y), op("−"), param(b)], mxTokens);
  steps.push(step(afterSub, `${b} cancels. ${m}${x} remains on the right.`, "Simplify"));

  steps.push(
    step(
      line(over([param(y), op("−"), param(b)], [param(m)]), over(mxTokens, [param(m)])),
      `Divide both sides by ${m} to undo multiplying ${x} by ${m}.`,
      "Division Property of Equality",
      { operation: { kind: "divide", variable: m } },
    ),
  );
  const afterDiv = line([frac([param(y), op("−"), param(b)], [param(m)])], [unk(x)]);
  steps.push(step(afterDiv, `${m} cancels. ${x} is alone.`, "Simplify"));
  const swapped = swapToTarget(steps, afterDiv, x);
  markSolution(steps, x, plain(swapped.right));
  pushLinearCheck(steps, original, y, m, x, b, target, swapped.right);
  void mx;
  return steps;
}

function pushLinearCheck(
  steps: SolveStep[],
  original: EquationLine,
  y: string,
  m: string,
  x: string,
  b: string,
  target: string,
  expr: MathToken[],
) {
  const plugged =
    target === x
      ? [param(m), op("("), ...expr, op(")"), op("+"), param(b)]
      : [param(m), param(x), op("+"), op("("), ...expr, op(")")];
  startCheck(steps, original, target, plain(expr));
  steps.push(
    step(
      line([param(y)], plugged),
      `Replace ${target} with ${plain(expr)}.`,
      "Substitute",
      { isCheck: true },
    ),
  );
  steps.push(
    step(
      line([param(y)], [param(y)]),
      `The extra terms cancel. ${y} = ${y}, so the formula checks.`,
      "True statement",
      { isCheck: true },
    ),
  );
}

function solveScaledSum(p: string, coef: number, a: string, b: string, target: string): SolveStep[] {
  const other = target === a ? b : a;
  const steps: SolveStep[] = [];
  const original = line(
    [param(p)],
    [...scaledLetter(coef, a, target), ...plusTerm(scaledLetter(coef, b, target))],
  );
  steps.push(
    step(
      original,
      `${p} is ${coef}${a} plus ${coef}${b}. Undo the term that does not have ${target}, then divide by ${coef}.`,
      "Given equation",
      { isOriginal: true },
    ),
  );
  const otherTerm = scaledLetter(coef, other, target);
  steps.push(
    step(
      original,
      `Subtract ${coef}${other} from both sides.`,
      "Subtraction Property of Equality",
      { operation: { kind: "subtract", value: coef, variable: other }, annotation: addSubAnnotation("subtract", otherTerm) },
    ),
  );
  const afterSub = line([param(p), ...minusTerm(otherTerm)], scaledLetter(coef, target, target));
  steps.push(step(afterSub, `${coef}${other} cancels. ${coef}${target} remains.`, "Simplify"));

  steps.push(
    step(
      line(over(afterSub.left, [num(coef)]), over(afterSub.right, [num(coef)])),
      `Divide both sides by ${coef} to undo multiplying ${target} by ${coef}.`,
      "Division Property of Equality",
      { operation: { kind: "divide", value: coef } },
    ),
  );
  const afterDiv = line([frac(afterSub.left, [num(coef)])], [unk(target)]);
  steps.push(step(afterDiv, `${coef} cancels. ${target} is alone.`, "Simplify"));
  const swapped = swapToTarget(steps, afterDiv, target);
  markSolution(steps, target, plain(swapped.right));
  startCheck(steps, original, target, plain(swapped.right));
  const otherTermCheck = scaledLetter(coef, other, target);
  steps.push(
    step(
      line(
        [param(p)],
        [
          ...(coef !== 1 ? [num(coef)] : []),
          op("("),
          ...swapped.right,
          op(")"),
          op("+"),
          ...otherTermCheck,
        ],
      ),
      `Replace ${target} with ${plain(swapped.right)}.`,
      "Substitute",
      { isCheck: true },
    ),
  );
  steps.push(
    step(
      line([param(p)], [param(p)]),
      `${p} = ${p}, so the formula checks.`,
      "True statement",
      { isCheck: true },
    ),
  );
  return steps;
}

function solveAxc(a: string, x: string, b: string, c: string, target: string): SolveStep[] {
  const steps: SolveStep[] = [];
  const original = line(
    [...scaledLetter(1, a, target).filter((t) => !(t.type === "op" && t.value === "−")), unk(x), ...plusTerm([param(b)])].map(
      (t) => (t.type === "var" && t.letter === a ? param(a) : t),
    ),
    [param(c)],
  );
  const left = [param(a), unk(x), op("+"), param(b)];
  const given = line(left, [param(c)]);
  steps.push(
    step(
      given,
      `This is the same two-step as Stepboard. Undo the constant, then undo the coefficient of ${x}.`,
      "Given equation",
      { isOriginal: true },
    ),
  );
  void original;
  steps.push(
    step(
      given,
      `Subtract ${b} from both sides to undo adding ${b}.`,
      "Subtraction Property of Equality",
      { operation: { kind: "subtract", variable: b }, annotation: addSubAnnotation("subtract", [param(b)]) },
    ),
  );
  const afterSub = line([param(a), unk(x)], [param(c), op("−"), param(b)]);
  steps.push(step(afterSub, `${b} cancels. ${a}${x} remains.`, "Simplify"));
  steps.push(
    step(
      line(over([param(a), unk(x)], [param(a)]), over([param(c), op("−"), param(b)], [param(a)])),
      `Divide both sides by ${a} to undo multiplying ${x} by ${a}.`,
      "Division Property of Equality",
      { operation: { kind: "divide", variable: a } },
    ),
  );
  const afterDiv = line([unk(x)], [frac([param(c), op("−"), param(b)], [param(a)])]);
  steps.push(step(afterDiv, `${a} cancels. ${x} is isolated.`, "Simplify"));
  markSolution(steps, x, plain(afterDiv.right));
  startCheck(steps, given, x, plain(afterDiv.right));
  steps.push(
    step(
      line([param(a), op("("), ...afterDiv.right, op(")"), op("+"), param(b)], [param(c)]),
      `Replace ${x} with ${plain(afterDiv.right)}.`,
      "Substitute",
      { isCheck: true },
    ),
  );
  steps.push(
    step(
      line([param(c)], [param(c)]),
      `${c} = ${c}, so the formula checks.`,
      "True statement",
      { isCheck: true },
    ),
  );
  void target;
  return steps;
}

function solveHalfProduct(isolated: string, a: string, b: string, target: string): SolveStep[] {
  const other = target === a ? b : a;
  const steps: SolveStep[] = [];
  const half = frac([num(1)], [num(2)]);
  const original = line([param(isolated)], [half, letter(a, target), letter(b, target)]);
  steps.push(
    step(
      original,
      `${isolated} is one-half of ${a} times ${b}. Multiply by 2, then divide by ${other}.`,
      "Given equation",
      { isOriginal: true },
    ),
  );
  const two = [num(2)];
  steps.push(
    step(
      line([...two, ...group([param(isolated)])], [...two, ...group([half, letter(a, target), letter(b, target)])]),
      "Multiply both sides by 2 to undo the one-half.",
      "Multiplication Property of Equality",
      { operation: { kind: "multiply", value: 2 }, annotation: mulAnnotation(two) },
    ),
  );
  const afterMul = line([num(2), param(isolated)], [letter(a, target), letter(b, target)]);
  steps.push(step(afterMul, "2 · (1/2) cancels. The product remains.", "Simplify"));
  steps.push(
    step(
      line(over(afterMul.left, [param(other)]), over(afterMul.right, [param(other)])),
      `Divide both sides by ${other} to isolate ${target}.`,
      "Division Property of Equality",
      { operation: { kind: "divide", variable: other } },
    ),
  );
  const afterDiv = line([frac([num(2), param(isolated)], [param(other)])], [unk(target)]);
  steps.push(step(afterDiv, `${other} cancels. ${target} is alone.`, "Simplify"));
  const swapped = swapToTarget(steps, afterDiv, target);
  markSolution(steps, target, plain(swapped.right));
  startCheck(steps, original, target, plain(swapped.right));
  const pluggedRight =
    target === a
      ? [half, op("("), ...swapped.right, op(")"), letter(b, target)]
      : [half, letter(a, target), op("("), ...swapped.right, op(")")];
  steps.push(
    step(
      line([param(isolated)], pluggedRight),
      `Replace ${target} with ${plain(swapped.right)}.`,
      "Substitute",
      { isCheck: true },
    ),
  );
  steps.push(
    step(
      line([param(isolated)], [param(isolated)]),
      `${isolated} = ${isolated}, so the formula checks.`,
      "True statement",
      { isCheck: true },
    ),
  );
  return steps;
}

function solveMean(m: string, a: string, b: string, target: string): SolveStep[] {
  const other = target === a ? b : a;
  const steps: SolveStep[] = [];
  const original = line([param(m)], [frac([letter(a, target), op("+"), letter(b, target)], [num(2)])]);
  steps.push(
    step(
      original,
      `${m} is the average of ${a} and ${b}. Multiply by 2, then subtract the other number.`,
      "Given equation",
      { isOriginal: true },
    ),
  );
  const two = [num(2)];
  steps.push(
    step(
      line([...two, ...group(original.left)], [...two, ...group(original.right)]),
      "Multiply both sides by 2 to undo dividing by 2.",
      "Multiplication Property of Equality",
      { operation: { kind: "multiply", value: 2 }, annotation: mulAnnotation(two) },
    ),
  );
  const afterMul = line([num(2), param(m)], [letter(a, target), op("+"), letter(b, target)]);
  steps.push(step(afterMul, "The 2s cancel. The sum remains.", "Simplify"));
  steps.push(
    step(
      afterMul,
      `Subtract ${other} from both sides.`,
      "Subtraction Property of Equality",
      {
        operation: { kind: "subtract", variable: other },
        annotation: addSubAnnotation("subtract", [param(other)]),
      },
    ),
  );
  const afterSub = line([num(2), param(m), op("−"), param(other)], [unk(target)]);
  steps.push(step(afterSub, `${other} cancels. ${target} is isolated.`, "Simplify"));
  const swapped = swapToTarget(steps, afterSub, target);
  markSolution(steps, target, plain(swapped.right));
  startCheck(steps, original, target, plain(swapped.right));
  const pluggedNum =
    target === a
      ? [...swapped.right, op("+"), param(b)]
      : [param(a), op("+"), ...swapped.right];
  steps.push(
    step(
      line([param(m)], [frac(pluggedNum, [num(2)])]),
      `Replace ${target} with ${plain(swapped.right)}.`,
      "Substitute",
      { isCheck: true },
    ),
  );
  steps.push(
    step(
      line([param(m)], [param(m)]),
      `${m} = ${m}, so the formula checks.`,
      "True statement",
      { isCheck: true },
    ),
  );
  return steps;
}

function solveTemp(_target: string): SolveStep[] {
  const steps: SolveStep[] = [];
  const nineFifthsC = [frac([num(9)], [num(5)]), unk("C")];
  const original = line([param("F")], [...nineFifthsC, ...plusTerm([num(32)])]);
  steps.push(
    step(
      original,
      `Fahrenheit is nine-fifths of Celsius, plus 32. Undo the addend, then multiply by the reciprocal.`,
      "Given equation",
      { isOriginal: true },
    ),
  );
  steps.push(
    step(
      original,
      "Subtract 32 from both sides to undo adding 32.",
      "Subtraction Property of Equality",
      { operation: { kind: "subtract", value: 32 }, annotation: addSubAnnotation("subtract", [num(32)]) },
    ),
  );
  const afterSub = line([param("F"), op("−"), num(32)], nineFifthsC);
  steps.push(step(afterSub, "32 cancels. (9/5)C remains.", "Simplify"));
  const fiveNinths = [frac([num(5)], [num(9)])];
  steps.push(
    step(
      line(
        [...fiveNinths, ...group([param("F"), op("−"), num(32)])],
        [...fiveNinths, ...group(nineFifthsC)],
      ),
      "Multiply both sides by 5/9, the reciprocal of 9/5.",
      "Multiplication Property of Equality",
      { operation: { kind: "multiply", variable: "the reciprocal of 9/5" }, annotation: mulAnnotation(fiveNinths) },
    ),
  );
  const afterMul = line([...fiveNinths, ...group([param("F"), op("−"), num(32)])], [unk("C")]);
  steps.push(step(afterMul, "9/5 and 5/9 cancel. C is alone.", "Simplify"));
  const swapped = swapToTarget(steps, afterMul, "C");
  markSolution(steps, "C", plain(swapped.right));
  startCheck(steps, original, "C", plain(swapped.right));
  steps.push(
    step(
      line([param("F")], [frac([num(9)], [num(5)]), op("("), ...swapped.right, op(")"), op("+"), num(32)]),
      "Replace C with that expression.",
      "Substitute",
      { isCheck: true },
    ),
  );
  steps.push(
    step(
      line([param("F")], [param("F")]),
      "F = F, so the formula checks.",
      "True statement",
      { isCheck: true },
    ),
  );
  return steps;
}

function joinLetters(coef: number, factors: string[]): string {
  const parts = coef !== 1 ? [String(coef), ...factors] : factors;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function productLabel(coef: number, letters: string[]): string {
  const mag = Math.abs(coef);
  return `${mag !== 1 ? mag : ""}${letters.join("")}`;
}

export function plain(tokens: MathToken[]): string {
  return tokens
    .map((t) => {
      switch (t.type) {
        case "coef":
        case "const":
          return String(t.value);
        case "var":
          return t.letter;
        case "op":
          return t.value === "−" ? "−" : t.value === "×" ? "·" : t.value;
        case "frac":
          return `(${plain(t.num)})/(${plain(t.den)})`;
        case "group":
          return plain(t.tokens);
      }
    })
    .join("");
}
