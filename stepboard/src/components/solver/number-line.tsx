import type { Relation } from "@/lib/algebra/types";

export function NumberLine({
  value,
  rel,
  variable,
}: {
  value: number;
  rel: Relation;
  variable: string;
}) {
  if (rel === "=") return null;
  const open = rel === "<" || rel === ">";
  const leftward = rel === "<" || rel === "≤";
  const min = value - 5;
  const max = value + 5;
  const ticks = [];
  for (let n = min; n <= max; n++) ticks.push(n);
  const x = (n: number) => ((n - min) / (max - min)) * 100;

  return (
    <div className="mt-5 max-w-xl">
      <p className="mb-2 text-xs font-medium tracking-[0.16em] text-muted uppercase">
        Number line
      </p>
      <svg
        viewBox="0 0 320 56"
        className="w-full text-ink"
        role="img"
        aria-label={`${variable} ${rel} ${value}`}
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
              x1={(x(n) / 100) * 304 + 8}
              y1="22"
              x2={(x(n) / 100) * 304 + 8}
              y2="34"
              stroke="currentColor"
              strokeWidth={n === value ? 2 : 1}
            />
            <text
              x={(x(n) / 100) * 304 + 8}
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
        {leftward ? (
          <line
            x1="8"
            y1="28"
            x2={(x(value) / 100) * 304 + 8}
            y2="28"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : (
          <line
            x1={(x(value) / 100) * 304 + 8}
            y1="28"
            x2="312"
            y2="28"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        <circle
          cx={(x(value) / 100) * 304 + 8}
          cy="28"
          r="6"
          fill={open ? "var(--color-surface)" : "var(--color-accent)"}
          stroke="var(--color-accent)"
          strokeWidth="2"
        />
      </svg>
      <p className="mt-1 text-xs text-ink-soft">
        {open ? "Open circle" : "Closed circle"} at {value}. Shade{" "}
        {leftward ? "left" : "right"} for {variable} {rel} {value}.
      </p>
    </div>
  );
}