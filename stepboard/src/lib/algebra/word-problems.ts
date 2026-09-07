import { pick } from "./random";
import type { LinearEq, Presentation, WordProblem } from "./types";

const NAMES = [
  "Ava",
  "Miles",
  "Jordan",
  "Priya",
  "Noah",
  "Elena",
  "Kai",
  "Sofia",
  "Hassan",
  "Riley",
  "Mei",
  "Andre",
  "Luca",
  "Nia",
  "Theo",
  "Harper",
  "Josie",
  "Jim",
];

const ITEMS = [
  { singular: "ticket", plural: "tickets" },
  { singular: "notebook", plural: "notebooks" },
  { singular: "smoothie", plural: "smoothies" },
  { singular: "poster", plural: "posters" },
  { singular: "muffin", plural: "muffins" },
  { singular: "ride ticket", plural: "ride tickets" },
];

const COUNT_NOUN =
  /ticket|notebook|smoothie|poster|muffin|round|month|\bbox(?:es)?\b/i;

const PLACES = [
  "the school store",
  "the weekend market",
  "the community fair",
  "the corner cafe",
  "the art stall",
  "the book fair",
];

const FEES = [
  "a snack",
  "parking",
  "a drink",
  "a souvenir bag",
  "tax",
  "a ride",
];

/**
 * Build a story a student can translate into `eq` without seeing the algebra.
 * Every written coefficient and constant appears as a named quantity, and
 * each + / − / × / ÷ is an action (buy, give, collect, split, …).
 */
export function makeWordProblem(
  eq: LinearEq,
  solution: number,
  _structure?: string,
): WordProblem {
  const name = pick(NAMES);
  const others = NAMES.filter((n) => n !== name);
  const friendA = pick(others);
  const friendB = pick(others.filter((n) => n !== friendA));
  const item = pick(ITEMS);
  const place = pick(PLACES);
  const feeA = pick(FEES);
  const feeB = pick(FEES.filter((f) => f !== feeA));
  const v = eq.variable;
  const ctx: StoryCtx = {
    name,
    friendA,
    friendB,
    item,
    place,
    feeA,
    feeB,
    v,
  };

  const word = buildStory(eq, solution, ctx);
  const text = `${word.story} ${word.question} ${word.unknown}`;
  if (solution <= 0 && COUNT_NOUN.test(text)) return numberMachine(eq, ctx);
  return word;
}

function buildStory(eq: LinearEq, solution: number, ctx: StoryCtx): WordProblem {
  // Countable things (posters, months, rounds) cannot be a negative unknown.
  if (solution <= 0) return numberMachine(eq, ctx);

  const p = eq.presentation;
  if (p.form === "distribute") return distributeStory(eq, p, ctx);
  if (p.form === "combine") return combineStory(eq, p, ctx);
  if (p.form === "quotient") return quotientStory(p, ctx);
  if (eq.rightA !== 0) {
    if (eq.leftA > 0 && eq.rightA > 0) return bothSidesStory(eq, ctx);
    return bothSidesNumberStory(eq, ctx);
  }
  if (eq.leftB !== 0) return twoStepStory(eq, ctx);
  if (eq.leftA === 1 || eq.leftA === -1) return oneStepAddSub(eq, ctx);
  return oneStepMul(eq, ctx);
}

type Item = { singular: string; plural: string };

type StoryCtx = {
  name: string;
  friendA: string;
  friendB: string;
  item: Item;
  place: string;
  feeA: string;
  feeB: string;
  v: string;
};

function wp(
  ctx: StoryCtx,
  story: string,
  question: string,
  unknown: string,
): WordProblem {
  return {
    story,
    question,
    unknown,
    letStatement: `Let ${ctx.v} = ${unknown}.`,
  };
}

function dollars(n: number): string {
  return `$${Math.abs(n)}`;
}

