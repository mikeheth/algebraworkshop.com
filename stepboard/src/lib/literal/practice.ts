import type { PracticeChoice, SolveStep } from "../algebra/types.ts";
import { nextPracticeIndex } from "../algebra/solve.ts";

function labelFor(
  kind: PracticeChoice["kind"],
  value?: number,
  variable?: string,
): string {
  const t =
    variable && value != null && Math.abs(value) !== 1
      ? `${value}${variable}`
      : variable
        ? variable
        : value != null
          ? String(value)
          : "";
  switch (kind) {
    case "add":
      return `Add ${t} to both sides`;
    case "subtract":
      return `Subtract ${t} from both sides`;
    case "multiply":
      return `Multiply both sides by ${t}`;
    case "divide":
      return `Divide both sides by ${t}`;
    case "distribute":
      return "Distribute";
    case "combine":
      return "Combine like terms";
    case "check":
      return "Swap both sides";
  }
}

export function literalPracticeChoices(current: SolveStep, all: SolveStep[]): PracticeChoice[] {
  const idx = all.findIndex((s) => s.id === current.id);
  let next: SolveStep | undefined;
  for (let i = idx + 1; i < all.length; i++) {
    const s = all[i]!;
    if (s.isCheck) continue;
    if (s.operation) {
      next = s;
      break;
    }
  }
  if (!next?.operation) return [];

  const op = next.operation;
  const correct: PracticeChoice = {
    id: "ok",
    label: labelFor(op.kind, op.value, op.variable),
    kind: op.kind,
    value: op.value,
    variable: op.variable,
    correct: true,
  };

  const used = new Set([correct.label]);
  const distractors: PracticeChoice[] = [];
  const push = (c: PracticeChoice) => {
    if (used.has(c.label)) return;
    used.add(c.label);
    distractors.push(c);
  };

  if (op.kind === "divide") {
    push({
      id: "d-mul",
      label: labelFor("multiply", op.value, op.variable),
      kind: "multiply",
      value: op.value,
      variable: op.variable,
      correct: false,
      whyWrong: "Multiplication stacks another factor. Divide to undo a product.",
    });
    push({
      id: "d-sub",
      label: labelFor("subtract", op.value, op.variable),
      kind: "subtract",
      value: op.value,
      variable: op.variable,
      correct: false,
      whyWrong: "Subtraction does not undo multiplication. Use division.",
    });
  }
  if (op.kind === "subtract") {
    push({
      id: "d-add",
      label: labelFor("add", op.value, op.variable),
      kind: "add",
      value: op.value,
      variable: op.variable,
      correct: false,
      whyWrong: "Adding that term stacks more of it. Subtract so it cancels.",
    });
    push({
      id: "d-div",
      label: labelFor("divide", op.value ?? 2, op.variable),
      kind: "divide",
      value: op.value ?? 2,
      variable: op.variable,
      correct: false,
      whyWrong: "Undo the added term first. Division comes after that term is gone.",
    });
  }
  if (op.kind === "multiply") {
    if (/reciprocal/i.test(op.variable ?? "")) {
      push({
        id: "d-times-5",
        label: "Multiply both sides by 5",
        kind: "multiply",
        value: 5,
        correct: false,
        whyWrong:
          "5 is only the numerator. Multiply by the reciprocal of 9/5, which is 5/9.",
      });
      push({
        id: "d-times-frac",
        label: "Multiply both sides by 9/5",
        kind: "multiply",
        correct: false,
        whyWrong:
          "9/5 is already the coefficient. Multiply by its reciprocal, 5/9, so those factors cancel.",
      });
      push({
        id: "d-div-5",
        label: "Divide both sides by 5",
        kind: "divide",
        value: 5,
        correct: false,
        whyWrong: "Dividing by 5 does not undo a factor of 9/5. Multiply by 5/9.",
      });
    } else {
      push({
        id: "d-div",
        label: labelFor("divide", op.value, op.variable),
        kind: "divide",
        value: op.value,
        variable: op.variable,
        correct: false,
        whyWrong: "The coefficient is a fraction. Multiply by its reciprocal.",
      });
      push({
        id: "d-sub",
        label: "Subtract 32 from both sides",
        kind: "subtract",
        value: 32,
        correct: false,
        whyWrong: "32 is already gone. Multiply by the reciprocal of 9/5.",
      });
    }
  }
  push({
    id: "d-swap",
    label: "Swap both sides",
    kind: "check",
    correct: false,
    whyWrong: "Swapping sides does not isolate the letter. Use inverse operations.",
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

export { nextPracticeIndex };
