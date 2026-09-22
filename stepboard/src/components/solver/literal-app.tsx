import { Check, ChevronLeft, ChevronRight, Pause, Play, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EquationView } from "@/components/solver/colored-math";
import { LiteralControls } from "@/components/solver/literal-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { equationPlain } from "@/lib/algebra/format";
import { PLAY_SPEEDS, type PlaySpeed, type PracticeChoice } from "@/lib/algebra/types";
import { generateLiteral } from "@/lib/literal/generate";
import { canAskPractice, literalPracticeChoices } from "@/lib/literal/practice";
import { DEFAULT_LIT_SETTINGS, type LitProblem, type LitSettings } from "@/lib/literal/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "literals-settings";

function loadSettings(): LitSettings {
  if (typeof window === "undefined") return DEFAULT_LIT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LIT_SETTINGS;
    return { ...DEFAULT_LIT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LIT_SETTINGS;
  }
}

export function LiteralApp() {
  const [settings, setSettings] = useState<LitSettings>(DEFAULT_LIT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [problem, setProblem] = useState<LitProblem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const playRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  const rebuild = useCallback((s: LitSettings) => {
    try {
      const next = generateLiteral(s);
      setProblem(next);
      setError(null);
      setVisible(1);
      setPlaying(false);
      setFeedback(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build that formula.");
      setProblem(null);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    rebuild(settingsRef.current);
  }, [hydrated, rebuild]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  const patch = (partial: Partial<LitSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    if (partial.stepFilter !== undefined && partial.stepFilter !== settings.stepFilter) {
      rebuild(next);
    }
    if (partial.wordProblem !== undefined && partial.wordProblem !== settings.wordProblem) {
      rebuild(next);
    }
  };

  const onNew = () => rebuild(settingsRef.current);

  const steps = problem?.steps ?? [];
  const max = Math.max(1, steps.length);
  const canPrev = visible > 1;
  const canNext = visible < max;
  const current = steps[Math.min(visible, max) - 1];

  const choices = useMemo(() => {
    if (!problem || settings.mode !== "practice" || !current) return [];
    if (!canAskPractice(problem.steps, visible)) return [];
    return literalPracticeChoices(current, problem.steps);
  }, [problem, settings.mode, current, visible]);

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
      } else if (e.key === "n" || e.key === "N") {
        onNew();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onChoice = (choice: PracticeChoice) => {
    if (!problem) return;
    if (choice.correct) {
      setVisible((v) => Math.min(max, v + 1));
      setFeedback({
        ok: true,
        text: "That's the inverse. The equation stays balanced.",
      });
    } else {
      setFeedback({
        ok: false,
        text: choice.whyWrong ?? "Not the next inverse. Try another move.",
      });
    }
  };

  const shown = steps.slice(0, visible);
  const rows = useMemo(() => {
    const next: typeof shown = [];
    for (const step of shown) {
      const prev = next[next.length - 1];
      if (prev && equationPlain(prev.line) === equationPlain(step.line)) {
        const samePhase =
          !!prev.isCheck === !!step.isCheck &&
          !!prev.isApply === !!step.isApply &&
          !!prev.isSolution === !!step.isSolution;
        if (samePhase) {
          next[next.length - 1] = {
            ...prev,
            annotation: step.annotation ?? prev.annotation,
            explanation: step.explanation,
            property: step.property,
            operation: step.operation ?? prev.operation,
            isSolution: step.isSolution || prev.isSolution,
            isCheck: step.isCheck || prev.isCheck,
            isApply: step.isApply || prev.isApply,
          };
          continue;
        }
      }
      next.push(step);
    }
    return next;
  }, [shown]);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/80">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
            <Link to="/" className="hover:text-ink-soft">
              Algebra Workshop
            </Link>
            {" · Plus"}
          </p>
          <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
            Literal equations
          </h1>
          <p className="mt-1 max-w-lg text-sm text-ink-soft">
            Solve a formula for one letter. Same inverse operations as Stepboard.
            The teal letter is the unknown.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(280px,340px)_1fr] lg:items-start">
        <div className="order-last lg:order-first">
          {hydrated ? (
            <LiteralControls
              settings={settings}
              onChange={patch}
              onReset={() => {
                setSettings(DEFAULT_LIT_SETTINGS);
                rebuild(DEFAULT_LIT_SETTINGS);
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
              {problem.word ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <BookOpen className="size-4 text-accent" />
                    <h2 className="font-display text-xl tracking-tight">Word problem</h2>
                    <Badge tone="accent">{problem.spec.name}</Badge>
                  </div>
                  <p className="max-w-prose text-base leading-relaxed text-ink">
                    {problem.word.story}
                  </p>
                  <p className="mt-3 font-display text-2xl tracking-tight text-var">
                    {problem.word.question}
                  </p>
                  <p className="mt-2 font-display text-sm italic text-var">
                    {problem.word.letStatement}
                  </p>
                  <p className="mt-3 text-sm text-ink-soft">
                    Isolate {problem.target} in the formula first. Teal is the unknown.
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl tracking-tight">{problem.spec.name}</h2>
                    <Badge tone="accent">{problem.spec.context}</Badge>
                  </div>
                  <p className="font-display text-2xl tracking-tight text-var">{problem.prompt}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Teal is {problem.target}. Orange letters stay as letters.
                  </p>
                </>
              )}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl shadow-[var(--shadow-border)]">
            <div className="paper-sheet px-5 py-8 sm:px-10 sm:py-10">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 pl-4 sm:pl-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
                    Worked example
                  </p>
                  {problem ? (
                    <p className="text-sm text-ink-soft">{problem.structureLabel}</p>
                  ) : null}
                </div>
                <Badge>
                  Step {visible} of {max}
                </Badge>
              </div>

              <div className="space-y-5 pl-4 sm:pl-6">
                {rows.map((step, i) => {
                  const active = i === rows.length - 1;
                  const firstCheck =
                    !!step.isCheck && !rows.slice(0, i).some((s) => s.isCheck);
                  const firstApply =
                    !!step.isApply && !rows.slice(0, i).some((s) => s.isApply);
                  const heading = firstCheck || firstApply;
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "step-enter border-l-2 pl-4 transition-colors duration-200",
                        active && !heading ? "border-accent" : "border-transparent",
                        step.isSolution && "pb-2",
                        heading && "mt-4 border-l-transparent pt-6",
                      )}
                    >
                      {firstCheck ? (
                        <div className="mb-5 max-w-xl">
                          <div className="mb-5 border-t border-line-strong" />
                          <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
                            Check
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                            {step.explanation}
                          </p>
                        </div>
                      ) : null}
                      {firstApply ? (
                        <div className="mb-5 max-w-xl">
                          <div className="mb-5 border-t border-line-strong" />
                          <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
                            Now solve
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                            {step.explanation}
                          </p>
                        </div>
                      ) : null}
                      <EquationView
                        line={step.line}
                        annotation={step.annotation}
                        size={
                          step.isOriginal || step.isSolution || heading ? "xl" : "lg"
                        }
                        className={cn(!active && "opacity-70")}
                      />
                      {active && !heading ? (
                        <div className="mt-3 max-w-xl">
                          <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
                            {step.property}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                            {step.explanation}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {settings.mode === "practice" && choices.length > 0 ? (
            <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <h3 className="font-display text-lg tracking-tight">What is the next move?</h3>
              <p className="mb-4 text-sm text-ink-soft">
                Pick the inverse that keeps both sides equal.
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
            {problem ? (
              <span className="ml-auto hidden text-xs text-muted sm:inline">
                {equationPlain(problem.steps[0]!.line)}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium tracking-wide text-ink-soft">Play pace</p>
            <div
              className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1"
              role="radiogroup"
              aria-label="Play pace"
            >
              {PLAY_SPEEDS.map((speed) => {
                const active = settings.playSpeed === speed.id;
                return (
                  <button
                    key={speed.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
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
            <span className="text-xs tabular-nums text-muted">
              {PLAY_SPEEDS.find((s) => s.id === settings.playSpeed)?.hint}
            </span>
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 sm:px-6">
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
