import { pick, randInt } from "../algebra/random.ts";
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

export type LitWord = {
  story: string;
  question: string;
  letStatement: string;
};

const WORD_IDS = new Set(["force", "distance", "area", "ohms", "interest", "perimeter"]);

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
    default:
      return undefined;
  }
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
      letStatement: "Let t be the time in hours.",
    };
  }
  return {
    story: `${name} is ${d} miles from ${to} and needs to be there in ${t} hours. Use d = rt.`,
    question: "Solve the formula for r, then find how fast to drive.",
    letStatement: "Let r be the speed in miles per hour.",
  };
}

function interestStory(name: string, target: string): LitWord {
  const years = randInt(2, 5);
  const rPct = pick([3, 4, 5, 6]);
  if (target === "r") {
    const P = pick([2000, 2500, 3000, 3500, 4000, 5000]);
    const I = (P * rPct * years) / 100;
    return {
      story: `${name} borrowed $${fmt(P)}. After ${years} years the interest paid was $${fmt(I)}. Use I = Prt.`,
      question: "Solve the formula for r, then find the interest rate.",
      letStatement: "Let r be the annual interest rate (as a decimal).",
    };
  }
  if (target === "P") {
    const P = pick([1000, 1500, 2000, 2500, 4000, 5000]);
    const I = (P * rPct * years) / 100;
    return {
      story: `${name} wants $${fmt(I)} of interest in ${years} years at ${rPct}% simple interest. Use I = Prt.`,
      question: "Solve the formula for P, then find how much to invest.",
      letStatement: "Let P be the principal in dollars.",
    };
  }
  const P2 = pick([1000, 2000, 2500, 4000, 5000]);
  const I2 = (P2 * rPct * years) / 100;
  return {
    story: `${name} invested $${fmt(P2)} at ${rPct}% simple interest and earned $${fmt(I2)}. Use I = Prt.`,
    question: "Solve the formula for t, then find how many years it took.",
    letStatement: "Let t be the time in years.",
  };
}

function perimeterStory(target: string): LitWord {
  const other = target === "l" ? "w" : "l";
  const otherVal = randInt(4, 12);
  const unknownVal = randInt(6, 16);
  const P = 2 * unknownVal + 2 * otherVal;
  const otherName = other === "w" ? "width" : "length";
  const targetName = target === "l" ? "length" : "width";
  return {
    story: `A rectangular garden has perimeter ${P} feet and ${otherName} ${otherVal} feet. Use P = 2l + 2w.`,
    question: `Solve the formula for ${target}, then find the ${targetName}.`,
    letStatement: `Let ${target} be the ${targetName} in feet.`,
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
    letStatement: `Let ${target} be the ${targetName} in inches.`,
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
      letStatement: "Let R be the resistance in ohms.",
    };
  }
  return {
    story: `A ${V}-volt battery is connected to a ${R}-ohm resistor. Use V = IR.`,
    question: "Solve the formula for I, then find the current.",
    letStatement: "Let I be the current in amps.",
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
      letStatement: "Let a be the acceleration in meters per second squared.",
    };
  }
  return {
    story: `A ${F} N force gives a ${object} an acceleration of ${a} m/s². Use F = ma.`,
    question: "Solve the formula for m, then find the mass.",
    letStatement: "Let m be the mass in kilograms.",
  };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("en-US") : String(n);
}
