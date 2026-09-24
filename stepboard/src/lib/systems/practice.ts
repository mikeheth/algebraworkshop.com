import type { SystemMethod, SystemStep } from "./types.ts";

export type SystemChoice = {
  id: string;
  label: string;
  correct: boolean;
  whyWrong?: string;
};

const SUB_DISTRACTORS: { label: string; why: string }[] = [
  {
    label: "Distribute in equation 2",
    why: "Distribute only when more than one term is inside the parentheses. A lone letter was only marked as the substitution.",
  },
  {
    label: "Combine like terms in equation 2",
    why: "Combine only after like terms are actually sitting next to each other.",
  },
  {
    label: "Divide both sides of equation 1 by 2",
    why: "Check which equation still needs that division.",
  },
  {
    label: "Subtract 2 from both sides of equation 1",
    why: "That would change equation 1. It is not the next move.",
  },
  {
    label: "Add 2 to both sides of equation 2",
    why: "Adding 2 is not what undoes the term that is in the way.",
  },
  {
    label: "Substitute a number for the variable in equation 1",
    why: "Substitute into the equation that does not already name that letter.",
  },
];

const ELIM_DISTRACTORS: { label: string; why: string }[] = [
  {
    label: "Distribute",
    why: "Not yet. If a letter was just replaced, the parentheses stay closed until the next step.",
  },
  {
    label: "Combine like terms",
    why: "Combine only after like terms are actually sitting next to each other.",
  },
  {
    label: "Add the equations",
    why: "Adding is an elimination move. It is not the next step here.",
  },
  {
    label: "Subtract the equations",
    why: "Subtracting is an elimination move. It is not the next step here.",
  },
  {
    label: "Multiply equation 1 by 2",
    why: "Multiplying lines up a column for elimination. It is not the next step here.",
  },
];

export function canAskSystem(steps: SystemStep[], shownCount: number): boolean {
  return !!steps[shownCount]?.ask;
}

export function systemChoices(
  steps: SystemStep[],
  shownCount: number,
  method: SystemMethod = "elimination",
): SystemChoice[] {
  const ask = steps[shownCount]?.ask;
  if (!ask) return [];
  const pool = method === "substitution" ? SUB_DISTRACTORS : ELIM_DISTRACTORS;
  const correct: SystemChoice = { id: "ok", label: ask, correct: true };
  const used = new Set([ask]);
  const out: SystemChoice[] = [correct];
  for (const item of pool) {
    if (out.length >= 4) break;
    if (used.has(item.label)) continue;
    if (ask === item.label) continue;
    used.add(item.label);
    out.push({ id: `d${out.length}`, label: item.label, correct: false, whyWrong: item.why });
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}
