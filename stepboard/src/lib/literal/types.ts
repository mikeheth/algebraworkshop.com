import type { PlaySpeed, PracticeChoice, SolveStep } from "../algebra/types.ts";

export type LitStepFilter = 1 | 2 | "mix";

export type LitSettings = {
  stepFilter: LitStepFilter;
  wordProblem: boolean;
  mode: "watch" | "practice";
  playSpeed: PlaySpeed;
};

export const DEFAULT_LIT_SETTINGS: LitSettings = {
  stepFilter: "mix",
  wordProblem: false,
  mode: "watch",
  playSpeed: "classroom",
};

export type ProductShape = {
  type: "product";
  isolated: string;
  coef?: number;
  factors: string[];
};

export type LinearShape = {
  type: "linear";
  y: string;
  m: string;
  x: string;
  b: string;
};

export type ScaledSumShape = {
  type: "scaled-sum";
  p: string;
  coef: number;
  a: string;
  b: string;
};

export type AxcShape = {
  type: "axc";
  a: string;
  x: string;
  b: string;
  c: string;
};

export type TempFShape = { type: "temp-f" };

export type HalfProductShape = {
  type: "half-product";
  isolated: string;
  a: string;
  b: string;
};

export type MeanShape = {
  type: "mean";
  m: string;
  a: string;
  b: string;
};

export type FormulaShape =
  | ProductShape
  | LinearShape
  | ScaledSumShape
  | AxcShape
  | TempFShape
  | HalfProductShape
  | MeanShape;

export type FormulaSpec = {
  id: string;
  name: string;
  context: string;
  steps: 1 | 2;
  shape: FormulaShape;
  solveFor: string[];
};

export type LitProblem = {
  spec: FormulaSpec;
  target: string;
  steps: SolveStep[];
  structureLabel: string;
  prompt: string;
  word?: {
    story: string;
    question: string;
    letStatement: string;
  };
};

export type LitChoice = PracticeChoice;
