import type { FormulaSpec } from "./types.ts";

export const FORMULAS: FormulaSpec[] = [
  {
    id: "force",
    name: "Force",
    context: "Newton’s second law",
    steps: 1,
    shape: { type: "product", isolated: "F", factors: ["m", "a"] },
    solveFor: ["m", "a"],
  },
  {
    id: "distance",
    name: "Distance",
    context: "Constant speed",
    steps: 1,
    shape: { type: "product", isolated: "d", factors: ["r", "t"] },
    solveFor: ["r", "t"],
  },
  {
    id: "area",
    name: "Rectangle area",
    context: "Length times width",
    steps: 1,
    shape: { type: "product", isolated: "A", factors: ["l", "w"] },
    solveFor: ["l", "w"],
  },
  {
    id: "ohms",
    name: "Ohm’s law",
    context: "Voltage, current, resistance",
    steps: 1,
    shape: { type: "product", isolated: "V", factors: ["I", "R"] },
    solveFor: ["I", "R"],
  },
  {
    id: "volume",
    name: "Box volume",
    context: "Length, width, and height",
    steps: 1,
    shape: { type: "product", isolated: "V", factors: ["l", "w", "h"] },
    solveFor: ["l", "w", "h"],
  },
  {
    id: "interest",
    name: "Simple interest",
    context: "Principal, rate, and time",
    steps: 1,
    shape: { type: "product", isolated: "I", factors: ["P", "r", "t"] },
    solveFor: ["P", "r", "t"],
  },
  {
    id: "circ",
    name: "Circumference",
    context: "A circle",
    steps: 1,
    shape: { type: "product", isolated: "C", coef: 2, factors: ["π", "r"] },
    solveFor: ["r"],
  },
  {
    id: "slope",
    name: "Slope-intercept",
    context: "A line",
    steps: 2,
    shape: { type: "linear", y: "y", m: "m", x: "x", b: "b" },
    solveFor: ["x", "b"],
  },
  {
    id: "motion",
    name: "Velocity",
    context: "Constant acceleration",
    steps: 2,
    shape: { type: "linear", y: "v", m: "a", x: "t", b: "u" },
    solveFor: ["t", "u"],
  },
  {
    id: "perimeter",
    name: "Rectangle perimeter",
    context: "Two lengths and two widths",
    steps: 2,
    shape: { type: "scaled-sum", p: "P", coef: 2, a: "l", b: "w" },
    solveFor: ["l", "w"],
  },
  {
    id: "generic",
    name: "Linear formula",
    context: "The same two-step as Stepboard, with letters",
    steps: 2,
    shape: { type: "axc", a: "a", x: "x", b: "b", c: "c" },
    solveFor: ["x"],
  },
  {
    id: "temp",
    name: "Fahrenheit",
    context: "From Celsius",
    steps: 2,
    shape: { type: "temp-f" },
    solveFor: ["C"],
  },
];

export function formulasFor(stepFilter: 1 | 2 | "mix"): FormulaSpec[] {
  if (stepFilter === "mix") return FORMULAS;
  return FORMULAS.filter((f) => f.steps === stepFilter);
}
