import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateSides, equationPlain } from "./format.ts";
import { generateProblem } from "./generate.ts";
import { nextPracticeIndex, practiceChoices, solveByDividingAllTerms, solveByDividingGroup, solveEquation } from "./solve.ts";
import { DEFAULT_SETTINGS, DIFFICULTY_PRESETS, type LinearEq, type Settings } from "./types.ts";
import {
  countDomainNote,
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
    assert.doesNotMatch(word.story, /points? in each round/i);
    assert.doesNotMatch(`${word.story} ${word.question}`, /month|ticket|poster/i);
    assert.match(word.story, /3/);
    assert.match(word.story, /6/);
    assert.match(word.story, /−9|-9/);
    assert.equal(word.nonNegative, false);
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

describe("inequalities", () => {
  it("reverses the sign when dividing by a negative", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: -5,
      leftB: 0,
      rightA: 0,
      rightB: 20,
      presentation: { form: "standard" },
      relation: ">",
    };
    const { steps } = solveEquation(eq, -4);
    const div = steps.find((s) => s.operation?.kind === "divide");
    assert.ok(div);
    assert.equal(div.operation?.reverse, true);
    assert.equal(div.line.rel, "<");
    const sol = steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(sol.line.rel, "<");
    assert.match(sol.explanation, /x < −?4|x < -4/);
  });

  it("does not reverse when dividing by a positive", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 4,
      leftB: 8,
      rightA: 0,
      rightB: 24,
      presentation: { form: "standard" },
      relation: "≥",
    };
    const { steps } = solveEquation(eq, 4);
    const div = steps.find((s) => s.operation?.kind === "divide");
    assert.ok(div);
    assert.equal(div.operation?.reverse, false);
    const sol = steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(sol.line.rel, "≥");
  });

  it("generates integer inequality problems", () => {
    for (let i = 0; i < 20; i++) {
      const problem = generateProblem(
        { ...DEFAULT_SETTINGS, stepCount: 2, negatives: true },
        "inequalities",
      );
      assert.ok(problem.eq.relation && problem.eq.relation !== "=");
      assert.ok(problem.steps.some((s) => s.isSolution));
      const last = problem.steps[problem.steps.length - 1];
      assert.match(last!.explanation, /is true/);
    }
  });

  it("offers reverse-the-sign as the correct divide move", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: -5,
      leftB: 0,
      rightA: 0,
      rightB: 20,
      presentation: { form: "standard" },
      relation: ">",
    };
    const { steps } = solveEquation(eq, -4);
    const choices = practiceChoices(steps[0]!, steps);
    const ok = choices.find((c) => c.correct);
    assert.ok(ok);
    assert.equal(ok.reverse, true);
    assert.match(ok.label, /reverse the inequality/i);
    const distractor = choices.find((c) => c.id === "d-no-flip");
    assert.ok(distractor);
    assert.equal(distractor.correct, false);
    assert.match(distractor.whyWrong ?? "", /reverses the inequality/);
  });

  it("checks a test point from the solution set", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 2,
      leftB: 4,
      rightA: 0,
      rightB: 12,
      presentation: { form: "standard" },
      relation: "<",
    };
    const { steps } = solveEquation(eq, 4);
    const checks = steps.filter((s) => s.isCheck);
    assert.ok(checks.length >= 2);
    assert.match(checks[0]!.explanation, /x = 3/);
    const last = checks[checks.length - 1]!;
    assert.match(last.explanation, /is true/);
  });

  it("writes inequality money stories as a budget, not a tacked-on bound", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 4,
      leftB: 8,
      rightA: 0,
      rightB: 40,
      presentation: { form: "standard" },
      relation: "≤",
    };
    const word = makeWordProblem(eq, 8);
    const text = `${word.story} ${word.question}`;
    assert.doesNotMatch(text, /Treat the ending number as a bound/i);
    assert.doesNotMatch(word.story, /The total is/i);
    assert.match(word.story, /only had \$40 to spend/i);
    assert.match(word.question, /could .+ have bought/i);
    assert.match(word.question, /maximum, not an exact total/i);
    assertStoryMatchesEquation(eq, word.story, word.question);
  });

  it("does not charge for a ride when the item is tickets", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 4,
      leftB: 8,
      rightA: 0,
      rightB: 40,
      presentation: { form: "standard" },
      relation: "≤",
    };
    let ticketStories = 0;
    for (let i = 0; i < 60; i++) {
      const word = makeWordProblem(eq, 8);
      const text = `${word.story} ${word.question}`;
      assert.doesNotMatch(text, /for a ride/i);
      if (/\btickets?\b/i.test(word.story)) ticketStories += 1;
    }
    assert.ok(ticketStories > 0, "expected some ticket stories in the sample");
  });

  it("keeps inequality word problems reconstructable", () => {
    const s: Settings = {
      ...DEFAULT_SETTINGS,
      wordProblem: true,
      stepCount: 2,
      negatives: true,
      difficulty: "medium",
    };
    for (let i = 0; i < 25; i++) {
      const problem = generateProblem(s, "inequalities");
      assert.ok(problem.word, problem.structureLabel);
      assert.doesNotMatch(
        `${problem.word.story} ${problem.word.question}`,
        /Treat the ending number as a bound/i,
      );
      assertStoryMatchesEquation(
        problem.eq,
        problem.word.story,
        problem.word.question,
      );
    }
  });

  it("writes two-shop and two-saver both-sides inequality stories", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: 2,
      leftB: 20,
      rightA: 5,
      rightB: 8,
      presentation: { form: "standard" },
      relation: "<",
    };
    let shops = 0;
    let saves = 0;
    for (let i = 0; i < 40; i++) {
      const word = makeWordProblem(eq, 4);
      const text = `${word.story} ${word.question}`;
      assert.doesNotMatch(word.story, /thinking of a number/i);
      assert.doesNotMatch(text, /Treat that number as a (maximum|minimum)/i);
      assert.doesNotMatch(word.story, /points? in each round/i);
      assert.equal(word.nonNegative, true);
      if (/charges \$/.test(word.story)) {
        shops += 1;
        assert.match(word.story, /\$20 plus \$2 per /);
        assert.match(word.story, /\$8 plus \$5 per /);
        assert.match(word.question, /better deal/i);
        assert.ok(word.countNoun);
      } else if (/saves \$/.test(word.story)) {
        saves += 1;
        assert.match(word.story, /has \$20 and saves \$2 each week/);
        assert.match(word.story, /has \$8 and saves \$5 each week/);
        assert.equal(word.countNoun, "weeks");
      }
      assertStoryMatchesEquation(eq, word.story, word.question);
    }
    assert.ok(shops > 0, "expected two-shop stories");
    assert.ok(saves > 0, "expected two-saver stories");
  });

  it("generates both-sides word problems in stretch inequalities", () => {
    const s: Settings = {
      ...DEFAULT_SETTINGS,
      ...DIFFICULTY_PRESETS.hard,
      difficulty: "hard",
      wordProblem: true,
      stepCount: 3,
      negatives: true,
      bothSides: true,
      distribute: true,
    };
    let both = 0;
    for (let i = 0; i < 40; i++) {
      const problem = generateProblem(s, "inequalities");
      assert.ok(problem.word, problem.structureLabel);
      assertStoryMatchesEquation(
        problem.eq,
        problem.word.story,
        problem.word.question,
      );
      if (problem.eq.rightA !== 0) {
        both += 1;
        assert.doesNotMatch(problem.word.story, /thinking of a number/i);
        assert.match(
          `${problem.word.story} ${problem.word.question}`,
          /charges \$|saves \$/,
        );
        assert.ok(problem.solution > 0);
        assert.ok(problem.eq.leftA > 0 && problem.eq.rightA > 0);
        assert.equal(problem.word.nonNegative, true);
      }
    }
    assert.ok(both >= 5, `expected several both-sides stories, got ${both}`);
  });

  it("does not tell a score story when the coefficient is negative", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: -7,
      leftB: 6,
      rightA: 0,
      rightB: -85,
      presentation: { form: "standard" },
      relation: "≥",
    };
    const seen = { dive: 0, overnight: 0, number: 0, other: 0 };
    for (let i = 0; i < 50; i++) {
      const word = makeWordProblem(eq, 13);
      assert.doesNotMatch(word.story, /points? in each round/i);
      assert.doesNotMatch(word.story, /bonus points/i);
      assert.doesNotMatch(word.story, /the score is then/i);
      assertStoryMatchesEquation(eq, word.story, word.question);
      if (/dives|sea level|elevation/i.test(word.story)) seen.dive += 1;
      else if (/overnight low/i.test(word.story)) seen.overnight += 1;
      else if (/thinking of a number/i.test(word.story)) seen.number += 1;
      else seen.other += 1;
    }
    assert.ok(seen.dive > 0, "expected some dive stories");
    assert.ok(seen.number > 0, "expected some number stories");
    assert.equal(seen.overnight, 0, "overnight-low needs a positive coefficient");
  });

  it("zero-floors discrete time stories and leaves number stories unbounded", () => {
    const eq: LinearEq = {
      variable: "x",
      leftA: -2,
      leftB: -1,
      rightA: 0,
      rightB: -7,
      presentation: { form: "standard" },
      relation: "≥",
    };
    let discrete = 0;
    let signed = 0;
    for (let i = 0; i < 40; i++) {
      const word = makeWordProblem(eq, 3);
      assert.doesNotMatch(word.story, /points? in each round/i);
      const { steps } = solveEquation(eq, 3);
      const sol = steps.find((s) => s.isSolution);
      assert.ok(sol);
      assert.equal(sol.line.rel, "≤");
      assert.doesNotMatch(sol.explanation, /can't be negative/);
      if (word.nonNegative && word.countNoun) {
        discrete += 1;
        const note = countDomainNote(
          sol.line.rel,
          3,
          "x",
          word.countNoun,
        );
        assert.match(note ?? "", /can't be negative/);
      } else {
        signed += 1;
        assert.equal(word.nonNegative, false);
      }
    }
    assert.ok(discrete > 0, "expected some discrete time stories");
    assert.ok(signed > 0, "expected some signed number/overnight stories");
  });

  it("writes a twice-the-sum number story", () => {
    const eq: LinearEq = {
      variable: "n",
      leftA: 2,
      leftB: 16,
      rightA: 0,
      rightB: 4,
      presentation: { form: "distribute", outer: 2, innerB: 8 },
      relation: "≤",
    };
    let hit = 0;
    for (let i = 0; i < 30; i++) {
      const word = makeWordProblem(eq, -6);
      assert.doesNotMatch(word.story, /points? in each round/i);
      if (/twice the sum of the number and 8/i.test(word.story)) {
        hit += 1;
        assert.equal(word.nonNegative, false);
      }
      assertStoryMatchesEquation(eq, word.story, word.question);
    }
    assert.ok(hit > 0, "expected a twice-the-sum story");
  });

  it("writes an overnight-low story for a signed two-step", () => {
    const eq: LinearEq = {
      variable: "n",
      leftA: 2,
      leftB: -4,
      rightA: 0,
      rightB: -10,
      presentation: { form: "standard" },
      relation: "<",
    };
    let hit = 0;
    for (let i = 0; i < 40; i++) {
      const word = makeWordProblem(eq, -3);
      assert.doesNotMatch(word.story, /points? in each round/i);
      if (/overnight low/i.test(word.story) && /colder than/i.test(word.story)) {
        hit += 1;
        assert.equal(word.nonNegative, false);
      }
      assertStoryMatchesEquation(eq, word.story, word.question);
    }
    assert.ok(hit > 0, "expected an overnight-low story");
  });

  it("writes a dive story for a negative rate", () => {
    const eq: LinearEq = {
      variable: "d",
      leftA: -8,
      leftB: 0,
      rightA: 0,
      rightB: -40,
      presentation: { form: "standard" },
      relation: "<",
    };
    let hit = 0;
    for (let i = 0; i < 40; i++) {
      const word = makeWordProblem(eq, 5);
      assert.doesNotMatch(word.story, /points? in each round/i);
      if (/dives 8 feet each minute/i.test(word.story)) {
        hit += 1;
        assert.equal(word.nonNegative, true);
        assert.equal(word.countNoun, "minutes");
      }
      assertStoryMatchesEquation(eq, word.story, word.question);
    }
    assert.ok(hit > 0, "expected a dive story");
  });

  it("does not constrain the graph when a negative unknown makes sense", () => {
    const eq: LinearEq = {
      variable: "n",
      leftA: 3,
      leftB: 6,
      rightA: 0,
      rightB: -9,
      presentation: { form: "standard" },
      relation: "<",
    };
    const word = makeWordProblem(eq, -5);
    assert.equal(word.nonNegative, false);
    assert.equal(word.countNoun, undefined);
  });

  it("leaves a non-story inequality unbounded on the left", () => {
    const problem = generateProblem(
      { ...DEFAULT_SETTINGS, stepCount: 1, negatives: true, wordProblem: false },
      "inequalities",
    );
    assert.equal(problem.word, undefined);
    const sol = problem.steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.doesNotMatch(sol.explanation ?? "", /can't be negative/);
  });

  it("names a discrete count for bought items, not for money or a number", () => {
    const items: LinearEq = {
      variable: "x",
      leftA: 4,
      leftB: 8,
      rightA: 0,
      rightB: 40,
      presentation: { form: "standard" },
      relation: "≤",
    };
    const word = makeWordProblem(items, 8);
    assert.ok(word.countNoun);
    assert.match(
      word.countNoun,
      /tickets|notebooks|smoothies|posters|muffins/i,
    );

    const money: LinearEq = {
      variable: "x",
      leftA: 1,
      leftB: -20,
      rightA: 0,
      rightB: -8,
      presentation: { form: "standard" },
      relation: "≤",
    };
    const cash = makeWordProblem(money, 12);
    assert.match(cash.unknown, /dollars/i);
    assert.equal(cash.countNoun, undefined);

    const number: LinearEq = {
      variable: "n",
      leftA: 3,
      leftB: 6,
      rightA: 0,
      rightB: -9,
      presentation: { form: "standard" },
      relation: "<",
    };
    const thinking = makeWordProblem(number, -5);
    assert.equal(thinking.countNoun, undefined);
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
