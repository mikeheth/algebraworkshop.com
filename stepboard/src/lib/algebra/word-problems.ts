import { pick } from "./random.ts";
import type { LinearEq, Presentation, Relation, WordProblem } from "./types.ts";
import { relationOf } from "./types.ts";

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

type Item = {
  singular: string;
  plural: string;
  places: string[];
  fees: string[];
};

const ITEMS: Item[] = [
  {
    singular: "ticket",
    plural: "tickets",
    places: ["the community fair", "the weekend market", "the school store"],
    fees: ["a coffee and bagel", "parking", "a snack", "tax"],
  },
  {
    singular: "ride ticket",
    plural: "ride tickets",
    places: ["the community fair", "the weekend market"],
    fees: ["a snack", "a drink", "parking", "a souvenir bag"],
  },
  {
    singular: "notebook",
    plural: "notebooks",
    places: ["the school store", "the book fair"],
    fees: ["a snack", "a drink", "tax"],
  },
  {
    singular: "smoothie",
    plural: "smoothies",
    places: ["the corner cafe", "the weekend market"],
    fees: ["a bagel", "a pastry", "tax"],
  },
  {
    singular: "poster",
    plural: "posters",
    places: ["the art stall", "the weekend market", "the school store"],
    fees: ["a souvenir bag", "tax", "a snack"],
  },
  {
    singular: "muffin",
    plural: "muffins",
    places: ["the corner cafe", "the school store", "the weekend market"],
    fees: ["a coffee", "a drink", "tax"],
  },
];

const COUNT_NOUN =
  /ticket|notebook|smoothie|poster|muffin|round|month|\bbox(?:es)?\b|people|person|hour|minute|week/i;

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
  const place = pick(item.places);
  const feeA = pick(item.fees);
  const feeB = pick(item.fees.filter((f) => f !== feeA));
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
    rel: relationOf(eq),
  };

  const word = buildStory(eq, solution, ctx);
  const text = `${word.story} ${word.question} ${word.unknown}`;
  if (solution <= 0 && COUNT_NOUN.test(text)) return numberMachine(eq, ctx);
  return word;
}

