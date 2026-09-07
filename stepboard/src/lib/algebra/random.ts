export function randInt(min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  if (hi < lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function randIntNonZero(min: number, max: number): number {
  for (let i = 0; i < 48; i++) {
    const n = randInt(min, max);
    if (n !== 0) return n;
  }
  return max >= 1 ? 1 : min <= -1 ? -1 : 1;
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function maybeNeg(n: number, allow: boolean, chance = 0.4): number {
  const mag = Math.abs(n);
  if (mag === 0) return 0;
  if (!allow) return mag;
  return Math.random() < chance ? -mag : mag;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}
