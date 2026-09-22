import { pick, randInt } from "../algebra/random.ts";
import type { EquationLine } from "../algebra/types.ts";
import { frac, line, num, op, parenNum, unk } from "./format.ts";
import type { FormulaSpec } from "./types.ts";

const NAMES = [
  "Ava",
  "Noah",
  "Maya",
  "Luis",
  "Elena",
  "Kai",
  "Priya",
  "Theo",
  "Sofia",
  "Andre",
  "Riley",
  "Mei",
  "Harper",
  "Jordan",
  "Nia",
  "Luca",
];

const CITIES = [
  ["Providence", "Washington"],
  ["Boston", "New York"],
  ["Tampa", "Atlanta"],
  ["Miami", "Orlando"],
  ["Denver", "Salt Lake City"],
  ["Chicago", "Detroit"],
];

export type LitApply = {
  plugged: EquationLine;
  simplified?: EquationLine;
  simplifyNote?: string;
  result: EquationLine;
  conclusion: string;
};

export type LitWord = {
  story: string;
  question: string;
  letStatement: string;
  apply: LitApply;
};

const WORD_IDS = new Set([
  "force",
  "distance",
  "area",
  "ohms",
  "interest",
  "perimeter",
  "slope",
  "motion",
  "temp",
  "cost",
  "triangle",
  "mean",
]);

export function wordTargets(spec: FormulaSpec): string[] {
  if (!WORD_IDS.has(spec.id)) return [];
  return spec.solveFor;
}

export function makeLitWord(spec: FormulaSpec, target: string): LitWord | undefined {
  const name = pick(NAMES);
  switch (spec.id) {
    case "distance":
      return distanceStory(name, target);
    case "interest":
      return interestStory(name, target);
    case "perimeter":
      return perimeterStory(target);
    case "area":
      return areaStory(target);
    case "ohms":
      return ohmsStory(target);
    case "force":
      return forceStory(target);
    case "slope":
      return slopeStory(name, target);
    case "motion":
      return motionStory(name, target);
    case "temp":
      return tempStory();
    case "cost":
      return costStory(name, target);
    case "triangle":
      return triangleStory(target);
    case "mean":
      return meanStory(name, target);
    default:
      return undefined;
  }
}

function productApply(
  target: string,
  isolatedVal: number,
  others: number[],
  answer: number,
  conclusion: string,
): LitApply {
  const den = others.flatMap((n, i) => (i === 0 ? [num(n)] : [op("·"), num(n)]));
  return {
    plugged: line([unk(target)], [frac([num(isolatedVal)], den)]),
    result: line([unk(target)], [num(answer)]),
    conclusion,
  };
}

function distanceStory(name: string, target: string): LitWord {
  const [from, to] = pick(CITIES);
  const r = pick([40, 45, 50, 55, 60, 65, 70]);
  const t = randInt(3, 8);
  const d = r * t;
  if (target === "t") {
    return {
      story: `${name} is driving ${d} miles from ${from} to ${to} at a steady ${r} miles per hour. Use d = rt.`,
      question: "Solve the formula for t, then find how long the trip takes.",
      letStatement: "Let d be the distance in miles. Let r be the speed in miles per hour. Let t be the time in hours.",
      apply: productApply("t", d, [r], t, `The trip takes ${t} hours.`),
    };
  }
  return {
    story: `${name} is ${d} miles from ${to} and needs to be there in ${t} hours. Use d = rt.`,
    question: "Solve the formula for r, then find how fast to drive.",
    letStatement: "Let d be the distance in miles. Let r be the speed in miles per hour. Let t be the time in hours.",
    apply: productApply("r", d, [t], r, `${name} must drive ${r} miles per hour.`),
  };
}

