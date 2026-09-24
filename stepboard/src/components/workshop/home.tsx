import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, Columns2, FunctionSquare, Lock, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WorkshopHome() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/80">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
            Classroom tools
          </p>
          <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
            Algebra Workshop
          </h1>
          <p className="mt-2 max-w-lg text-base text-ink-soft">
            Line-by-line Algebra 1, built for the board. Stepboard is free.
            Inequalities, literal equations, and substitution are Plus — preview
            them until billing opens. Elimination is coming soon.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/stepboard"
          className="group flex min-h-44 flex-col rounded-xl bg-surface p-6 shadow-[var(--shadow-border)] transition-shadow duration-200 hover:shadow-[var(--shadow-border-hover)]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
              Free
            </p>
            <Scale className="size-5 text-accent" />
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-tight">Stepboard</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
            One-, two-, and three-step equations. Watch, play, or practice the
            next move. Word problems included.
          </p>
          <p className="mt-6 text-sm font-medium text-accent">Open Stepboard</p>
        </Link>

        <Link
          to="/inequalities"
          className="group flex min-h-44 flex-col rounded-xl bg-surface p-6 shadow-[var(--shadow-border)] transition-shadow duration-200 hover:shadow-[var(--shadow-border-hover)]"
        >
          <div className="flex items-center justify-between gap-3">
            <Badge tone="accent">Plus</Badge>
            <Lock className="size-5 text-muted" />
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-tight">
            Inequalities
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
            Same line-by-line board, with {"<"}, {">"}, ≤, and ≥. Flip the sign
            when you multiply or divide by a negative. Graph the solution on a
            number line.
          </p>
          <p className="mt-6 text-sm font-medium text-accent">
            Preview inequalities
          </p>
        </Link>

        <Link
          to="/literals"
          className="group flex min-h-44 flex-col rounded-xl bg-surface p-6 shadow-[var(--shadow-border)] transition-shadow duration-200 hover:shadow-[var(--shadow-border-hover)]"
        >
          <div className="flex items-center justify-between gap-3">
            <Badge tone="accent">Plus</Badge>
            <FunctionSquare className="size-5 text-muted" />
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-tight">
            Literal equations
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
            Solve a formula for one letter. F = ma, y = mx + b, P = 2l + 2w.
            Same inverses as Stepboard.
          </p>
          <p className="mt-6 text-sm font-medium text-accent">
            Preview literal equations
          </p>
        </Link>

        <Link
          to="/systems-substitution"
          className="group flex min-h-44 flex-col rounded-xl bg-surface p-6 shadow-[var(--shadow-border)] transition-shadow duration-200 hover:shadow-[var(--shadow-border-hover)]"
        >
          <div className="flex items-center justify-between gap-3">
            <Badge tone="accent">Plus</Badge>
            <ArrowLeftRight className="size-5 text-muted" />
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-tight">
            Substitution
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
            Systems of two equations. Easy starts with a number, like x = 4.
            Then an expression. Then isolate that expression first.
          </p>
          <p className="mt-6 text-sm font-medium text-accent">
            Preview substitution
          </p>
        </Link>

        <div className="flex min-h-44 flex-col rounded-xl bg-surface p-6 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between gap-3">
            <Badge>Coming soon</Badge>
            <Columns2 className="size-5 text-muted" />
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-tight text-ink-soft">
            Elimination
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
            Systems of two equations. Add or subtract so one column cancels.
            Multiply first when the coefficients do not match.
          </p>
          <p className="mt-6 text-sm font-medium text-muted">Coming soon</p>
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <p className="text-center text-xs text-muted">
          For more math fun, visit{" "}
          <a
            href="https://chancelab.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-line underline-offset-2 hover:text-ink-soft"
          >
            Chance Lab
          </a>
        </p>
      </footer>
    </div>
  );
}
