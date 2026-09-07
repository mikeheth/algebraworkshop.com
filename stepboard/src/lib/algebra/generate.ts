import { solveEquation } from "./solve";
import { maybeNeg, pick, randIntNonZero } from "./random";
import { makeWordProblem } from "./word-problems";
import type { LinearEq, Presentation, Problem, Settings } from "./types";

const MAX_TRIES = 80;

type Built = {
  eq: LinearEq;
  solution: number;
  structureLabel: string;
};

export function generateProblem(settings: Settings): Problem {
  let lastError = "Could not generate a clean integer problem.";
  for (let i = 0; i < MAX_TRIES; i++) {
    try {
      const built = buildEquation(settings);
      if (settings.wordProblem && built.solution <= 0) continue;
      const solved = solveEquation(built.eq, built.solution);
      if (solved.steps.length < 2) continue;
      const word = settings.wordProblem
        ? makeWordProblem(built.eq, built.solution, built.structureLabel)
        : undefined;
      return {
        eq: built.eq,
        solution: built.solution,
        steps: solved.steps,
        word,
        structureLabel: built.structureLabel,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }
  throw new Error(lastError);
}

function buildEquation(s: Settings): Built {
  const v = s.variable;
  // Word problems ask "how many posters/tickets?" — that count cannot be negative.
  const allowNegUnknown = s.negatives && !s.wordProblem;
  const solMin = allowNegUnknown ? -Math.min(12, Math.max(3, s.constMax)) : 1;
  const solMax = Math.min(16, Math.max(solMin + 2, s.constMax));
  const x = randIntNonZero(solMin, solMax);

  if (s.stepCount === 1) return oneStep(s, v, x);
  if (s.stepCount === 2) return twoStep(s, v, x);
  return threeStep(s, v, x);
}

function coef(s: Settings, chance = 0.22): number {
  return maybeNeg(
    randIntNonZero(Math.max(2, s.coefMin), Math.max(2, s.coefMax)),
    s.negatives,
    chance,
  );
}

function oneStep(s: Settings, v: string, x: number): Built {
  const kind = pick(["add", "sub", "mul", "div"] as const);
  if (kind === "add") {
    const b = maybeNeg(randIntNonZero(s.constMin, s.constMax), s.negatives);
    return {
      eq: linear(v, 1, b, 0, x + b),
      solution: x,
      structureLabel: "One-step · addition",
    };
  }
  if (kind === "sub") {
    const b = randIntNonZero(s.constMin, s.constMax);
    return {
      eq: linear(v, 1, -b, 0, x - b),
      solution: x,
      structureLabel: "One-step · subtraction",
    };
  }
  if (kind === "mul") {
    const a = coef(s, 0.25);
    return {
      eq: linear(v, a, 0, 0, a * x),
      solution: x,
      structureLabel: "One-step · multiplication",
    };
  }

  const divisor = randIntNonZero(Math.max(2, s.coefMin), Math.max(2, s.coefMax));
  let xx = x;
  if (xx % divisor !== 0) {
    xx = divisor * randIntNonZero(1, Math.max(2, Math.min(8, s.constMax)));
  }
  const right = xx / divisor;
  return {
    eq: {
      variable: v,
      leftA: 1,
      leftB: 0,
      rightA: 0,
      rightB: xx,
      presentation: { form: "quotient", innerB: 0, divisor, right },
    },
    solution: xx,
    structureLabel: "One-step · division",
  };
}

function twoStep(s: Settings, v: string, x: number): Built {
  if (Math.random() < 0.22) {
    const divisor = randIntNonZero(Math.max(2, s.coefMin), Math.max(2, s.coefMax));
    const innerB = maybeNeg(randIntNonZero(s.constMin, s.constMax), s.negatives);
    let xx = x;
    if ((xx + innerB) % divisor !== 0) {
      xx = divisor * randIntNonZero(1, 8) - innerB;
    }
    if (s.wordProblem) {
      while (xx <= 0 || xx + innerB < 0) xx += divisor;
    }
    const right = (xx + innerB) / divisor;
    return {
      eq: {
        variable: v,
        leftA: 1,
        leftB: innerB,
        rightA: 0,
        rightB: xx + innerB,
        presentation: { form: "quotient", innerB, divisor, right },
      },
      solution: xx,
      structureLabel: "Two-step · divide then isolate",
    };
  }

  const a = coef(s, 0.22);
  const b = maybeNeg(randIntNonZero(s.constMin, s.constMax), s.negatives);
  return {
    eq: linear(v, a, b, 0, a * x + b),
    solution: x,
    structureLabel: "Two-step · linear",
  };
}

function threeStep(s: Settings, v: string, x: number): Built {
  const options: Array<"both" | "distribute" | "combine"> = ["combine"];
  if (s.bothSides) options.push("both");
  if (s.distribute) options.push("distribute");
  const kind = pick(options);

  if (kind === "both") {
    const leftA = coef(s, 0.2);
    let rightA = coef(s, 0.2);
    if (leftA === rightA) rightA = leftA + (leftA > 0 ? 1 : -1);
    const leftB = maybeNeg(randIntNonZero(s.constMin, s.constMax), s.negatives);
    const rightB = leftA * x + leftB - rightA * x;
    return {
      eq: linear(v, leftA, leftB, rightA, rightB),
      solution: x,
      structureLabel: "Three-step · both sides",
    };
  }

  if (kind === "distribute") {
    const outer = coef(s, 0.15);
    const innerB = maybeNeg(
      randIntNonZero(s.constMin, Math.max(s.constMin, Math.min(s.constMax, 9))),
      s.negatives,
    );
    const rightB = outer * (x + innerB);
    return {
      eq: {
        variable: v,
        leftA: outer,
        leftB: outer * innerB,
        rightA: 0,
        rightB,
        presentation: { form: "distribute", outer, innerB },
      },
      solution: x,
      structureLabel: "Three-step · distributive",
    };
  }

  const a = coef(s, 0.2);
  const b1 = maybeNeg(randIntNonZero(s.constMin, s.constMax), s.negatives);
  let b2 = maybeNeg(randIntNonZero(s.constMin, s.constMax), s.negatives);
  if (b1 + b2 === 0) b2 = b1 > 0 ? b2 + 2 : b2 - 2;
  return {
    eq: {
      variable: v,
      leftA: a,
      leftB: b1 + b2,
      rightA: 0,
      rightB: a * x + b1 + b2,
      presentation: { form: "combine", a, b1, b2 },
    },
    solution: x,
    structureLabel: "Three-step · combine",
  };
}

function linear(
  variable: string,
  leftA: number,
  leftB: number,
  rightA: number,
  rightB: number,
  presentation: Presentation = { form: "standard" },
): LinearEq {
  return { variable, leftA, leftB, rightA, rightB, presentation };
}
