import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/algebra/format";
import type { EquationLine, MathToken } from "@/lib/algebra/types";

export function EquationView({
  line,
  size = "lg",
  annotation,
  className,
}: {
  line: EquationLine;
  size?: "sm" | "md" | "lg" | "xl";
  annotation?: EquationLine;
  className?: string;
}) {
  const sizeClass =
    size === "xl"
      ? "text-3xl sm:text-4xl"
      : size === "lg"
        ? "text-2xl sm:text-3xl"
        : size === "md"
          ? "text-xl sm:text-2xl"
          : "text-lg";

  return (
    <div
      className={cn(
        "font-sans font-semibold tracking-normal text-ink tabular-nums lining-nums",
        sizeClass,
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
        <TokenRow tokens={line.left} />
        <span className="text-ink-soft px-0.5">{line.rel ?? "="}</span>
        <TokenRow tokens={line.right} />
      </div>
      {annotation ? (
        <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-3 text-[0.65em] text-muted">
          <TokenRow tokens={annotation.left} />
          <span className="opacity-0">=</span>
          <TokenRow tokens={annotation.right} />
        </div>
      ) : null}
    </div>
  );
}

export function TokenRow({ tokens }: { tokens: MathToken[] }) {
  return (
    <span className="inline-flex items-baseline gap-[0.06em]">
      {tokens.map((t, i) => (
        <Token key={i} token={t} />
      ))}
    </span>
  );
}

function Token({ token }: { token: MathToken }) {
  switch (token.type) {
    case "coef":
      return <span className="tok-coef">{formatNumber(token.value)}</span>;
    case "var":
      return (
        <span className={token.param ? "tok-param" : "tok-var"}>
          {token.letter}
        </span>
      );
    case "const":
      return <span className="tok-const">{formatNumber(token.value)}</span>;
    case "op":
      return (
        <span className="text-ink-soft px-[0.04em] not-italic">
          {token.value}
        </span>
      );
    case "group":
      return <TokenRow tokens={token.tokens} />;
    case "frac":
      return (
        <span className="mx-0.5 inline-flex flex-col items-center align-middle leading-none">
          <span className="px-1 pb-0.5">
            <TokenRow tokens={token.num} />
          </span>
          <span className="block h-px w-full bg-ink" />
          <span className="px-1 pt-0.5">
            <TokenRow tokens={token.den} />
          </span>
        </span>
      );
  }
}