function buildStory(eq: LinearEq, solution: number, ctx: StoryCtx): WordProblem {
  // Countable things (posters, months, people) cannot be a negative unknown.
  if (solution <= 0) {
    return pick([
      () => overnightStory(eq, ctx),
      () => numberCompareStory(eq, ctx),
    ])();
  }

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

type StoryCtx = {
  name: string;
  friendA: string;
  friendB: string;
  item: Item;
  place: string;
  feeA: string;
  feeB: string;
  v: string;
  rel: Relation;
};

function wp(
  ctx: StoryCtx,
  story: string,
  question: string,
  unknown: string,
  opts?: { boundCue?: boolean },
): WordProblem {
  const domain = countDomain(unknown);
  return {
    story,
    question: opts?.boundCue === false ? question : withBoundCue(ctx.rel, question),
    unknown,
    letStatement: `Let ${ctx.v} = ${unknown}.`,
    ...domain,
  };
}

/**
 * Zero-floor the graph only for countable story units (objects, people,
 * hours, months). Signed quantities — money, "a number", temperature,
 * elevation — may be negative, so they stay unbounded.
 */
export function countDomain(unknown: string): {
  nonNegative: boolean;
  countNoun?: string;
} {
  if (/dollar|price|unknown number|overnight|temperature|elevation/i.test(unknown)) {
    return { nonNegative: false };
  }
  if (/\bminutes?\b/i.test(unknown)) {
    return { nonNegative: true, countNoun: "minutes" };
  }
  if (/\bhours?\b/i.test(unknown)) {
    return { nonNegative: true, countNoun: "hours" };
  }
  if (/\bweeks?\b/i.test(unknown)) {
    return { nonNegative: true, countNoun: "weeks" };
  }
  if (/\bpeople\b|\bperson\b/i.test(unknown)) {
    return { nonNegative: true, countNoun: "people" };
  }
  if (/\bboxes\b/i.test(unknown)) {
    return { nonNegative: true, countNoun: "boxes" };
  }
  if (/\brounds?\b/i.test(unknown)) {
    return { nonNegative: true, countNoun: "rounds" };
  }
  if (/\bmonths?\b/i.test(unknown)) {
    return { nonNegative: true, countNoun: "months" };
  }
  const bought = unknown.match(/number of (.+?) \w+ bought/i);
  if (bought) return { nonNegative: true, countNoun: bought[1]!.trim() };
  const starting = unknown.match(/starting number of (.+)/i);
  if (starting) return { nonNegative: true, countNoun: starting[1]!.trim() };
  const pile = unknown.match(/number of (.+?) in the pile/i);
  if (pile) return { nonNegative: true, countNoun: pile[1]!.trim() };
  const ofCount = unknown.match(/number of (.+)/i);
  if (ofCount) return { nonNegative: true, countNoun: ofCount[1]!.trim() };
  return { nonNegative: false };
}

/** Extra sentence after isolating, when the story forbids negative counts. */
export function countDomainNote(
  rel: Relation | undefined,
  value: number,
  variable: string,
  unit: string,
): string | null {
  if (rel !== "<" && rel !== "≤") return null;
  const capUnit = unit.charAt(0).toUpperCase() + unit.slice(1);
  return `${capUnit} can't be negative, so 0 ≤ ${variable} ${rel} ${value}.`;
}

function withBoundCue(rel: Relation, question: string): string {
  if (rel === "=") return question;
  if (rel === "≤" || rel === "<") {
    return `${question} Treat that number as a maximum, not an exact total.`;
  }
  return `${question} Treat that number as a minimum, not an exact total.`;
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

function compareVerb(rel: Relation): string {
  switch (rel) {
    case "≤":
      return "is at most";
    case "<":
      return "is less than";
    case "≥":
      return "is at least";
    case ">":
      return "is more than";
    default:
      return "equals";
  }
}

function timesANumber(a: number): string {
  if (a === 1) return "a number";
  if (a === -1) return "the opposite of a number";
  if (a === 2) return "twice a number";
  if (a === -2) return "the opposite of twice a number";
  return `${signedNum(a)} times a number`;
}

function numberCompareStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const p = eq.presentation;
  if (p.form === "distribute") {
    return distributeNumberStory(p, eq.rightB, ctx);
  }
  if (p.form === "combine") {
    return numberMachine(eq, ctx);
  }
  if (p.form === "quotient") {
    return numberMachine(eq, ctx);
  }
  if (eq.rightA !== 0) return bothSidesNumberStory(eq, ctx);
  return wp(
    ctx,
    `${ctx.name} is thinking of a number. ${cap(phraseTimes(eq.leftA, eq.leftB))} ${compareVerb(ctx.rel)} ${signedNum(eq.rightB)}.`,
    ctx.rel === "="
      ? `What number is ${ctx.name} thinking of?`
      : `Which numbers could ${ctx.name} be thinking of?`,
    "the unknown number",
  );
}

function distributeNumberStory(
  p: Extract<Presentation, { form: "distribute" }>,
  total: number,
  ctx: StoryCtx,
): WordProblem {
  const sum =
    p.innerB > 0
      ? `the sum of the number and ${p.innerB}`
      : p.innerB < 0
        ? `the number minus ${Math.abs(p.innerB)}`
        : "the number";
  const times =
    p.outer === 2
      ? `twice ${sum}`
      : p.outer === -2
        ? `the opposite of twice ${sum}`
        : p.outer === 1
          ? sum
          : `${signedNum(p.outer)} times ${sum}`;
  return wp(
    ctx,
    `${ctx.name} is thinking of a number. ${cap(times)} ${compareVerb(ctx.rel)} ${signedNum(total)}.`,
    ctx.rel === "="
      ? `What number is ${ctx.name} thinking of?`
      : `Which numbers could ${ctx.name} be thinking of?`,
    "the unknown number",
  );
}

function overnightStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const p = eq.presentation;
  if (p.form === "distribute" || p.form === "combine" || p.form === "quotient" || eq.rightA !== 0) {
    return numberCompareStory(eq, ctx);
  }
  const a = eq.leftA;
  const b = eq.leftB;
  if (a <= 0) return numberCompareStory(eq, ctx);
  const low =
    a > 0 && b < 0
      ? `${Math.abs(b)} degrees less than ${timesANumber(a)}`
      : a > 0 && b > 0
        ? `${b} degrees more than ${timesANumber(a)}`
        : a > 0 && b === 0
          ? timesANumber(a)
          : phraseTimes(a, b).replace(/\bthe number\b/g, "a number");
  return wp(
    ctx,
    `The overnight low was ${low}, and it was ${overnightBound(eq.rightB, ctx.rel)}.`,
    "Which numbers could that be?",
    "the unknown number",
  );
}

