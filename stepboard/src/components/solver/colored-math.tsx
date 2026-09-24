import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/algebra/format";
import type { EquationLine, MathToken } from "@/lib/algebra/types";

export function EquationView({
  line,
  size = "lg",
  annotation,
  className,
  substitution = false,
}: {
  line: EquationLine;
  size?: "sm" | "md" | "lg" | "xl";
  annotation?: EquationLine;
  className?: string;
  /** Plain ink, except tokens marked as the substituted value or expression. */
  substitution?: boolean;
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
        <TokenRow tokens={line.left} substitution={substitution} />
        <span className="text-ink-soft px-0.5">{line.rel ?? "="}</span>
        <TokenRow tokens={line.right} substitution={substitution} />
      </div>
      {annotation ? (
        <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-3 text-[0.65em] text-muted">
          <TokenRow tokens={annotation.left} substitution={substitution} />
          <span className="opacity-0">=</span>
          <TokenRow tokens={annotation.right} substitution={substitution} />
        </div>
      ) : null}
    </div>
  );
}

export function TokenRow({ tokens, substitution = false }: { tokens: MathToken[]; substitution?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-[0.06em]">
      {tokens.map((t, i) => (
        <Token key={i} token={t} substitution={substitution} />
      ))}
    </span>
  );
}

function Token({ token, substitution }: { token: MathToken; substitution: boolean }) {
  const marked = substitution && token.sub;
  switch (token.type) {
    case "coef":
      return (
        <span className={marked ? "tok-sub" : substitution ? "text-ink" : "tok-coef"}>
          {formatNumber(token.value)}
        </span>
      );
    case "var":
      return (
        <span
          className={
            marked
              ? "tok-sub italic"
              : substitution
                ? "italic text-ink"
                : token.param
                  ? "tok-param"
                  : "tok-var"
          }
        >
          {token.letter}
        </span>
      );
    case "const":
      return (
        <span className={marked ? "tok-sub" : substitution ? "text-ink" : "tok-const"}>
          {formatNumber(token.value)}
        </span>
      );
    case "op":
      return (
        <span className={cn("px-[0.04em] not-italic", marked ? "tok-sub" : "text-ink-soft")}>
          {token.value}
        </span>
      );
    case "group":
      return <TokenRow tokens={token.tokens} substitution={substitution} />;
    case "frac":
      return (
        <span className="mx-0.5 inline-flex flex-col items-center align-middle leading-none">
          <span className="px-1 pb-0.5">
            <TokenRow tokens={token.num} substitution={substitution} />
          </span>
          <span className={cn("block h-px w-full", marked ? "bg-[#c2302a]" : "bg-ink")} />
          <span className="px-1 pt-0.5">
            <TokenRow tokens={token.den} substitution={substitution} />
          </span>
        </span>
      );
  }
}
