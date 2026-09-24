import type { EquationLine, PlaySpeed } from "../algebra/types.ts";

export type SystemMethod = "substitution" | "elimination";

export type ElimStyle = "add" | "subtract" | "scale" | "mix";

export type SubLevel = "easy" | "medium" | "advanced";

export type SystemSettings = {
  subLevel: SubLevel;
  elimStyle: ElimStyle;
  negatives: boolean;
  mode: "watch" | "practice";
  playSpeed: PlaySpeed;
};

export const DEFAULT_SUB_SETTINGS: SystemSettings = {
  subLevel: "easy",
  elimStyle: "mix",
  negatives: false,
  mode: "watch",
  playSpeed: "classroom",
};

export const DEFAULT_ELIM_SETTINGS: SystemSettings = {
  subLevel: "easy",
  elimStyle: "mix",
  negatives: false,
  mode: "watch",
  playSpeed: "classroom",
};

export type SystemStep = {
  id: string;
  top: EquationLine;
  bottom: EquationLine;
  focus: "top" | "bottom" | "both";
  topCaption: string;
  bottomCaption: string;
  explanation: string;
  property: string;
  ask?: string;
  banner?: { kicker: string; text: string };
  annotation?: EquationLine;
  /** The other equation stays visible, but faded, until this phase uses it. */
  ghost?: "top" | "bottom";
};

export type SystemProblem = {
  method: SystemMethod;
  steps: SystemStep[];
  structureLabel: string;
  prompt: string;
  solution: { x: number; y: number };
  holds: (x: number, y: number) => boolean;
};
