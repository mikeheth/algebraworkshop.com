import type { Relation } from "@/lib/algebra/types";

export function NumberLine({
  value,
  rel,
  variable,
  floor = null,
  unit,
}: {
  value: number;
  rel: Relation;
  variable: string;
  /** When set (usually 0), a left-shaded graph stops here instead of −∞. */
  floor?: number | null;
  unit?: string;
}) {
  if (rel === "=") return null;
  const open = rel === "<" || rel === ">";
  const leftward = rel === "<" || rel === "≤";
  const clampLeft = floor != null && leftward;
  const leftEnd = clampLeft ? floor : null;

  let min = value - 5;
  let max = value + 5;
  if (clampLeft && leftEnd != null) {
    min = Math.min(leftEnd - 1, value - 2);
    max = Math.max(value + 2, leftEnd + 4);
    if (max - min < 6) max = min + 6;
  }

  const ticks: number[] = [];
  for (let n = min; n <= max; n++) ticks.push(n);
  const px = (n: number) => ((n - min) / (max - min)) * 304 + 8;

  const shadeX1 = leftward ? px(leftEnd ?? min) : px(value);
  const shadeX2 = leftward ? px(value) : 312;
  const compound =
    clampLeft && leftEnd != null
      ? `0 ≤ ${variable} ${rel} ${value}`
      : `${variable} ${rel} ${value}`;

  return (
    <div className="mt-5 max-w-xl">
      <p className="mb-2 text-xs font-medium tracking-[0.16em] text-muted uppercase">
        Number line
      </p>
      <svg
        viewBox="0 0 320 56"
        className="w-full text-ink"
        role="img"
        aria-label={
          unit ? `${compound}. Integer values only.` : compound
        }
      >
        <line
          x1="8"
          y1="28"
          x2="312"
          y2="28"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <polygon points="312,28 304,24 304,32" fill="currentColor" />
        <polygon points="8,28 16,24 16,32" fill="currentColor" />
        {ticks.map((n) => (
          <g key={n}>
            <line
              x1={px(n)}
              y1="22"
              x2={px(n)}
              y2="34"
              stroke="currentColor"
              strokeWidth={n === value || n === leftEnd ? 2 : 1}
            />
            <text
              x={px(n)}
              y="50"
              textAnchor="middle"
              className="fill-ink-soft"
              fontSize="10"
              fontFamily="inherit"
            >
              {n}
            </text>
          </g>
        ))}
        <line
          x1={shadeX1}
          y1="28"
          x2={shadeX2}
          y2="28"
          stroke="var(--color-accent)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {leftEnd != null ? (
          <circle
            cx={px(leftEnd)}
            cy="28"
            r="6"
            fill="var(--color-accent)"
            stroke="var(--color-accent)"
            strokeWidth="2"
          />
        ) : null}
        <circle
          cx={px(value)}
          cy="28"
          r="6"
          fill={open ? "var(--color-surface)" : "var(--color-accent)"}
          stroke="var(--color-accent)"
          strokeWidth="2"
        />
      </svg>
      <p className="mt-1 text-xs text-ink-soft">{caption()}</p>
      {unit ? (
        <p className="mt-1 text-xs font-medium text-ink">Integer values only.</p>
      ) : null}
    </div>
  );

  function caption(): string {
    const end = `${open ? "Open circle" : "Closed circle"} at ${value}`;
    if (clampLeft && leftEnd != null) {
      const thing = unit ?? "This count";
      const cap = thing.charAt(0).toUpperCase() + thing.slice(1);
      return `${end}. Closed circle at ${leftEnd} — ${cap} can't be negative. Shade from ${leftEnd} to ${value} for ${compound}.`;
    }
    return `${end}. Shade ${leftward ? "left" : "right"} for ${variable} ${rel} ${value}.`;
  }
}