function signedNum(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function moneyMove(amount: number, person: string): string {
  if (amount > 0) return `collected ${dollars(amount)} from ${person}`;
  return `gave ${dollars(amount)} to ${person}`;
}

function resultMoney(name: string, n: number): string {
  if (n > 0) return `The total is ${dollars(n)}`;
  if (n < 0) return negativeBalance(name, n);
  return "The total is $0";
}

function scoreMove(amount: number): string {
  if (amount > 0) return `gains ${amount} bonus points`;
  return `takes a ${Math.abs(amount)}-point penalty`;
}

function leftoverMoney(name: string, n: number): string {
  if (n > 0) return `${name} has ${dollars(n)} left`;
  if (n < 0) return negativeBalance(name, n);
  return `${name} has $0 left`;
}

function negativeBalance(name: string, n: number): string {
  return `${name} will have a negative balance of ${dollars(n)}. The account allows negative balances.`;
}

function combineStory(
  eq: LinearEq,
  p: Extract<Presentation, { form: "combine" }>,
  ctx: StoryCtx,
): WordProblem {
  const { a, b1, b2 } = p;
  const total = eq.rightB;
  const { name, item, place, friendA, friendB, feeA, feeB } = ctx;

  if (a < 0) {
    return wp(
      ctx,
      `${name} loses ${Math.abs(a)} point${Math.abs(a) === 1 ? "" : "s"} in each round, ${scoreMove(b1)}, and ${scoreMove(b2)}. The score is then ${signedNum(total)}.`,
      `How many rounds did ${name} play?`,
      "the number of rounds",
    );
  }

  if (a === 1) {
    if (b1 > 0 && b2 > 0) {
      return wp(
        ctx,
        `${name} started with some money. Then ${name} paid ${dollars(b1)} for ${feeA} and ${dollars(b2)} for ${feeB}. ${resultMoney(name, total)}.`,
        `How much money did ${name} start with?`,
        `the amount ${name} started with, in dollars`,
      );
    }
    return wp(
      ctx,
      `${name} started with some money. Then ${name} ${moneyMove(b1, friendA)} and ${moneyMove(b2, friendB)}. ${leftoverMoney(name, total)}.`,
      `How much money did ${name} start with?`,
      `the amount ${name} started with, in dollars`,
    );
  }

  const cost = `${cap(item.plural)} cost ${dollars(a)} each.`;
  if (b1 > 0 && b2 > 0) {
    return wp(
      ctx,
      `${cost} ${name} bought some ${item.plural} at ${place} and also paid ${dollars(b1)} for ${feeA} and ${dollars(b2)} for ${feeB}. ${resultMoney(name, total)}.`,
      `How many ${item.plural} did ${name} buy?`,
      `the number of ${item.plural} ${name} bought`,
    );
  }

  return wp(
    ctx,
    `${cost} ${name} bought some ${item.plural} at ${place}, ${moneyMove(b1, friendA)}, and ${moneyMove(b2, friendB)}. ${leftoverMoney(name, total)}.`,
    `How many ${item.plural} did ${name} buy?`,
    `the number of ${item.plural} ${name} bought`,
  );
}

function distributeStory(
  eq: LinearEq,
  p: Extract<Presentation, { form: "distribute" }>,
  ctx: StoryCtx,
): WordProblem {
  const { outer, innerB } = p;
  const total = eq.rightB;
  const { name, item } = ctx;

  if (outer < 0) return numberMachine(eq, ctx);

  if (innerB >= 0) {
    return wp(
      ctx,
      `${name} packed ${outer} identical bags. Each bag has one ${item.singular} plus ${dollars(innerB)} of extras. Altogether the bags cost ${dollars(total)}.`,
      `What is the price of one ${item.singular}?`,
      `the price of one ${item.singular}, in dollars`,
    );
  }

  return wp(
    ctx,
    `${name} bought ${outer} ${outer === 1 ? item.singular : item.plural}, each with a ${dollars(innerB)} coupon. The total charged was ${dollars(total)}.`,
    `What is the regular price of one ${item.singular}?`,
    `the regular price of one ${item.singular}, in dollars`,
  );
}

function quotientStory(
  p: Extract<Presentation, { form: "quotient" }>,
  ctx: StoryCtx,
): WordProblem {
  const { innerB, divisor, right } = p;
  const { name, item, place, friendA } = ctx;
  const eachBox = `each box held ${countNoun(right, item)}`;

  if (right < 0) {
    return numberMachine(
      {
        variable: ctx.v,
        leftA: 1,
        leftB: innerB,
        rightA: 0,
        rightB: right * divisor,
        presentation: p,
      },
      ctx,
    );
  }

  if (innerB === 0) {
    return wp(
      ctx,
      `${name} had a pile of ${item.plural}. After splitting them into ${divisor} boxes, ${eachBox}.`,
      `How many ${item.plural} were in the pile?`,
      `the number of ${item.plural} in the pile`,
    );
  }

  if (innerB > 0) {
    return wp(
      ctx,
      `${name} had some ${item.plural}. After picking up ${innerB} more at ${place} and splitting them into ${divisor} boxes, ${eachBox}.`,
      `How many ${item.plural} did ${name} have at first?`,
      `the starting number of ${item.plural}`,
    );
  }

  return wp(
    ctx,
    `${name} had some ${item.plural}. After giving ${Math.abs(innerB)} to ${friendA} and splitting the rest into ${divisor} boxes, ${eachBox}.`,
    `How many ${item.plural} did ${name} have at first?`,
    `the starting number of ${item.plural}`,
  );
}

function countNoun(n: number, item: Item): string {
  return `${n} ${n === 1 ? item.singular : item.plural}`;
}

function bothSidesStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const { name, friendA } = ctx;
  return wp(
    ctx,
    `${name}'s plan is ${planCost(eq.leftA, eq.leftB)}. ${friendA}'s plan is ${planCost(eq.rightA, eq.rightB)}. After the same number of months, the two plans cost the same.`,
    "After how many months do the two plans cost the same?",
    "the number of months",
  );
}

function bothSidesNumberStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const left = phraseTimes(eq.leftA, eq.leftB);
  const right = phraseTimes(eq.rightA, eq.rightB);
  return wp(
    ctx,
    `${ctx.name} is thinking of a number. ${cap(left)} equals ${right}.`,
    `What number is ${ctx.name} thinking of?`,
    "the unknown number",
  );
}

function phraseTimes(a: number, b: number): string {
  const times =
    a === 1
      ? "the number"
      : a === -1
        ? "the opposite of the number"
        : `${signedNum(a)} times the number`;
  if (b === 0) return times;
  if (b > 0) return `${times} plus ${b}`;
  return `${times} minus ${Math.abs(b)}`;
}

function planCost(monthly: number, fee: number): string {
  const rate =
    monthly < 0
      ? `−${dollars(monthly)} per month`
      : `${dollars(monthly)} per month`;
  if (fee === 0) return rate;
  if (fee > 0) return `${rate} plus a ${dollars(fee)} signup fee`;
  return `${rate} minus a ${dollars(fee)} signup fee`;
}

function twoStepStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = eq.leftA;
  const b = eq.leftB;
  const total = eq.rightB;
  const { name, item, place, feeA } = ctx;

  if (a < 0) {
    return wp(
      ctx,
      `${name} loses ${Math.abs(a)} point${Math.abs(a) === 1 ? "" : "s"} in each round and ${scoreMove(b)}. The score is then ${signedNum(total)}.`,
      `How many rounds did ${name} play?`,
      "the number of rounds",
    );
  }

  if (a === 1) return oneStepAddSub(eq, ctx);

  const cost = `${cap(item.plural)} cost ${dollars(a)} each.`;
  if (b > 0) {
    return wp(
      ctx,
      `${cost} ${name} bought some ${item.plural} at ${place} and also paid ${dollars(b)} for ${feeA}. ${resultMoney(name, total)}.`,
      `How many ${item.plural} did ${name} buy?`,
      `the number of ${item.plural} ${name} bought`,
    );
  }

  return wp(
    ctx,
    `${cost} ${name} bought some ${item.plural} at ${place} and used a ${dollars(b)} coupon. ${resultMoney(name, total)}.`,
    `How many ${item.plural} did ${name} buy?`,
    `the number of ${item.plural} ${name} bought`,
  );
}