function overnightBound(n: number, rel: Relation): string {
  const t = `${signedNum(n)} degrees`;
  switch (rel) {
    case "<":
      return `colder than ${t}`;
    case "≤":
      return `at most ${t}`;
    case ">":
      return `warmer than ${t}`;
    case "≥":
      return `at least ${t}`;
    default:
      return t;
  }
}

function elevationAt(n: number): string {
  if (n === 0) return "sea level";
  if (n > 0) return `${n} feet above sea level`;
  return `${Math.abs(n)} feet below sea level`;
}

function elevationCompare(n: number, rel: Relation): string {
  const at = elevationAt(n);
  switch (rel) {
    case "<":
      return `less than ${at}`;
    case "≤":
      return `at most ${at}`;
    case ">":
      return `more than ${at}`;
    case "≥":
      return `at least ${at}`;
    default:
      return at;
  }
}

function diveStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = Math.abs(eq.leftA);
  const b = eq.leftB;
  const start =
    b === 0
      ? "A sub starts at sea level"
      : b > 0
        ? `A sub starts at ${b} feet above sea level`
        : `A sub starts at ${Math.abs(b)} feet below sea level`;
  return wp(
    ctx,
    `${start} and dives ${a} feet each minute. After some minutes its elevation is ${elevationCompare(eq.rightB, ctx.rel)}.`,
    ctx.rel === "="
      ? "How many minutes did the sub dive?"
      : "How many minutes could that take?",
    "the number of minutes",
  );
}

function coolingStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = Math.abs(eq.leftA);
  const b = eq.leftB;
  const R = eq.rightB;
  const must = tempMust(R, ctx.rel);
  return wp(
    ctx,
    `The rink is ${signedNum(b)} degrees and ${must}. A cooler drops the temperature ${a} degrees each hour.`,
    ctx.rel === "="
      ? "How many hours did the cooler run?"
      : "How many hours could that take?",
    "the number of hours",
  );
}

function tempMust(n: number, rel: Relation): string {
  const t = `${signedNum(n)} degrees`;
  switch (rel) {
    case "<":
      return `must stay below ${t}`;
    case "≤":
      return `must stay at most ${t}`;
    case ">":
      return `must stay above ${t}`;
    case "≥":
      return `must stay at least ${t}`;
    default:
      return `reaches ${t}`;
  }
}

function remainingBillStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = Math.abs(eq.leftA);
  const b = eq.leftB;
  const R = eq.rightB;
  const keep = leftoverMoney(ctx.name, R, ctx.rel);
  return wp(
    ctx,
    `${ctx.name} has ${dollars(b)} in an account. A club costs ${dollars(a)} each month. After some months, ${keep}.`,
    ctx.rel === "="
      ? `How many months did ${ctx.name} pay?`
      : `How many months could ${ctx.name} pay?`,
    "the number of months",
  );
}

function negativeCoefStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const b = eq.leftB;
  const total = eq.rightB;
  const options: Array<() => WordProblem> = [
    () => diveStory(eq, ctx),
    () => numberCompareStory(eq, ctx),
  ];
  if (b > 0 && total >= 0) options.push(() => remainingBillStory(eq, ctx));
  if (b !== 0) options.push(() => coolingStory(eq, ctx));
  return pick(options)();
}

function capacityStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = Math.abs(eq.leftA);
  const R = eq.rightB;
  const hold = weightHold(R, ctx.rel);
  if (Math.random() < 0.5) {
    return wp(
      ctx,
      `The elevator sign says the car can hold ${hold}. Each person weighs ${a} pounds.`,
      ctx.rel === "="
        ? "How many people rode?"
        : "How many people could ride?",
      "the number of people",
    );
  }
  return wp(
    ctx,
    `A pallet can safely hold ${hold}. Each box weighs ${a} pounds.`,
    ctx.rel === "="
      ? "How many boxes were loaded?"
      : "How many boxes could it hold?",
    "the number of boxes",
  );
}

function weightHold(n: number, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `at most ${n} pounds`;
    case "<":
      return `less than ${n} pounds`;
    case "≥":
      return `at least ${n} pounds`;
    case ">":
      return `more than ${n} pounds`;
    default:
      return `${n} pounds`;
  }
}

function fundraisingStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = Math.abs(eq.leftA);
  const R = eq.rightB;
  return wp(
    ctx,
    `The troop needs to raise ${raiseBound(R, ctx.rel)}. Boxes of cookies sell for ${dollars(a)} each.`,
    ctx.rel === "="
      ? "How many boxes did they sell?"
      : "How many boxes could they have sold?",
    "the number of boxes",
  );
}

function raiseBound(n: number, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `at most ${dollars(n)}`;
    case "<":
      return `less than ${dollars(n)}`;
    case "≥":
      return `at least ${dollars(n)}`;
    case ">":
      return `more than ${dollars(n)}`;
    default:
      return dollars(n);
  }
}

function averageBound(n: number, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `at most ${n}`;
    case "<":
      return `less than ${n}`;
    case "≥":
      return `at least ${n}`;
    case ">":
      return `more than ${n}`;
    default:
      return String(n);
  }
}

function rateToGoalStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = Math.abs(eq.leftA);
  const b = eq.leftB;
  const R = eq.rightB;
  const { name, item, rel } = ctx;
  const want =
    rel === ">"
      ? `wants more than ${R} ${item.plural}`
      : rel === "≥"
        ? `wants at least ${R} ${item.plural}`
        : rel === "<"
          ? `wants fewer than ${R} ${item.plural}`
          : rel === "≤"
            ? `wants at most ${R} ${item.plural}`
            : `ends with ${R} ${item.plural}`;
  return wp(
    ctx,
    `${name} already has ${b} ${item.plural}. Each week ${name} makes ${a} more. ${name} ${want}.`,
    rel === "="
      ? `How many weeks did that take?`
      : `How many weeks would that take?`,
    "the number of weeks",
  );
}

/** Closing money sentence. For inequalities the right-hand amount is a budget, not a tally. */
function resultMoney(name: string, n: number, rel: Relation): string {
  if (n < 0) return negativeBalance(name, n);
  if (n === 0) return "The total is $0";
  switch (rel) {
    case "≤":
      return `${name} only had ${dollars(n)} to spend`;
    case "<":
      return `${name} had to keep the total under ${dollars(n)}`;
    case "≥":
      return `${name} needed to spend at least ${dollars(n)}`;
    case ">":
      return `${name} needed to spend more than ${dollars(n)}`;
    default:
      return `The total is ${dollars(n)}`;
  }
}

function leftoverMoney(name: string, n: number, rel: Relation): string {
  if (n < 0) return negativeBalance(name, n);
  if (n === 0) return `${name} has $0 left`;
  switch (rel) {
    case "≤":
      return `${name} has at most ${dollars(n)} left`;
    case "<":
      return `${name} has less than ${dollars(n)} left`;
    case "≥":
      return `${name} has at least ${dollars(n)} left`;
    case ">":
      return `${name} has more than ${dollars(n)} left`;
    default:
      return `${name} has ${dollars(n)} left`;
  }
}

