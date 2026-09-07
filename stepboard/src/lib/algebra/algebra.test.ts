import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateSides, equationPlain } from "./format.ts";
import { generateProblem } from "./generate.ts";
import { nextPracticeIndex, practiceChoices, solveByDividingAllTerms, solveByDividingGroup, solveEquation } from "./solve.ts";
import { DEFAULT_SETTINGS, type LinearEq, type Settings } from "./types.ts";
import {
  digitsInText,
  makeWordProblem,
  storyMustMention,
} from "./word-problems.ts";

function assertChecks(settings: Settings, n = 25) {
  for (let i = 0; i < n; i++) {
    const problem = generateProblem(settings);
    const values = evaluateSides(problem.eq, problem.solution);
    assert.equal(
      values.left,
      values.right,
      `sides diverge for ${problem.structureLabel}: ${values.left} vs ${values.right}`,
    );
    const solved = solveEquation(problem.eq, problem.solution);
    const last = solved.steps[solved.steps.length - 1];
    assert.equal(last!.isCheck, true);
    assert.ok(solved.steps.some((s) => s.isSolution));
  }
}

describe("algebra generator", () => {
  it("produces integer checks for one-step", () => {
    assertChecks({ ...DEFAULT_SETTINGS, stepCount: 1, difficulty: "easy" });
  });

  it("produces integer checks for two-step", () => {
    assertChecks({ ...DEFAULT_SETTINGS, stepCount: 2, difficulty: "easy" });
  });

  it("produces integer checks for three-step with both sides", () => {
    assertChecks({
      ...DEFAULT_SETTINGS,
      stepCount: 3,
      difficulty: "hard",
      negatives: true,
      bothSides: true,
      distribute: true,
      coefMin: 2,
      coefMax: 9,
      constMin: 1,
      constMax: 20,
    });
  });

  it("keeps the quotient on the board while multiplying", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 1,
      leftB: 0,
      rightA: 0,
      rightB: 4,
      presentation: { form: "quotient", innerB: 0, divisor: 4, right: 1 },
    };
    const { steps } = solveEquation(eq, 4);
    const mul = steps.find((s) => s.operation?.kind === "multiply");
    assert.ok(mul);
    assert.equal(mul.line.left[0]?.type, "frac");
    assert.equal(mul.line.right[0]?.type, "const");
    if (mul.line.right[0]?.type === "const") {
      assert.equal(mul.line.right[0].value, 1);
    }
    const sol = steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.notEqual(sol.id, mul.id);
    assert.equal(sol.line.left[0]?.type, "var");
    assert.equal(sol.line.right[0]?.type, "const");
    if (sol.line.right[0]?.type === "const") {
      assert.equal(sol.line.right[0].value, 4);
    }
  });

  it("writes inverse add/sub under the current equation", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 6,
      leftB: 6,
      rightA: 0,
      rightB: 48,
      presentation: { form: "standard" },
    };
    const { steps } = solveEquation(eq, 7);
    const sub = steps.find(
      (s) => s.operation?.kind === "subtract" && s.operation.value === 6,
    );
    assert.ok(sub);
    assert.equal(equationPlain(sub.line), "6x+6 = 48");
    assert.ok(sub.annotation);
    const after = steps[steps.indexOf(sub) + 1];
    assert.ok(after);
    assert.equal(equationPlain(after.line), "6x = 42");
    assert.equal(after.annotation, undefined);
  });

  it("shows the simplified line before asking the next practice move", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 6,
      leftB: 6,
      rightA: 0,
      rightB: 36,
      presentation: { form: "standard" },
    };
    const { steps } = solveEquation(eq, 5);
    const afterSub = nextPracticeIndex(steps, 0);
    assert.equal(equationPlain(steps[afterSub]!.line), "6x = 30");
    assert.equal(steps[afterSub]!.operation, undefined);
    const choices = practiceChoices(steps[afterSub]!, steps);
    assert.ok(
      choices.some((c) => c.correct && c.kind === "divide" && c.value === 6),
      "next question should be divide both sides by 6",
    );
    const first = practiceChoices(steps[0]!, steps);
    assert.ok(first.some((c) => c.correct && c.kind === "subtract" && c.value === 6));
  });

  it("divides both sides by a negative coefficient", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: -5,
      leftB: 0,
      rightA: 0,
      rightB: 20,
      presentation: { form: "standard" },
    };
    const { steps } = solveEquation(eq, -4);
    const div = steps.find((s) => s.operation?.kind === "divide");
    assert.ok(div);
    assert.equal(div.operation?.value, -5);
    assert.equal(equationPlain(div.line), "(-5x)/(-5) = (20)/(-5)");
    assert.equal(div.annotation, undefined);
    const given = steps[0];
    assert.ok(given);
    assert.equal(equationPlain(given.line), "-5x = 20");
    const sol = steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(equationPlain(sol.line), "x = -4");
    assert.notEqual(sol.id, div.id);
  });

  it("does not put a divide sign under the coefficient line", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 6,
      leftB: 0,
      rightA: 0,
      rightB: 90,
      presentation: { form: "standard" },
    };
    const { steps } = solveEquation(eq, 15);
    const coef = steps.find((s) => equationPlain(s.line) === "6x = 90");
    assert.ok(coef);
    assert.equal(coef.annotation, undefined);
    const div = steps.find((s) => s.operation?.kind === "divide");
    assert.ok(div);
    assert.equal(equationPlain(div.line), "(6x)/(6) = (90)/(6)");
    assert.equal(div.annotation, undefined);
  });

  it("attaches a word problem when asked", () => {
    const problem = generateProblem({
      ...DEFAULT_SETTINGS,
      wordProblem: true,
      stepCount: 2,
    });
    assert.ok(problem.word);
    assert.ok(problem.word.story.length > 20);
    assert.ok(problem.word.letStatement.includes(problem.eq.variable));
    assertStoryMatchesEquation(problem.eq, problem.word.story, problem.word.question);
  });

  it("writes a reconstructable combine story with give and collect", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 5,
      leftB: -5,
      rightA: 0,
      rightB: 43,
      presentation: { form: "combine", a: 5, b1: -10, b2: 5 },
    };
    const word = makeWordProblem(eq, 8, "Three-step · combine");
    assert.match(word.story, /cost \$5 each/i);
    assert.match(word.story, /gave \$10 to /);
    assert.match(word.story, /collected \$5 from /);
    assert.match(word.story, /43/);
    assert.doesNotMatch(word.story, /thinking of a number/i);
    assert.doesNotMatch(word.story, /same .+ operations/i);
    assert.doesNotMatch(word.letStatement, /when /i);
    assertStoryMatchesEquation(eq, word.story, word.question);
  });

  it("states the split and the per-box count in one clause", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 1,
      leftB: -5,
      rightA: 0,
      rightB: 56,
      presentation: { form: "quotient", innerB: -5, divisor: 7, right: 8 },
    };
    const word = makeWordProblem(eq, 61);
    assert.match(word.story, /giving 5 to /);
    assert.match(
      word.story,
      /splitting the rest into 7 boxes, each box held 8 /,
    );
    assert.doesNotMatch(word.story, /Each box holds/i);
    assertStoryMatchesEquation(eq, word.story, word.question);
  });

  it("lists operations when the unknown is negative", () => {
    const eq: LinearEq = {
      variable: "n",
      leftA: 3,
      leftB: 6,
      rightA: 0,
      rightB: -9,
      presentation: { form: "standard" },
    };
    const word = makeWordProblem(eq, -5);
    assert.match(word.story, /thinking of a number/i);
    assert.match(word.story, /multiply it by 3/i);
    assert.match(word.story, /add 6/i);
    assert.match(word.story, /−9|-9/);
    assert.doesNotMatch(word.story, /same .+ operations/i);
    assertStoryMatchesEquation(eq, word.story, word.question);
  });

  it("does not use months when the unknown is negative", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 3,
      leftB: 5,
      rightA: 4,
      rightB: 8,
      presentation: { form: "standard" },
    };
    const word = makeWordProblem(eq, -3);
    assert.doesNotMatch(`${word.story} ${word.question}`, /month/i);
    assert.match(word.story, /thinking of a number/i);
    assert.match(word.story, /3 times the number plus 5/i);
    assert.match(word.story, /4 times the number plus 8/i);
    assertStoryMatchesEquation(eq, word.story, word.question);
  });

  it("does not leave a negative leftover count of posters", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 1,
      leftB: -12,
      rightA: 0,
      rightB: -5,
      presentation: { form: "standard" },
    };
    const word = makeWordProblem(eq, 7);
    assert.doesNotMatch(
      `${word.story} ${word.question} ${word.unknown}`,
      /poster|ticket|muffin|notebook|smoothie/i,
    );
    assert.match(word.story, /gave \$12 to /);
    assert.match(word.story, /negative balance of \$5/);
    assert.match(word.story, /account allows negative balances/i);
    assertStoryMatchesEquation(eq, word.story, word.question);
  });

  it("says the account allows a negative balance when the cash total is negative", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 5,
      leftB: -20,
      rightA: 0,
      rightB: -5,
      presentation: { form: "standard" },
    };
    const word = makeWordProblem(eq, 3);
    assert.match(word.story, /negative balance of \$5/);
    assert.match(word.story, /account allows negative balances/i);
    assert.doesNotMatch(word.story, /net tally/i);
    assertStoryMatchesEquation(eq, word.story, word.question);
  });

  it("names the variable term when collecting like terms in practice", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 5,
      leftB: 2,
      rightA: 3,
      rightB: 10,
      presentation: { form: "standard" },
    };
    const { steps } = solveEquation(eq, 4);
    const choices = practiceChoices(steps[0]!, steps);
    const ok = choices.find((c) => c.correct);
    assert.ok(ok);
    assert.equal(ok.label, "Subtract 3x from both sides");
    assert.ok(
      choices.some((c) => c.label === "Subtract 3 from both sides" && !c.correct),
      "dropping the variable should be a distractor",
    );
  });

  it("treats dividing a grouping as a valid first move", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 2,
      leftB: 4,
      rightA: 0,
      rightB: 16,
      presentation: { form: "distribute", outer: 2, innerB: 2 },
    };
    const { steps } = solveEquation(eq, 6);
    const choices = practiceChoices(steps[0]!, steps, eq);
    const divide = choices.find((c) => c.kind === "divide");
    assert.ok(divide);
    assert.equal(divide.correct, true);
    assert.equal(divide.label, "Divide both sides by 2");
    assert.equal(divide.apply, "divide-group");
    assert.ok(choices.some((c) => c.correct && c.kind === "distribute"));
    assert.ok(
      !choices.some((c) =>
        (c.whyWrong ?? "").includes("split the parentheses unevenly"),
      ),
    );

    const alt = solveByDividingGroup(eq, 6);
    const div = alt.steps.find((s) => s.operation?.kind === "divide");
    assert.ok(div);
    assert.equal(equationPlain(div.line), "(2(x+2))/(2) = (16)/(2)");
    const simplified = alt.steps.find((s) => equationPlain(s.line) === "x+2 = 8");
    assert.ok(simplified);
    const sol = alt.steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(equationPlain(sol.line), "x = 6");
  });

  it("divides every term when extra terms sit beside the variable", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 2,
      leftB: 8,
      rightA: 0,
      rightB: 20,
      presentation: { form: "standard" },
    };
    const { steps } = solveEquation(eq, 6);
    const choices = practiceChoices(steps[0]!, steps, eq);
    const divide = choices.find((c) => c.apply === "divide-all-terms");
    assert.ok(divide);
    assert.equal(divide.correct, true);
    assert.equal(divide.label, "Divide both sides by 2");
    assert.ok(choices.some((c) => c.correct && c.kind === "subtract" && c.value === 8));

    const alt = solveByDividingAllTerms(eq, 6);
    const div = alt.steps.find((s) => s.operation?.kind === "divide");
    assert.ok(div);
    assert.equal(equationPlain(div.line), "(2x)/(2)+(8)/(2) = (20)/(2)");
    assert.match(div.explanation, /acceptable here because every term stays an integer/i);
    assert.match(div.explanation, /undo the constant first/i);
    const simplified = alt.steps.find((s) => equationPlain(s.line) === "x+4 = 10");
    assert.ok(simplified);
    const sol = alt.steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(equationPlain(sol.line), "x = 6");
  });

  it("does not offer a lone divide when extra terms would leave a fraction", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 3,
      leftB: 7,
      rightA: 0,
      rightB: 16,
      presentation: { form: "standard" },
    };
    const { steps } = solveEquation(eq, 3);
    const choices = practiceChoices(steps[0]!, steps, eq);
    const divide = choices.find((c) => c.kind === "divide");
    assert.ok(divide);
    assert.equal(divide.correct, false);
    assert.match(divide.whyWrong ?? "", /every term must be divided/i);
  });

  it("keeps the unknown a positive count in word-problem mode", () => {
    const s: Settings = {
      ...DEFAULT_SETTINGS,
      wordProblem: true,
      stepCount: 3,
      difficulty: "hard",
      negatives: true,
      bothSides: true,
      distribute: true,
      coefMin: 2,
      coefMax: 9,
      constMin: 1,
      constMax: 20,
    };
    for (let i = 0; i < 30; i++) {
      const problem = generateProblem(s);
      assert.ok(
        problem.solution > 0,
        `word-problem unknown must be a positive count: ${problem.word?.story}`,
      );
    }
  });

  it("keeps word problems reconstructable across generators", () => {
    const settings: Settings[] = [
      { ...DEFAULT_SETTINGS, wordProblem: true, stepCount: 1 },
      { ...DEFAULT_SETTINGS, wordProblem: true, stepCount: 2 },
      {
        ...DEFAULT_SETTINGS,
        wordProblem: true,
        stepCount: 3,
        difficulty: "hard",
        negatives: true,
        bothSides: true,
        distribute: true,
        coefMin: 2,
        coefMax: 9,
        constMin: 1,
        constMax: 20,
      },
    ];
    for (const s of settings) {
      for (let i = 0; i < 20; i++) {
        const problem = generateProblem(s);
        assert.ok(problem.word, problem.structureLabel);
        assert.ok(
          problem.solution > 0,
          `word-problem unknown must be a positive count: ${problem.word.story}`,
        );
        assert.doesNotMatch(
          problem.word.story,
          /same .+ operations as this equation/i,
        );
        assert.doesNotMatch(
          `${problem.word.story} ${problem.word.question} ${problem.word.unknown}`,
          /has -+\d+ left|has −\d+ left|there were -/i,
        );
        if (/negative balance/i.test(problem.word.story)) {
          assert.match(
            problem.word.story,
            /account allows negative balances/i,
            problem.word.story,
          );
        }
        assert.doesNotMatch(problem.word.story, /is short \$|net tally is −/i);
        assertStoryMatchesEquation(
          problem.eq,
          problem.word.story,
          problem.word.question,
        );
      }
    }
  });
});

function assertStoryMatchesEquation(
  eq: LinearEq,
  story: string,
  question: string,
) {
  const required = storyMustMention(eq);
  const text = `${story} ${question}`;
  const digits = digitsInText(text);
  for (const n of required) {
    assert.ok(
      digits.includes(n),
      `story missing ${n} for ${JSON.stringify(eq.presentation)} / ${eq.leftA}x+${eq.leftB}=${eq.rightA}x+${eq.rightB}: ${story}`,
    );
  }
  const allowed = new Set(required);
  allowed.add(1);
  for (const n of digits) {
    assert.ok(allowed.has(n), `story has extra number ${n}: ${story}`);
  }
}
