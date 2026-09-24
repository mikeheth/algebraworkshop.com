import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateElimination } from "./elimination.ts";
import { generateSubstitution } from "./substitution.ts";
import { DEFAULT_ELIM_SETTINGS, DEFAULT_SUB_SETTINGS } from "./types.ts";

describe("systems", () => {
  it("substitution easy uses a number, medium an expression, advanced isolates first", () => {
    for (let i = 0; i < 20; i++) {
      const easy = generateSubstitution({ ...DEFAULT_SUB_SETTINGS, subLevel: "easy" });
      assert.equal(easy.holds(easy.solution.x, easy.solution.y), true, easy.structureLabel);
      assert.match(easy.structureLabel, /^Easy/);
      assert.equal(easy.steps.some((s) => s.ask === "Distribute in equation 2"), false);
      assert.ok(easy.steps.some((s) => s.ask?.startsWith("Substitute") && !s.ask.includes("(")));

      const medium = generateSubstitution({ ...DEFAULT_SUB_SETTINGS, subLevel: "medium" });
      assert.equal(medium.holds(medium.solution.x, medium.solution.y), true, medium.structureLabel);
      const mReplace = medium.steps.findIndex((s) => s.ask?.startsWith("Substitute"));
      assert.ok(mReplace >= 0);
      const replaceAsk = medium.steps[mReplace]!.ask ?? "";
      assert.match(replaceAsk, /Substitute \(.+\) for \w in equation 2/);
      const bare = /Substitute \([xy]\) for /.test(replaceAsk);
      const nextAsk = medium.steps[mReplace + 1]?.ask;
      assert.equal(
        nextAsk,
        bare ? "Combine like terms in equation 2" : "Distribute in equation 2",
        replaceAsk,
      );

      const advanced = generateSubstitution({ ...DEFAULT_SUB_SETTINGS, subLevel: "advanced" });
      assert.equal(advanced.holds(advanced.solution.x, advanced.solution.y), true, advanced.structureLabel);
      const isolate = advanced.steps.findIndex(
        (s) => s.ask?.startsWith("Subtract") || s.ask?.startsWith("Divide"),
      );
      const aReplace = advanced.steps.findIndex((s) => s.ask?.includes("("));
      assert.ok(isolate >= 0 && aReplace > isolate, advanced.structureLabel);
    }
  });

  it("elimination cancels a column and checks the pair", () => {
    for (const elimStyle of ["add", "subtract", "scale", "mix"] as const) {
      for (let i = 0; i < 12; i++) {
        const p = generateElimination({ ...DEFAULT_ELIM_SETTINGS, elimStyle });
        assert.equal(p.holds(p.solution.x, p.solution.y), true, p.structureLabel);
        const asks = p.steps.map((s) => s.ask).filter(Boolean).join(" | ");
        if (elimStyle === "add") assert.match(asks, /Add the equations/);
        if (elimStyle === "subtract") assert.match(asks, /Subtract the equations/);
        if (elimStyle === "scale") assert.match(asks, /Multiply equation 1/);
        assert.equal(p.steps.at(-1)?.banner?.kicker, "Check");
      }
    }
  });
});