function thereWere(n: number, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `there were at most ${n}`;
    case "<":
      return `there were fewer than ${n}`;
    case "≥":
      return `there were at least ${n}`;
    case ">":
      return `there were more than ${n}`;
    default:
      return `there were ${n}`;
  }
}

function leftoverCount(name: string, n: number, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `${name} has at most ${n} left`;
    case "<":
      return `${name} has fewer than ${n} left`;
    case "≥":
      return `${name} has at least ${n} left`;
    case ">":
      return `${name} has more than ${n} left`;
    default:
      return `${name} has ${n} left`;
  }
}

function resultIs(n: number, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `the result is at most ${signedNum(n)}`;
    case "<":
      return `the result is less than ${signedNum(n)}`;
    case "≥":
      return `the result is at least ${signedNum(n)}`;
    case ">":
      return `the result is more than ${signedNum(n)}`;
    default:
      return `the result is ${signedNum(n)}`;
  }
}

function bagsCost(n: number, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `Altogether the bags cost at most ${dollars(n)}`;
    case "<":
      return `Altogether the bags cost less than ${dollars(n)}`;
    case "≥":
      return `Altogether the bags cost at least ${dollars(n)}`;
    case ">":
      return `Altogether the bags cost more than ${dollars(n)}`;
    default:
      return `Altogether the bags cost ${dollars(n)}`;
  }
}

function chargedTotal(n: number, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `The total charged was at most ${dollars(n)}`;
    case "<":
      return `The total charged was less than ${dollars(n)}`;
    case "≥":
      return `The total charged was at least ${dollars(n)}`;
    case ">":
      return `The total charged was more than ${dollars(n)}`;
    default:
      return `The total charged was ${dollars(n)}`;
  }
}

function boughtQuestion(ctx: StoryCtx): string {
  const { name, item, rel } = ctx;
  if (rel === "=") return `How many ${item.plural} did ${name} buy?`;
  if (rel === "≥" || rel === ">") {
    return `What is the fewest ${item.plural} ${name} could have bought?`;
  }
  return `How many ${item.plural} could ${name} have bought?`;
}

function startCountQuestion(ctx: StoryCtx): string {
  const { name, item, rel } = ctx;
  if (rel === "=") {
    return `How many ${item.plural} did ${name} have at first?`;
  }
  return `How many ${item.plural} could ${name} have had at first?`;
}

function startMoneyQuestion(ctx: StoryCtx): string {
  if (ctx.rel === "=") return `How much money did ${ctx.name} start with?`;
  return `How much money could ${ctx.name} have started with?`;
}

function negativeBalance(name: string, n: number): string {
  return `${name} will have a negative balance of ${dollars(n)}. The account allows negative balances`;
}