function oneStepAddSub(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const b = eq.leftB;
  const total = eq.rightB;
  const { name, item, place, friendA } = ctx;

  if (eq.leftA === -1) return numberMachine(eq, ctx);

  if (b > 0) {
    if (total < 0) return numberMachine(eq, ctx);
    return wp(
      ctx,
      `${name} already had some ${item.plural}. After picking up ${b} more at ${place}, there were ${total}.`,
      `How many ${item.plural} did ${name} have at the start?`,
      `the starting number of ${item.plural}`,
    );
  }

  // Remaining posters/tickets cannot be negative. Negative cash needs an account that allows it.
  if (total < 0) {
    return wp(
      ctx,
      `${name} started with some money. Then ${name} ${moneyMove(b, friendA)}. ${leftoverMoney(name, total)}.`,
      `How much money did ${name} start with?`,
      `the amount ${name} started with, in dollars`,
    );
  }

  return wp(
    ctx,
    `${name} had some ${item.plural}. After giving ${Math.abs(b)} to ${friendA}, ${name} has ${total} left.`,
    `How many ${item.plural} did ${name} start with?`,
    `the starting number of ${item.plural}`,
  );
}

function oneStepMul(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = eq.leftA;
  const total = eq.rightB;
  const { name, item, place } = ctx;

  if (a < 0) return numberMachine(eq, ctx);

  return wp(
    ctx,
    `${cap(item.plural)} cost ${dollars(a)} each. ${name} spent ${dollars(total)} at ${place} on ${item.plural} and nothing else.`,
    `How many ${item.plural} did ${name} buy?`,
    `the number of ${item.plural} ${name} bought`,
  );
}

function numberMachine(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const p = eq.presentation;
  const clauses: string[] = [];
  let result = eq.rightB;

  if (p.form === "distribute") {
    if (p.innerB !== 0) clauses.push(addClause(p.innerB));
    clauses.push(mulClause(p.outer));
  } else if (p.form === "combine") {
    if (p.a !== 1) clauses.push(mulClause(p.a));
    clauses.push(addClause(p.b1));
    clauses.push(addClause(p.b2));
  } else if (p.form === "quotient") {
    if (p.innerB !== 0) clauses.push(addClause(p.innerB));
    clauses.push(divClause(p.divisor));
    result = p.right;
  } else if (eq.rightA !== 0) {
    return bothSidesNumberStory(eq, ctx);
  } else {
    if (eq.leftA !== 1) clauses.push(mulClause(eq.leftA));
    if (eq.leftB !== 0) clauses.push(addClause(eq.leftB));
  }

  const seq =
    clauses.length === 0
      ? `The number equals ${signedNum(result)}`
      : `If you ${joinClauses(clauses)}, the result is ${signedNum(result)}`;

  return wp(
    ctx,
    `${ctx.name} is thinking of a number. ${seq}.`,
    `What number is ${ctx.name} thinking of?`,
    "the unknown number",
  );
}

function mulClause(n: number): string {
  return `multiply it by ${signedNum(n)}`;
}

function addClause(n: number): string {
  return n > 0 ? `add ${n}` : `subtract ${Math.abs(n)}`;
}

function divClause(n: number): string {
  return `divide by ${signedNum(n)}`;
}

function joinClauses(clauses: string[]): string {
  if (clauses.length === 1) return clauses[0]!;
  if (clauses.length === 2) return `${clauses[0]}, then ${clauses[1]}`;
  return `${clauses.slice(0, -1).join(", then ")}, then ${clauses[clauses.length - 1]}`;
}

/** Absolute values a student must see in the story to rebuild the equation. */
export function storyMustMention(eq: LinearEq): number[] {
  const p = eq.presentation;
  const out: number[] = [];
  const pushCoef = (n: number) => {
    if (Math.abs(n) > 1) out.push(Math.abs(n));
  };
  const pushConst = (n: number) => {
    if (n !== 0) out.push(Math.abs(n));
  };

  if (p.form === "combine") {
    pushCoef(p.a);
    pushConst(p.b1);
    pushConst(p.b2);
    out.push(Math.abs(eq.rightB));
  } else if (p.form === "distribute") {
    pushCoef(p.outer);
    pushConst(p.innerB);
    out.push(Math.abs(eq.rightB));
  } else if (p.form === "quotient") {
    pushConst(p.divisor);
    pushConst(p.innerB);
    out.push(Math.abs(p.right));
  } else {
    pushCoef(eq.leftA);
    pushConst(eq.leftB);
    pushCoef(eq.rightA);
    if (eq.rightA === 0) out.push(Math.abs(eq.rightB));
    else pushConst(eq.rightB);
  }

  return out;
}

export function digitsInText(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
}