function interestStory(name: string, target: string): LitWord {
  const years = randInt(2, 5);
  const rPct = pick([3, 4, 5, 6]);
  const rDec = nice(rPct / 100);
  if (target === "r") {
    const P = pick([2000, 2500, 3000, 3500, 4000, 5000]);
    const I = (P * rPct * years) / 100;
    const prod = P * years;
    return {
      story: `${name} borrowed $${fmt(P)}. After ${years} years the interest paid was $${fmt(I)}. Use I = Prt.`,
      question: "Solve the formula for r, then find the interest rate.",
      letStatement: "Let I be the interest in dollars. Let P be the principal. Let r be the annual interest rate (as a decimal). Let t be the time in years.",
      apply: {
        plugged: line([unk("r")], [frac([num(I)], [num(P), op("·"), num(years)])]),
        simplified: line([unk("r")], [frac([num(I)], [num(prod)])]),
        simplifyNote: `${P} · ${years} = ${fmt(prod)}.`,
        result: line([unk("r")], [num(rDec)]),
        conclusion: `The interest rate is ${rDec}, or ${rPct}%.`,
      },
    };
  }
  if (target === "P") {
    const P = pick([1000, 1500, 2000, 2500, 4000, 5000]);
    const I = (P * rPct * years) / 100;
    const rt = nice(rDec * years);
    return {
      story: `${name} wants $${fmt(I)} of interest in ${years} years at ${rPct}% simple interest. Use I = Prt.`,
      question: "Solve the formula for P, then find how much to invest.",
      letStatement: "Let I be the interest in dollars. Let P be the principal. Let r be the annual interest rate (as a decimal). Let t be the time in years.",
      apply: {
        plugged: line([unk("P")], [frac([num(I)], [num(rDec), op("·"), num(years)])]),
        simplified: line([unk("P")], [frac([num(I)], [num(rt)])]),
        simplifyNote: `${rDec} · ${years} = ${rt}.`,
        result: line([unk("P")], [num(P)]),
        conclusion: `${name} should invest $${fmt(P)}.`,
      },
    };
  }
  const P2 = pick([1000, 2000, 2500, 4000, 5000]);
  const I2 = (P2 * rPct * years) / 100;
  const Pr = nice(P2 * rDec);
  return {
    story: `${name} invested $${fmt(P2)} at ${rPct}% simple interest and earned $${fmt(I2)}. Use I = Prt.`,
    question: "Solve the formula for t, then find how many years it took.",
    letStatement: "Let I be the interest in dollars. Let P be the principal. Let r be the annual interest rate (as a decimal). Let t be the time in years.",
    apply: {
      plugged: line([unk("t")], [frac([num(I2)], [num(P2), op("·"), num(rDec)])]),
      simplified: line([unk("t")], [frac([num(I2)], [num(Pr)])]),
      simplifyNote: `${fmt(P2)} · ${rDec} = ${fmt(Pr)}.`,
      result: line([unk("t")], [num(years)]),
      conclusion: `It took ${years} years.`,
    },
  };
}

function perimeterStory(target: string): LitWord {
  const other = target === "l" ? "w" : "l";
  const otherVal = randInt(4, 12);
  const unknownVal = randInt(6, 16);
  const P = 2 * unknownVal + 2 * otherVal;
  const twoOther = 2 * otherVal;
  const otherName = other === "w" ? "width" : "length";
  const targetName = target === "l" ? "length" : "width";
  return {
    story: `A rectangular garden has perimeter ${P} feet and ${otherName} ${otherVal} feet. Use P = 2l + 2w.`,
    question: `Solve the formula for ${target}, then find the ${targetName}.`,
    letStatement: "Let P be the perimeter in feet. Let l be the length. Let w be the width.",
    apply: {
      plugged: line(
        [unk(target)],
        [frac([num(P), op("−"), num(2), op("·"), num(otherVal)], [num(2)])],
      ),
      simplified: line([unk(target)], [frac([num(P - twoOther)], [num(2)])]),
      simplifyNote: `2 · ${otherVal} = ${twoOther}, and ${P} − ${twoOther} = ${P - twoOther}.`,
      result: line([unk(target)], [num(unknownVal)]),
      conclusion: `The ${targetName} is ${unknownVal} feet.`,
    },
  };
}

function areaStory(target: string): LitWord {
  const otherVal = pick([4, 5, 6, 8, 10, 12]);
  const unknownVal = randInt(5, 15);
  const A = otherVal * unknownVal;
  const other = target === "l" ? "w" : "l";
  const otherName = other === "w" ? "width" : "length";
  const targetName = target === "l" ? "length" : "width";
  const item = pick(["banner", "poster", "garden bed", "bulletin board"]);
  return {
    story: `A rectangular ${item} has area ${A} square inches and ${otherName} ${otherVal} inches. Use A = lw.`,
    question: `Solve the formula for ${target}, then find the ${targetName}.`,
    letStatement: "Let A be the area in square inches. Let l be the length. Let w be the width.",
    apply: productApply(
      target,
      A,
      [otherVal],
      unknownVal,
      `The ${targetName} is ${unknownVal} inches.`,
    ),
  };
}

