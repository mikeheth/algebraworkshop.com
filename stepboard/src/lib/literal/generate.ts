import { pick, randInt } from "../algebra/random.ts";
import type { MathToken } from "../algebra/types.ts";
import { formulasFor } from "./formulas.ts";
import { coef, line, num, op, parenNum, plusTerm, scaledLetter, unk } from "./format.ts";
import { solveLiteral } from "./solve.ts";
import type { FormulaSpec, LitProblem, LitSettings, NumericTwin } from "./types.ts";

export function generateLiteral(settings: LitSettings): LitProblem {
  const pool = formulasFor(settings.stepFilter);
  const spec = pick(pool.length ? pool : formulasFor("mix"));
  const target = pick(spec.solveFor);
  const steps = solveLiteral(spec, target);
  const problem: LitProblem = {
    spec,
    target,
    steps,
    structureLabel: `${spec.steps === 1 ? "One-step" : "Two-step"} · ${spec.name} · solve for ${target}`,
    prompt: `Solve for ${target}.`,
  };
  if (settings.numericTwin) {
    const twin = makeTwin(spec, target);
    if (twin) problem.twin = twin;
  }
  return problem;
}

function makeTwin(spec: FormulaSpec, target: string): NumericTwin | undefined {
  const s = spec.shape;
  if (s.type === "product") {
    const others = s.factors.filter((f) => f !== target);
    const vals = others.map(() => randInt(2, 6));
    const targetVal = randInt(2, 6);
    const leading = s.coef ?? 1;
    const product = leading * vals.reduce((a, b) => a * b, 1) * targetVal;
    const right: MathToken[] = [];
    if (leading !== 1) right.push(num(leading));
    others.forEach((f, i) => {
      if (right.length) right.push(op("·"));
      right.push(num(vals[i]!));
      void f;
    });
    if (right.length) right.push(op("·"));
    right.push(unk(target));
    return {
      line: line([num(product)], right),
      note: `Same inverse: divide away the numbers to isolate ${target}. Then do that with the letters.`,
    };
  }
  if (s.type === "linear") {
    if (target === s.x) {
      const m = randInt(2, 5);
      const b = randInt(1, 8);
      const x = randInt(2, 6);
      const y = m * x + b;
      return {
        line: line([num(y)], [coef(m), unk(s.x), op("+"), num(b)]),
        note: `Subtract ${b}, then divide by ${m}. Same two moves on the formula.`,
      };
    }
    const m = randInt(2, 5);
    const x = randInt(2, 6);
    const b = randInt(1, 8);
    const y = m * x + b;
    return {
      line: line(
        [num(y)],
        [...parenNum(m), ...parenNum(x), op("+"), unk(s.b)],
      ),
      note: `Subtract (${m})(${x}) to isolate the addend. Same move: subtract ${s.m}${s.x}.`,
    };
  }
  if (s.type === "scaled-sum") {
    const t = randInt(3, 8);
    const o = randInt(2, 7);
    const p = s.coef * t + s.coef * o;
    return {
      line: line(
        [num(p)],
        [...scaledLetter(s.coef, target, target), ...plusTerm([num(s.coef * o)])],
      ),
      note: `Subtract ${s.coef * o}, then divide by ${s.coef}. Same two moves on the formula.`,
    };
  }
  if (s.type === "axc") {
    const a = randInt(2, 6);
    const b = randInt(1, 8);
    const x = randInt(2, 7);
    const c = a * x + b;
    return {
      line: line([coef(a), unk("x"), op("+"), num(b)], [num(c)]),
      note: `Subtract ${b}, then divide by ${a}. The formula is the same problem with letters.`,
    };
  }
  if (s.type === "temp-f") {
    return {
      line: line([num(50)], [op("("), num(9), op("/"), num(5), op(")"), unk("C"), op("+"), num(32)]),
      note: "Subtract 32, then multiply by 5/9. Same two moves on the formula.",
    };
  }
  return undefined;
}