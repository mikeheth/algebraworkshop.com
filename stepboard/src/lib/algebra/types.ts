export type StepCount = 1 | 2 | 3;

export type Difficulty = "easy" | "medium" | "hard" | "custom";

export type SolveMode = "watch" | "practice";

export type PlaySpeed = "slow" | "classroom" | "brisk";

export type Board = "equations" | "inequalities";

export type Relation = "=" | "<" | ">" | "≤" | "≥";

export type Settings = {
  stepCount: StepCount;
  difficulty: Difficulty;
  coefMin: number;
  coefMax: number;
  constMin: number;
  constMax: number;
  negatives: boolean;
  bothSides: boolean;
  distribute: boolean;
  variable: string;
  wordProblem: boolean;
  mode: SolveMode;
  playSpeed: PlaySpeed;
};

export type LinearEq = {
  variable: string;
  leftA: number;
  leftB: number;
  rightA: number;
  rightB: number;
  presentation: Presentation;
  relation?: Relation;
};

export type Presentation =
  | { form: "standard" }
  | { form: "distribute"; outer: number; innerB: number }
  | { form: "combine"; a: number; b1: number; b2: number }
  | { form: "quotient"; innerB: number; divisor: number; right: number };

export type MathToken =
  | { type: "coef"; value: number }
  | { type: "var"; letter: string; param?: boolean }
  | { type: "const"; value: number }
  | { type: "op"; value: string }
  | { type: "frac"; num: MathToken[]; den: MathToken[] }
  | { type: "group"; tokens: MathToken[] };

export type EquationLine = {
  left: MathToken[];
  right: MathToken[];
  rel?: Relation;
};

export type OperationKind =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "distribute"
  | "combine"
  | "check";

export type SolveStep = {
  id: string;
  line: EquationLine;
  annotation?: EquationLine;
  explanation: string;
  property: string;
  operation?: {
    kind: OperationKind;
    value?: number;
    variable?: string;
    reverse?: boolean;
  };
  isOriginal?: boolean;
  isSolution?: boolean;
  isCheck?: boolean;
  isApply?: boolean;
};

export type PracticeChoice = {
  id: string;
  label: string;
  kind: OperationKind;
  value?: number;
  variable?: string;
  correct: boolean;
  whyWrong?: string;
  apply?: "divide-group" | "divide-all-terms";
  reverse?: boolean;
};

export type WordProblem = {
  story: string;
  question: string;
  unknown: string;
  letStatement: string;
  /** True when the unknown is a count that cannot be negative (rounds, tickets, months). */
  nonNegative?: boolean;
  countNoun?: string;
};

export type Problem = {
  eq: LinearEq;
  solution: number;
  steps: SolveStep[];
  word?: WordProblem;
  structureLabel: string;
};

export const DEFAULT_SETTINGS: Settings = {
  stepCount: 2,
  difficulty: "easy",
  coefMin: 2,
  coefMax: 5,
  constMin: 1,
  constMax: 12,
  negatives: false,
  bothSides: false,
  distribute: false,
  variable: "x",
  wordProblem: false,
  mode: "watch",
  playSpeed: "classroom",
};

export const PLAY_SPEEDS: {
  id: PlaySpeed;
  label: string;
  hint: string;
  ms: number;
}[] = [
  { id: "slow", label: "Slow", hint: "7 s per step", ms: 7000 },
  { id: "classroom", label: "Classroom", hint: "4.5 s per step", ms: 4500 },
  { id: "brisk", label: "Brisk", hint: "2.5 s per step", ms: 2500 },
];

export const DIFFICULTY_PRESETS: Record<
  Exclude<Difficulty, "custom">,
  Pick<
    Settings,
    | "coefMin"
    | "coefMax"
    | "constMin"
    | "constMax"
    | "negatives"
  >
> = {
  easy: {
    coefMin: 2,
    coefMax: 5,
    constMin: 1,
    constMax: 12,
    negatives: false,
  },
  medium: {
    coefMin: 2,
    coefMax: 8,
    constMin: 1,
    constMax: 20,
    negatives: true,
  },
  hard: {
    coefMin: 2,
    coefMax: 12,
    constMin: 1,
    constMax: 30,
    negatives: true,
  },
};

export const DEFAULT_INEQ_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  ...DIFFICULTY_PRESETS.medium,
  difficulty: "medium",
  negatives: true,
};

export const VARIABLE_LETTERS = ["x", "n", "y", "k", "m"] as const;

export function isInequality(rel?: Relation): boolean {
  return rel != null && rel !== "=";
}

export function flipRelation(rel: Relation): Relation {
  switch (rel) {
    case "<":
      return ">";
    case ">":
      return "<";
    case "≤":
      return "≥";
    case "≥":
      return "≤";
    default:
      return rel;
  }
}

export function relationOf(eq: LinearEq): Relation {
  return eq.relation ?? "=";
}