function ohmsStory(target: string): LitWord {
  const I = pick([2, 3, 4, 5, 6]);
  const R = pick([2, 3, 4, 5, 8, 10]);
  const V = I * R;
  if (target === "R") {
    return {
      story: `A ${V}-volt battery sends ${I} amps through a circuit. Use V = IR.`,
      question: "Solve the formula for R, then find the resistance.",
      letStatement: "Let V be the voltage in volts. Let I be the current in amps. Let R be the resistance in ohms.",
      apply: productApply("R", V, [I], R, `The resistance is ${R} ohms.`),
    };
  }
  return {
    story: `A ${V}-volt battery is connected to a ${R}-ohm resistor. Use V = IR.`,
    question: "Solve the formula for I, then find the current.",
    letStatement: "Let V be the voltage in volts. Let I be the current in amps. Let R be the resistance in ohms.",
    apply: productApply("I", V, [R], I, `The current is ${I} amps.`),
  };
}

function forceStory(target: string): LitWord {
  const m = pick([2, 3, 4, 5, 6, 8]);
  const a = pick([2, 3, 4, 5]);
  const F = m * a;
  const object = pick(["cart", "crate", "sled", "wagon"]);
  if (target === "a") {
    return {
      story: `A ${F} N force acts on a ${m} kg ${object}. Use F = ma.`,
      question: "Solve the formula for a, then find the acceleration.",
      letStatement: "Let F be the force in newtons. Let m be the mass in kilograms. Let a be the acceleration in meters per second squared.",
      apply: productApply("a", F, [m], a, `The acceleration is ${a} m/s².`),
    };
  }
  return {
    story: `A ${F} N force gives a ${object} an acceleration of ${a} m/s². Use F = ma.`,
    question: "Solve the formula for m, then find the mass.",
    letStatement: "Let F be the force in newtons. Let m be the mass in kilograms. Let a be the acceleration in meters per second squared.",
    apply: productApply("m", F, [a], m, `The mass is ${m} kg.`),
  };
}

function linearApply(
  target: string,
  y: number,
  m: number,
  x: number,
  b: number,
  conclusion: string,
): LitApply {
  if (target === "x" || target === "n" || target === "t") {
    const inner = y - b;
    return {
      plugged: line([unk(target)], [frac([num(y), op("−"), num(b)], [num(m)])]),
      simplified: line([unk(target)], [frac([num(inner)], [num(m)])]),
      simplifyNote: `${y} − ${b} = ${inner}.`,
      result: line([unk(target)], [num(x)]),
      conclusion,
    };
  }
  const mx = m * x;
  return {
    plugged: line([unk(target)], [num(y), op("−"), ...parenNum(m), ...parenNum(x)]),
    simplified: line([unk(target)], [num(y), op("−"), num(mx)]),
    simplifyNote: `${m} · ${x} = ${mx}.`,
    result: line([unk(target)], [num(b)]),
    conclusion,
  };
}

function slopeStory(name: string, target: string): LitWord {
  const m = pick([2, 3, 4, 5]);
  if (target === "x") {
    const b = pick([3, 4, 5, 6, 8]);
    const x = randInt(3, 9);
    const y = m * x + b;
    return {
      story: `A taxi charges $${m} per mile plus a $${b} fee. ${name}'s fare is $${y}. Use y = mx + b.`,
      question: "Solve the formula for x, then find how many miles the ride was.",
      letStatement: "Let y be the fare in dollars. Let m be the charge per mile. Let x be the number of miles. Let b be the fee.",
      apply: linearApply("x", y, m, x, b, `The ride was ${x} miles.`),
    };
  }
  const x = randInt(3, 8);
  const b = pick([3, 4, 5, 6, 8]);
  const y = m * x + b;
  return {
    story: `A taxi charges $${m} per mile plus a fee. After ${x} miles, ${name}'s fare is $${y}. Use y = mx + b.`,
    question: "Solve the formula for b, then find the fee.",
    letStatement: "Let y be the fare in dollars. Let m be the charge per mile. Let x be the number of miles. Let b be the fee.",
    apply: linearApply("b", y, m, x, b, `The fee is $${b}.`),
  };
}

function motionStory(name: string, target: string): LitWord {
  const a = pick([2, 3, 4]);
  if (target === "t") {
    const u = pick([2, 3, 4, 5]);
    const t = randInt(3, 8);
    const v = u + a * t;
    return {
      story: `${name}'s cart starts at ${u} m/s and speeds up by ${a} m/s each second. Its speed is ${v} m/s. Use v = u + at.`,
      question: "Solve the formula for t, then find how many seconds it took.",
      letStatement: "Let v be the speed in meters per second. Let u be the starting speed. Let a be the acceleration. Let t be the time in seconds.",
      apply: linearApply("t", v, a, t, u, `It took ${t} seconds.`),
    };
  }
  const t = randInt(3, 7);
  const u = pick([2, 3, 4, 5, 6]);
  const v = u + a * t;
  return {
    story: `${name}'s cart speeds up by ${a} m/s each second. After ${t} seconds its speed is ${v} m/s. Use v = u + at.`,
    question: "Solve the formula for u, then find the starting speed.",
    letStatement: "Let v be the speed in meters per second. Let u be the starting speed. Let a be the acceleration. Let t be the time in seconds.",
    apply: linearApply("u", v, a, t, u, `The starting speed was ${u} m/s.`),
  };
}

