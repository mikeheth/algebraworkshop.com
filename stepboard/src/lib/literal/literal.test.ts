import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { equationPlain } from "../algebra/format.ts";
import { FORMULAS } from "./formulas.ts";
import { generateLiteral } from "./generate.ts";
import { literalPracticeChoices } from "./practice.ts";
import { plain, solveLiteral } from "./solve.ts";
import { DEFAULT_LIT_SETTINGS } from "./types.ts";

describe("literal equations", () => {
  it("isolates a in F = ma", () => {
    const spec = FORMULAS.find((f) => f.id === "force")!;
    const steps = solveLiteral(spec, "a");
    const sol = steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(plain(sol.line.left), "a");
    assert.match(plain(sol.line.right), /F/);
    assert.match(plain(sol.line.right), /m/);
    assert.equal(sol.line.rel, "=");
    assert.ok(steps.some((s) => s.isCheck));
    assert.ok(steps.every((s) => (s.line.rel ?? "=") === "="));
  });

  it("isolates x in y = mx + b", () => {
    const spec = FORMULAS.find((f) => f.id === "slope")!;
    const steps = solveLiteral(spec, "x");
    const sol = steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(plain(sol.line.left), "x");
    assert.match(plain(sol.line.right), /y/);
    assert.match(plain(sol.line.right), /b/);
    assert.match(plain(sol.line.right), /m/);
  });

  it("isolates l in P = 2l + 2w", () => {
    const spec = FORMULAS.find((f) => f.id === "perimeter")!;
    const steps = solveLiteral(spec, "l");
    const sol = steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(plain(sol.line.left), "l");
    assert.match(plain(sol.line.right), /P/);
    assert.match(plain(sol.line.right), /w/);
  });

  it("isolates C in the Fahrenheit formula", () => {
    const spec = FORMULAS.find((f) => f.id === "temp")!;
    const steps = solveLiteral(spec, "C");
    const sol = steps.find((s) => s.isSolution);
    assert.ok(sol);
    assert.equal(plain(sol.line.left), "C");
    assert.match(plain(sol.line.right), /F/);
    assert.match(plain(sol.line.right), /32/);
  });

  it("solves every catalog formula for each listed letter", () => {
    for (const spec of FORMULAS) {
      for (const target of spec.solveFor) {
        const steps = solveLiteral(spec, target);
        assert.ok(steps.length >= 3, `${spec.id} for ${target}`);
        const sol = steps.find((s) => s.isSolution);
        assert.ok(sol, `${spec.id} for ${target} missing solution`);
        assert.equal(plain(sol.line.left), target, `${spec.id} left is not ${target}: ${plain(sol.line.left)}`);
        assert.ok(steps.every((s) => (s.line.rel ?? "=") === "="));
      }
    }
  });

  it("generates one-step products only when asked", () => {
    for (let i = 0; i < 20; i++) {
      const p = generateLiteral({ ...DEFAULT_LIT_SETTINGS, stepFilter: 1 });
      assert.equal(p.spec.steps, 1);
      assert.ok(p.steps.some((s) => s.isSolution));
    }
  });

  it("attaches a numeric twin when asked", () => {
    for (let i = 0; i < 15; i++) {
      const p = generateLiteral({ ...DEFAULT_LIT_SETTINGS, numericTwin: true });
      assert.ok(p.twin, p.spec.id);
      assert.match(p.twin.note, /same/i);
    }
  });

  it("parenthesizes two number factors in the twin so they are not a two-digit number", () => {
    let hits = 0;
    for (let i = 0; i < 40; i++) {
      const p = generateLiteral({
        ...DEFAULT_LIT_SETTINGS,
        stepFilter: 2,
        numericTwin: true,
      });
      if (p.spec.id !== "slope" && p.spec.id !== "motion") continue;
      if (p.target !== "b" && p.target !== "u") continue;
      hits += 1;
      const shown = equationPlain(p.twin!.line);
      assert.match(shown, /\(\d+\)\(\d+\)/, shown);
    }
    assert.ok(hits > 0, "expected at least one solve-for-addend twin");
  });

  it("starts the check by restating the original formula", () => {
    for (const spec of FORMULAS) {
      const target = spec.solveFor[0]!;
      const steps = solveLiteral(spec, target);
      const orig = steps.find((s) => s.isOriginal);
      const check = steps.find((s) => s.isCheck);
      assert.ok(orig && check, spec.id);
      assert.equal(
        equationPlain(check.line),
        equationPlain(orig.line),
        spec.id,
      );
      assert.match(check.explanation, /Substitute/i);
    }
  });

  it("divides by the leftover product in one step", () => {
    const spec = FORMULAS.find((f) => f.id === "volume")!;
    const steps = solveLiteral(spec, "h");
    const divides = steps.filter((s) => s.operation?.kind === "divide");
    assert.equal(divides.length, 1);
    assert.equal(divides[0]!.operation?.variable, "lw");
    const sol = steps.find((s) => s.isSolution)!;
    assert.equal(plain(sol.line.left), "h");
    assert.match(plain(sol.line.right), /V/);
  });

  it("offers a correct inverse in practice", () => {
    const spec = FORMULAS.find((f) => f.id === "force")!;
    const steps = solveLiteral(spec, "a");
    const first = literalPracticeChoices(steps[0]!, steps);
    assert.ok(first.some((c) => c.correct && c.kind === "divide"));
  });

  it("asks for the reciprocal of 9/5 on the Fahrenheit formula", () => {
    const spec = FORMULAS.find((f) => f.id === "temp")!;
    const steps = solveLiteral(spec, "C");
    const afterSub = steps.find((s) => /32 cancels/i.test(s.explanation));
    assert.ok(afterSub);
    const choices = literalPracticeChoices(afterSub, steps);
    const ok = choices.find((c) => c.correct);
    assert.ok(ok);
    assert.match(ok.label, /reciprocal of 9\/5/i);
    assert.ok(!choices.some((c) => c.correct && /by 5$/.test(c.label)));
    assert.ok(choices.some((c) => /by 5$/.test(c.label) && !c.correct));
  });
});