function combineStory(
  eq: LinearEq,
  p: Extract<Presentation, { form: "combine" }>,
  ctx: StoryCtx,
): WordProblem {
  const { a, b1, b2 } = p;
  const total = eq.rightB;
  const { name, item, place, friendA, friendB, feeA, feeB, rel } = ctx;

  if (a < 0) {
    return pick([
      () => numberCompareStory(eq, ctx),
      () => overnightStory(eq, ctx),
      () => numberMachine(eq, ctx),
    ])();
  }

  if (a === 1) {
    if (b1 > 0 && b2 > 0) {
      return wp(
        ctx,
        `${name} started with some money. Then ${name} paid ${dollars(b1)} for ${feeA} and ${dollars(b2)} for ${feeB}. ${resultMoney(name, total, rel)}.`,
        startMoneyQuestion(ctx),
        `the amount ${name} started with, in dollars`,
      );
    }
    return wp(
      ctx,
      `${name} started with some money. Then ${name} ${moneyMove(b1, friendA)} and ${moneyMove(b2, friendB)}. ${leftoverMoney(name, total, rel)}.`,
      startMoneyQuestion(ctx),
      `the amount ${name} started with, in dollars`,
    );
  }

  const cost = `${cap(item.plural)} cost ${dollars(a)} each.`;
  if (b1 > 0 && b2 > 0) {
    return wp(
      ctx,
      `${cost} ${name} bought some ${item.plural} at ${place} and also paid ${dollars(b1)} for ${feeA} and ${dollars(b2)} for ${feeB}. ${resultMoney(name, total, rel)}.`,
      boughtQuestion(ctx),
      `the number of ${item.plural} ${name} bought`,
    );
  }

  return wp(
    ctx,
    `${cost} ${name} bought some ${item.plural} at ${place}, ${moneyMove(b1, friendA)}, and ${moneyMove(b2, friendB)}. ${leftoverMoney(name, total, rel)}.`,
    boughtQuestion(ctx),
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
  const { name, item, rel } = ctx;

  if (outer < 0 || ctx.rel !== "=") {
    return pick([
      () => distributeNumberStory(p, total, ctx),
      () => numberMachine(eq, ctx),
    ])();
  }

  if (innerB >= 0) {
    return wp(
      ctx,
      `${name} packed ${outer} identical bags. Each bag has one ${item.singular} plus ${dollars(innerB)} of extras. ${bagsCost(total, rel)}.`,
      rel === "="
        ? `What is the price of one ${item.singular}?`
        : `What prices work for one ${item.singular}?`,
      `the price of one ${item.singular}, in dollars`,
    );
  }

  return wp(
    ctx,
    `${name} bought ${outer} ${outer === 1 ? item.singular : item.plural}, each with a ${dollars(innerB)} coupon. ${chargedTotal(total, rel)}.`,
    rel === "="
      ? `What is the regular price of one ${item.singular}?`
      : `What regular prices work for one ${item.singular}?`,
    `the regular price of one ${item.singular}, in dollars`,
  );
}

function quotientStory(
  p: Extract<Presentation, { form: "quotient" }>,
  ctx: StoryCtx,
): WordProblem {
  const { innerB, divisor, right } = p;
  const { name, item, place, friendA, rel } = ctx;
  const eachBox = eachBoxHeld(right, item, rel);

  if (right < 0) {
    return numberMachine(
      {
        variable: ctx.v,
        leftA: 1,
        leftB: innerB,
        rightA: 0,
        rightB: right * divisor,
        presentation: p,
        relation: rel,
      },
      ctx,
    );
  }

  if (innerB === 0) {
    return wp(
      ctx,
      `${name} had a pile of ${item.plural}. After splitting them into ${divisor} boxes, ${eachBox}.`,
      rel === "="
        ? `How many ${item.plural} were in the pile?`
        : `How many ${item.plural} could have been in the pile?`,
      `the number of ${item.plural} in the pile`,
    );
  }

  if (innerB > 0) {
    if (
      (rel === "≥" || rel === ">" || rel === "≤" || rel === "<") &&
      Math.random() < 0.45
    ) {
      return wp(
        ctx,
        `${name}'s first tests totaled ${innerB} points. ${name} wants the average of ${divisor} tests to be ${averageBound(right, rel)}.`,
        "What last-test scores would work?",
        "the unknown number",
      );
    }
    return wp(
      ctx,
      `${name} had some ${item.plural}. After picking up ${innerB} more at ${place} and splitting them into ${divisor} boxes, ${eachBox}.`,
      startCountQuestion(ctx),
      `the starting number of ${item.plural}`,
    );
  }

  return wp(
    ctx,
    `${name} had some ${item.plural}. After giving ${Math.abs(innerB)} to ${friendA} and splitting the rest into ${divisor} boxes, ${eachBox}.`,
    startCountQuestion(ctx),
    `the starting number of ${item.plural}`,
  );
}

function eachBoxHeld(n: number, item: Item, rel: Relation): string {
  switch (rel) {
    case "≤":
      return `each box held at most ${countNoun(n, item)}`;
    case "<":
      return `each box held fewer than ${countNoun(n, item)}`;
    case "≥":
      return `each box held at least ${countNoun(n, item)}`;
    case ">":
      return `each box held more than ${countNoun(n, item)}`;
    default:
      return `each box held ${countNoun(n, item)}`;
  }
}

function countNoun(n: number, item: Item): string {
  return `${n} ${n === 1 ? item.singular : item.plural}`;
}

function bothSidesStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  if (eq.leftA <= 0 || eq.rightA <= 0 || eq.leftB < 0 || eq.rightB < 0) {
    return bothSidesNumberStory(eq, ctx);
  }
  return Math.random() < 0.5 ? shopBothSides(eq, ctx) : saveBothSides(eq, ctx);
}