function costStory(name: string, target: string): LitWord {
  const p = pick([2, 3, 4, 5]);
  if (target === "n") {
    const f = pick([5, 6, 8, 10]);
    const n = randInt(3, 9);
    const C = p * n + f;
    return {
      story: `The carnival charges a $${f} entry fee plus $${p} per ride. ${name} spent $${C}. Use C = pn + f.`,
      question: "Solve the formula for n, then find how many rides were taken.",
      letStatement: "Let C be the total cost. Let p be the price per ride. Let n be the number of rides. Let f be the entry fee.",
      apply: linearApply("n", C, p, n, f, `${name} took ${n} rides.`),
    };
  }
  const n = randInt(3, 8);
  const f = pick([5, 6, 8, 10, 12]);
  const C = p * n + f;
  return {
    story: `Each ride costs $${p}. After ${n} rides, ${name} spent $${C} including the entry fee. Use C = pn + f.`,
    question: "Solve the formula for f, then find the entry fee.",
    letStatement: "Let C be the total cost. Let p be the price per ride. Let n be the number of rides. Let f be the entry fee.",
    apply: linearApply("f", C, p, n, f, `The entry fee is $${f}.`),
  };
}

function tempStory(): LitWord {
  const C = pick([0, 10, 15, 20, 25, 30]);
  const F = (9 * C) / 5 + 32;
  const inner = F - 32;
  return {
    story: `The temperature outside is ${F}°F. Use F = (9/5)C + 32.`,
    question: "Solve the formula for C, then find the Celsius temperature.",
    letStatement: "Let F be the Fahrenheit temperature. Let C be the Celsius temperature.",
    apply: {
      plugged: line(
        [unk("C")],
        [frac([num(5)], [num(9)]), op("("), num(F), op("−"), num(32), op(")")],
      ),
      simplified: line([unk("C")], [frac([num(5)], [num(9)]), op("("), num(inner), op(")")]),
      simplifyNote: `${F} − 32 = ${inner}.`,
      result: line([unk("C")], [num(C)]),
      conclusion: `The temperature is ${C}°C.`,
    },
  };
}

function triangleStory(target: string): LitWord {
  const otherVal = pick([6, 8, 10, 12]);
  const unknownVal = pick([5, 6, 8, 9, 10, 12]);
  const A = (otherVal * unknownVal) / 2;
  const other = target === "h" ? "b" : "h";
  const otherName = other === "b" ? "base" : "height";
  const targetName = target === "h" ? "height" : "base";
  const item = pick(["banner", "sail", "garden plot", "flag"]);
  return {
    story: `A triangular ${item} has area ${A} square inches and ${otherName} ${otherVal} inches. Use A = (1/2)bh.`,
    question: `Solve the formula for ${target}, then find the ${targetName}.`,
    letStatement: "Let A be the area in square inches. Let b be the base. Let h be the height.",
    apply: {
      plugged: line([unk(target)], [frac([num(2), op("·"), num(A)], [num(otherVal)])]),
      simplified: line([unk(target)], [frac([num(2 * A)], [num(otherVal)])]),
      simplifyNote: `2 · ${A} = ${2 * A}.`,
      result: line([unk(target)], [num(unknownVal)]),
      conclusion: `The ${targetName} is ${unknownVal} inches.`,
    },
  };
}

function meanStory(name: string, target: string): LitWord {
  const M = pick([80, 84, 86, 88, 90]);
  const delta = pick([2, 4, 6, 8, 10]);
  const otherVal = M - delta;
  const unknownVal = M + delta;
  return {
    story: `${name}'s average on two quizzes is ${M}. One score is ${otherVal}. Use M = (x + y)/2.`,
    question: `Solve the formula for ${target}, then find the other score.`,
    letStatement: "Let M be the average (mean). Let x and y be the two scores.",
    apply: {
      plugged: line([unk(target)], [num(2), op("·"), num(M), op("−"), num(otherVal)]),
      simplified: line([unk(target)], [num(2 * M), op("−"), num(otherVal)]),
      simplifyNote: `2 · ${M} = ${2 * M}.`,
      result: line([unk(target)], [num(unknownVal)]),
      conclusion: `The other score is ${unknownVal}.`,
    },
  };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("en-US") : String(n);
}

function nice(n: number): number {
  return Math.round(n * 1e10) / 1e10;
}
