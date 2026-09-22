import { pick } from "../algebra/random.ts";
import { formulasFor } from "./formulas.ts";
import { appendNowSolve, solveLiteral } from "./solve.ts";
import type { LitProblem, LitSettings } from "./types.ts";
import { makeLitWord, wordTargets } from "./word-problems.ts";

export function generateLiteral(settings: LitSettings): LitProblem {
  const pool = formulasFor(settings.stepFilter);
  const wordPool = settings.wordProblem ? pool.filter((s) => wordTargets(s).length > 0) : [];
  const use = settings.wordProblem && wordPool.length ? wordPool : pool.length ? pool : formulasFor("mix");
  const spec = pick(use);
  const targets = settings.wordProblem ? wordTargets(spec) : spec.solveFor;
  const target = pick(targets.length ? targets : spec.solveFor);
  const steps = solveLiteral(spec, target);
  const problem: LitProblem = {
    spec,
    target,
    steps,
    structureLabel: `${spec.steps === 1 ? "One-step" : "Two-step"} · ${spec.name} · solve for ${target}`,
    prompt: `Solve for ${target}.`,
  };
  if (settings.wordProblem) {
    const word = makeLitWord(spec, target);
    if (word) {
      problem.word = {
        story: word.story,
        question: word.question,
        letStatement: word.letStatement,
      };
      problem.prompt = word.question;
      appendNowSolve(problem.steps, word);
    }
  }
  return problem;
}