function shopBothSides(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const { item, place, rel } = ctx;
  const other =
    pick(item.places.filter((p) => p !== place)) ?? "the school store";
  const left = `${dollars(eq.leftB)} plus ${dollars(eq.leftA)} per ${item.singular}`;
  const right = `${dollars(eq.rightB)} plus ${dollars(eq.rightA)} per ${item.singular}`;
  return wp(
    ctx,
    `${cap(place)} charges ${left}. ${cap(other)} charges ${right}.`,
    shopQuestion(rel, place, other, item.plural),
    `the number of ${item.plural}`,
    { boundCue: false },
  );
}

function shopQuestion(
  rel: Relation,
  placeA: string,
  placeB: string,
  plural: string,
): string {
  switch (rel) {
    case "≤":
      return `For how many ${plural} does ${placeA} cost at most as much as ${placeB}?`;
    case "<":
      return `For how many ${plural} is ${placeA} a better deal?`;
    case "≥":
      return `For how many ${plural} does ${placeA} cost at least as much as ${placeB}?`;
    case ">":
      return `For how many ${plural} does ${placeA} cost more than ${placeB}?`;
    default:
      return `After how many ${plural} do they cost the same?`;
  }
}

function saveBothSides(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const { name, friendA, rel } = ctx;
  return wp(
    ctx,
    `${name} has ${dollars(eq.leftB)} and saves ${dollars(eq.leftA)} each week. ${friendA} has ${dollars(eq.rightB)} and saves ${dollars(eq.rightA)} each week.`,
    saveQuestion(rel, name, friendA),
    "the number of weeks",
    { boundCue: false },
  );
}

function saveQuestion(rel: Relation, name: string, friend: string): string {
  switch (rel) {
    case "≤":
      return `After how many weeks does ${name} have at most as much as ${friend}?`;
    case "<":
      return `After how many weeks does ${name} have less than ${friend}?`;
    case "≥":
      return `After how many weeks does ${name} have at least as much as ${friend}?`;
    case ">":
      return `After how many weeks does ${name} have more than ${friend}?`;
    default:
      return `After how many weeks do they have the same amount?`;
  }
}

function bothSidesNumberStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const left = phraseTimes(eq.leftA, eq.leftB);
  const right = phraseTimes(eq.rightA, eq.rightB);
  const { rel } = ctx;
  const verb =
    rel === "="
      ? "equals"
      : rel === "≤"
        ? "is at most"
        : rel === "<"
          ? "is less than"
          : rel === "≥"
            ? "is at least"
            : "is more than";
  return wp(
    ctx,
    `${ctx.name} is thinking of a number. ${cap(left)} ${verb} ${right}.`,
    rel === "="
      ? `What number is ${ctx.name} thinking of?`
      : `Which numbers could ${ctx.name} be thinking of?`,
    "the unknown number",
  );
}

function phraseTimes(a: number, b: number): string {
  const times =
    a === 1
      ? "the number"
      : a === -1
        ? "the opposite of the number"
        : a === 2
          ? "twice the number"
          : a === -2
            ? "the opposite of twice the number"
            : `${signedNum(a)} times the number`;
  if (b === 0) return times;
  if (b > 0) return `${times} plus ${b}`;
  return `${times} minus ${Math.abs(b)}`;
}

