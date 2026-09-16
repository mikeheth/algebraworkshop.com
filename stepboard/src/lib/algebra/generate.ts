import { solveEquation } from "./solve.ts";
import { maybeNeg, pick, randIntNonZero } from "./random.ts";
import { makeWordProblem } from "./word-problems.ts";
import type { Board, LinearEq, Presentation, Problem, Relation, Settings } from "./types.ts";

const MAX_TRIES = 80;

type Built = {
  eq: LinearEq;
  solution: number;
  structureLabel: string;
};

export function generateProblem(
  settings: Settings,
  board: Board = "equations",
): Problem {
  let lastError = "Could not generate a clean integer problem.";
  for (let i = 0; i < MAX_TRIES; i++) {
    try {
      const built = buildEquation(settings, board);
      const eq = withRelation(maybeFlipFriendly(built, settings, board).eq, board);
      if (settings.wordProblem && built.solution <= 0 && board !== "inequalities") continue;
      if (
        settings.wordProblem &&
        eq.rightA !== 0 &&
        (built.solution <= 0 || eq.leftA <= 0 || eq.rightA <= 0 || eq.leftB < 0 || eq.rightB < 0)
      ) {
        continue;
      }
      const solved = solveEquation(eq, built.solution);
      if (solved.steps.length < 2) continue;
      const word = settings.wordProblem
        ? makeWordProblem(eq, built.solution, built.structureLabel)
        : undefined;
      const label =
        board === "inequalities"
          ? built.structureLabel.replace("linear", "inequality") +
            (eq.relation && eq.relation !== "=" ? ` · ${eq.relation}` : "")
          : built.structureLabel;
      return {
        eq,
        solution: built.solution,
        steps: solved.steps,
        word,
        structureLabel: label,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }
  throw new Error(lastError);
}

function withRelation(eq: LinearEq, board: Board): LinearEq {
  if (board !== "inequalities") return { ...eq, relation: "=" };
  const rel = pick(["<", ">", "≤", "≥"] as Relation[]);
  return { ...eq, relation: rel };
}

/** Bias inequalities toward a negative coefficient so the sign-flip shows up in class. */
function maybeFlipFriendly(built: Built, s: Settings, board: Board): Built {
  if (board !== "inequalities" || !s.negatives) return built;
  if (built.eq.presentation.form !== "standard") return built;
  // Both-sides stories compare two positive rates. Don't flip those into a number story.
  if (built.eq.rightA !== 0) return built;
  if (Math.abs(built.eq.leftA) <= 1) return built;
  if (Math.random() >= 0.45) return built;
  const a = -Math.abs(built.eq.leftA);
  return {
    ...built,
    eq: {
      ...built.eq,
      leftA: a,
      rightB: a * built.solution + built.eq.leftB - built.eq.rightA * built.solution,
    },
  };
}

function buildEquation(s: Settings, board: Board = "equations"): Built {
  const v = s.variable;
  // Equation word problems ask "how many posters?" — that count cannot be negative.
  // Inequality stories may use a signed unknown (overnight low, a number).
  const allowNegUnknown =
    s.negatives && (board === "inequalities" || !s.wordProblem);
  const solMin = allowNegUnknown ? -Math.min(12, Math.max(3, s.constMax)) : 1;
  const solMax = Math.min(16, Math.max(solMin + 2, s.constMax));
  const x = randIntNonZero(solMin, solMax);

  if (s.stepCount === 1) return oneStep(s, v, x);
  // Stretch turns on "variables on both sides" but leaves Steps at Two.
  // Still emit both-sides so advanced word problems are not all one format.
  if (s.stepCount === 2) {
    if (s.bothSides && Math.random() < (s.wordProblem ? 0.6 : 0.28)) {
      return bothSidesKind(s, v, x);
    }
    return twoStep(s, v, x);
  }
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
  if (s.bothSides) {
    options.push("both");
    // Stretch word problems were all "thinking of a number" because both-sides
    // rarely survived negatives. Weight them so two-plan stories actually appear.
    if (s.wordProblem) options.push("both");
  }
  if (s.distribute) options.push("distribute");
  const kind = pick(options);

  if (kind === "both") {
    return bothSidesKind(s, v, x);
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

function bothSidesKind(s: Settings, v: string, x: number): Built {
  if (s.wordProblem) return bothSidesWord(s, v, Math.abs(x) || 1);
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

/** Two shops / two savers need positive rates, positive fees, and a positive count. */
function bothSidesWord(s: Settings, v: string, x: number): Built {
  const xx = Math.min(8, Math.max(2, Math.abs(x) || 2));
  const lo = Math.max(2, s.coefMin);
  const hi = Math.max(lo + 1, s.coefMax);
  const leftA = randIntNonZero(lo, hi);
  let rightA = leftA + pick([1, 2, 3, -1, -2, -3]);
  if (rightA < 2) rightA = 2;
  if (rightA === leftA) rightA = leftA + 1;

  const constLo = Math.max(4, s.constMin);
  const constHi = Math.max(constLo + 1, Math.min(24, s.constMax));
  let leftB = randIntNonZero(constLo, constHi);
  let rightB = leftA * xx + leftB - rightA * xx;
  if (rightB < 4) {
    leftB += 4 - rightB;
    rightB = leftA * xx + leftB - rightA * xx;
  }
  return {
    eq: linear(v, leftA, leftB, rightA, rightB),
    solution: xx,
    structureLabel: "Three-step · both sides",
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
  return { variable, leftA, leftB, rightA, rightB, presentation, relation: "=" };
}
