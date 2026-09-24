import { Check, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EquationView } from "@/components/solver/colored-math";
import { SystemsControls } from "@/components/solver/systems-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAY_SPEEDS, type PlaySpeed } from "@/lib/algebra/types";
import { generateElimination } from "@/lib/systems/elimination";
import { canAskSystem, systemChoices, type SystemChoice } from "@/lib/systems/practice";
import { generateSubstitution } from "@/lib/systems/substitution";
import {
  DEFAULT_ELIM_SETTINGS,
  DEFAULT_SUB_SETTINGS,
  type SystemMethod,
  type SystemProblem,
  type SystemSettings,
  type SystemStep,
  type SubLevel,
} from "@/lib/systems/types";
import { cn } from "@/lib/utils";

export function SystemsApp({ method }: { method: SystemMethod }) {
  const defaults = method === "substitution" ? DEFAULT_SUB_SETTINGS : DEFAULT_ELIM_SETTINGS;
  const storageKey = method === "substitution" ? "systems-sub-settings" : "systems-elim-settings";
  const [settings, setSettings] = useState<SystemSettings>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const [problem, setProblem] = useState<SystemProblem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const playRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const rebuild = useCallback(
    (s: SystemSettings) => {
      try {
        const next =
          method === "substitution" ? generateSubstitution(s) : generateElimination(s);
        setProblem(next);
        setError(null);
        setVisible(1);
        setPlaying(false);
        setFeedback(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not build that system.");
        setProblem(null);
      }
    },
    [method],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
    } catch {
      /* keep defaults */
    }
    setHydrated(true);
  }, [defaults, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    rebuild(settingsRef.current);
  }, [hydrated, rebuild]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, hydrated, storageKey]);

  const patch = (partial: Partial<SystemSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    const changed =
      partial.subLevel !== undefined ||
      partial.elimStyle !== undefined ||
      partial.negatives !== undefined;
    if (changed) rebuild(next);
  };

  const onNew = () => rebuild(settingsRef.current);
  const steps = problem?.steps ?? [];
  const max = Math.max(1, steps.length);
  const canPrev = visible > 1;
  const canNext = visible < max;

  const choices = useMemo(() => {
    if (!problem || settings.mode !== "practice") return [];
    if (!canAskSystem(problem.steps, visible)) return [];
    return systemChoices(problem.steps, visible, method);
  }, [problem, settings.mode, visible]);

  useEffect(() => {
    if (choices.length > 0 && playing) setPlaying(false);
  }, [choices.length, playing]);

  useEffect(() => {
    if (!playing) {
      if (playRef.current) window.clearInterval(playRef.current);
      playRef.current = null;
      return;
    }
    const pace = PLAY_SPEEDS.find((s) => s.id === settings.playSpeed) ?? PLAY_SPEEDS[1]!;
    playRef.current = window.setInterval(() => {
      setVisible((v) => {
        if (v >= max) {
          setPlaying(false);
          return v;
        }
        return v + 1;
      });
    }, pace.ms);
    return () => {
      if (playRef.current) window.clearInterval(playRef.current);
    };
  }, [playing, max, settings.playSpeed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setVisible((v) => Math.min(max, v + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setVisible((v) => Math.max(1, v - 1));
      } else if (e.key === "n" || e.key === "N") onNew();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onChoice = (choice: SystemChoice) => {
    if (choice.correct) {
      setVisible((v) => Math.min(max, v + 1));
      setFeedback({ ok: true, text: "That's the next move." });
    } else {
      setFeedback({ ok: false, text: choice.whyWrong ?? "Not the next move." });
    }
  };

  const title =
    method === "substitution" ? "Substitution method" : "Elimination method";
  const blurb =
    method === "substitution"
      ? "Two equations, two unknowns. Replace a letter, then solve for the other one."
      : "Make one column cancel by adding or subtracting. Multiply first when the coefficients do not match.";

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/80">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
            <Link to="/" className="hover:text-ink-soft">
              Algebra Workshop
            </Link>
            {" · Plus · Systems of two equations"}
          </p>
          <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">{title}</h1>
          <p className="mt-1 max-w-lg text-sm text-ink-soft">{blurb}</p>
          {method === "substitution" ? (
            <div className="mt-5 max-w-md">
              <div
                className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1"
                role="radiogroup"
                aria-label="Level"
              >
                {(
                  [
                    { value: "easy", label: "Easy" },
                    { value: "medium", label: "Medium" },
                    { value: "advanced", label: "Hard" },
                  ] as { value: SubLevel; label: string }[]
                ).map((opt) => {
                  const active = settings.subLevel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => patch({ subLevel: opt.value })}
                      className={cn(
                        "h-11 rounded-sm text-sm font-medium transition-colors duration-150",
                        active
                          ? "bg-surface text-ink shadow-[var(--shadow-border)]"
                          : "text-ink-soft hover:text-ink",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(280px,340px)_1fr] lg:items-start">
        <div className="order-last lg:order-first">
          {hydrated ? (
            <SystemsControls
              method={method}
              settings={settings}
              onChange={patch}
              onReset={() => {
                setSettings(defaults);
                rebuild(defaults);
              }}
              onNew={onNew}
            />
          ) : (
            <aside className="min-h-48 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]" />
          )}
        </div>

        <section className="space-y-4">
          {error ? (
            <div className="rounded-xl bg-bad-soft px-5 py-4 text-sm text-bad">{error}</div>
          ) : null}

          {problem ? (
            <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl tracking-tight">System</h2>
                <Badge tone="accent">{problem.structureLabel}</Badge>
              </div>
              <p className="font-display text-2xl tracking-tight text-var">{problem.prompt}</p>
              <p className="mt-1 text-sm text-ink-soft">
                Both letters are unknowns. Find the pair (x, y).
              </p>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl shadow-[var(--shadow-border)]">
            <div className="paper-sheet px-4 py-8 sm:px-8 sm:py-10">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
                  Worked example
                </p>
                <Badge>
                  Step {visible} of {max}
                </Badge>
              </div>
              <div className="space-y-6">
                {steps.slice(0, visible).map((step, i, rows) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    active={i === rows.length - 1}
                    substitution={method === "substitution"}
                  />
                ))}
              </div>
            </div>
          </div>

          {settings.mode === "practice" && choices.length > 0 ? (
            <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <h3 className="font-display text-lg tracking-tight">What is the next move?</h3>
              <p className="mb-4 text-sm text-ink-soft">
                {method === "substitution"
                  ? "Choose the next move, and the equation it belongs to."
                  : "Replacement, distribution, and elimination are different moves."}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {choices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChoice(c)}
                    className="min-h-11 rounded-md bg-surface-2 px-4 py-3 text-left text-sm font-medium text-ink transition-colors duration-150 hover:bg-accent-soft"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {feedback ? (
                <p
                  className={cn(
                    "mt-3 flex items-start gap-2 text-sm",
                    feedback.ok ? "text-ok" : "text-bad",
                  )}
                >
                  {feedback.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
                  {feedback.text}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setVisible((v) => Math.max(1, v - 1))}
              disabled={!canPrev}
            >
              <ChevronLeft />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPlaying((p) => !p)}
              disabled={!canNext && !playing}
            >
              {playing ? <Pause /> : <Play className="ml-0.5" />}
              {playing ? "Pause" : "Play steps"}
            </Button>
            <Button onClick={() => setVisible((v) => Math.min(max, v + 1))} disabled={!canNext}>
              Next
              <ChevronRight />
            </Button>
            <Button variant="ghost" onClick={() => setVisible(max)}>
              Show solution
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium tracking-wide text-ink-soft">Play pace</p>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
              {PLAY_SPEEDS.map((speed) => {
                const active = settings.playSpeed === speed.id;
                return (
                  <button
                    key={speed.id}
                    type="button"
                    onClick={() => patch({ playSpeed: speed.id as PlaySpeed })}
                    className={cn(
                      "min-h-11 rounded-sm px-3 text-sm font-medium transition-colors duration-150",
                      active
                        ? "bg-surface text-ink shadow-[var(--shadow-border)]"
                        : "text-ink-soft hover:text-ink",
                    )}
                  >
                    {speed.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StepRow({
  step,
  active,
  substitution,
}: {
  step: SystemStep;
  active: boolean;
  substitution: boolean;
}) {
  return (
    <div className={cn("step-enter", !active && "opacity-70")}>
      {step.banner ? (
        <div className="mb-4 max-w-xl border-t border-line-strong pt-5">
          {step.banner.kicker ? (
            <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
              {step.banner.kicker}
            </p>
          ) : null}
          {step.banner.text ? (
            <p className={cn("text-sm leading-relaxed text-ink", step.banner.kicker && "mt-1 text-ink-soft")}>
              {step.banner.text}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-2">
        <EqCard
          caption={step.topCaption}
          step={step}
          which="top"
          hot={active && (step.focus === "top" || step.focus === "both")}
          substitution={substitution}
        />
        <EqCard
          caption={step.bottomCaption}
          step={step}
          which="bottom"
          hot={active && (step.focus === "bottom" || step.focus === "both")}
          substitution={substitution}
        />
      </div>
      {active && step.explanation ? (
        <div className="mt-3 max-w-xl">
          <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
            {step.property}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}

function EqCard({
  caption,
  step,
  which,
  hot,
  substitution,
}: {
  caption: string;
  step: SystemStep;
  which: "top" | "bottom";
  hot: boolean;
  substitution: boolean;
}) {
  const line = which === "top" ? step.top : step.bottom;
  const showNote =
    !!step.annotation &&
    (which === "top" ? step.focus !== "bottom" : step.focus === "bottom");
  const ghosted = step.ghost === which;
  const generic = caption === "Equation 1" || caption === "Equation 2";
  return (
    <div className={cn("rounded-lg px-2 py-2", hot && !ghosted && "bg-accent-soft/50", ghosted && "opacity-35")}>
      {generic ? null : (
        <p className="mb-1 text-center text-[0.65rem] font-medium tracking-[0.16em] text-muted uppercase">
          {caption}
        </p>
      )}
      <EquationView
        line={line}
        annotation={showNote ? step.annotation : undefined}
        size="lg"
        substitution={substitution}
      />
    </div>
  );
}