function twoStepStory(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = eq.leftA;
  const b = eq.leftB;
  const total = eq.rightB;
  const { name, item, place, feeA, rel } = ctx;

  if (a < 0) {
    return negativeCoefStory(eq, ctx);
  }

  if (a === 1) return oneStepAddSub(eq, ctx);

  if (b > 0 && (rel === "≥" || rel === ">")) {
    if (Math.random() < 0.5) return rateToGoalStory(eq, ctx);
  }

  const cost = `${cap(item.plural)} cost ${dollars(a)} each.`;
  if (b > 0) {
    return wp(
      ctx,
      `${cost} ${name} bought some ${item.plural} at ${place} and also paid ${dollars(b)} for ${feeA}. ${resultMoney(name, total, rel)}.`,
      boughtQuestion(ctx),
      `the number of ${item.plural} ${name} bought`,
    );
  }

  return wp(
    ctx,
    `${cost} ${name} bought some ${item.plural} at ${place} and used a ${dollars(b)} coupon. ${resultMoney(name, total, rel)}.`,
    boughtQuestion(ctx),
    `the number of ${item.plural} ${name} bought`,
  );
}

function oneStepAddSub(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const b = eq.leftB;
  const total = eq.rightB;
  const { name, item, place, friendA, rel } = ctx;

  if (eq.leftA === -1) {
    return pick([
      () => numberCompareStory(eq, ctx),
      () => overnightStory(eq, ctx),
    ])();
  }

  if (b > 0) {
    if (total < 0) return numberMachine(eq, ctx);
    return wp(
      ctx,
      `${name} already had some ${item.plural}. After picking up ${b} more at ${place}, ${thereWere(total, rel)}.`,
      rel === "="
        ? `How many ${item.plural} did ${name} have at the start?`
        : `How many ${item.plural} could ${name} have had at the start?`,
      `the starting number of ${item.plural}`,
    );
  }

  // Remaining posters/tickets cannot be negative. Negative cash needs an account that allows it.
  if (total < 0) {
    return wp(
      ctx,
      `${name} started with some money. Then ${name} ${moneyMove(b, friendA)}. ${leftoverMoney(name, total, rel)}.`,
      startMoneyQuestion(ctx),
      `the amount ${name} started with, in dollars`,
    );
  }

  return wp(
    ctx,
    `${name} had some ${item.plural}. After giving ${Math.abs(b)} to ${friendA}, ${leftoverCount(name, total, rel)}.`,
    rel === "="
      ? `How many ${item.plural} did ${name} start with?`
      : `How many ${item.plural} could ${name} have started with?`,
    `the starting number of ${item.plural}`,
  );
}

function oneStepMul(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const a = eq.leftA;
  const total = eq.rightB;
  const { name, item, place, rel } = ctx;

  if (a < 0) return negativeCoefStory(eq, ctx);

  if (rel === "≤" || rel === "<") {
    if (Math.random() < 0.5) return capacityStory(eq, ctx);
  }
  if (rel === "≥" || rel === ">") {
    if (Math.random() < 0.5) return fundraisingStory(eq, ctx);
  }

  if (rel === "=") {
    return wp(
      ctx,
      `${cap(item.plural)} cost ${dollars(a)} each. ${name} spent ${dollars(total)} at ${place} on ${item.plural} and nothing else.`,
      boughtQuestion(ctx),
      `the number of ${item.plural} ${name} bought`,
    );
  }

  return wp(
    ctx,
    `${cap(item.plural)} cost ${dollars(a)} each. ${name} bought some ${item.plural} at ${place} and nothing else. ${resultMoney(name, total, rel)}.`,
    boughtQuestion(ctx),
    `the number of ${item.plural} ${name} bought`,
  );
}

function numberMachine(eq: LinearEq, ctx: StoryCtx): WordProblem {
  const p = eq.presentation;
  const clauses: string[] = [];
  let result = eq.rightB;
  const { rel } = ctx;

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
      : `If you ${joinClauses(clauses)}, ${resultIs(result, rel)}`;

  return wp(
    ctx,
    `${ctx.name} is thinking of a number. ${seq}.`,
    rel === "="
      ? `What number is ${ctx.name} thinking of?`
      : `Which numbers could ${ctx.name} be thinking of?`,
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
  const nums = [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (/\btwice\b/i.test(text)) nums.push(2);
  return nums;
}
