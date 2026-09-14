import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DIFFICULTY_PRESETS,
  VARIABLE_LETTERS,
  type Difficulty,
  type Settings,
  type StepCount,
} from "@/lib/algebra/types";
import { cn } from "@/lib/utils";

export function ControlsPanel({
  settings,
  onChange,
  onReset,
  onNew,
  noun = "equation",
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
  onNew: () => void;
  noun?: "equation" | "inequality";
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left lg:pointer-events-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-accent" />
          <span className="font-display text-lg tracking-tight">Problem setup</span>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted transition-transform duration-200 lg:hidden",
            open && "rotate-180",
          )}
        />
      </button>

      <div className={cn("mt-5 space-y-6", !open && "hidden lg:block")}>
        <Field label="Steps">
          <Segmented
            value={String(settings.stepCount)}
            options={[
              { value: "1", label: "One" },
              { value: "2", label: "Two" },
              { value: "3", label: "Three" },
            ]}
            onChange={(v) => onChange({ stepCount: Number(v) as StepCount })}
          />
        </Field>

        <Field label="Difficulty">
          <Segmented
            value={settings.difficulty}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Core" },
              { value: "hard", label: "Stretch" },
              { value: "custom", label: "Custom" },
            ]}
            onChange={(v) => applyDifficulty(v as Difficulty, onChange)}
          />
        </Field>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label>Coefficients</Label>
            <span className="font-display text-sm tabular-nums text-coef">
              {settings.coefMin}–{settings.coefMax}
            </span>
          </div>
          <Slider
            min={1}
            max={15}
            step={1}
            value={[settings.coefMin, settings.coefMax]}
            onValueChange={([lo, hi]) =>
              onChange({
                coefMin: lo ?? 1,
                coefMax: hi ?? 5,
                difficulty: "custom",
              })
            }
          />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label>Constants</Label>
            <span className="font-display text-sm tabular-nums text-const">
              {settings.constMin}–{settings.constMax}
            </span>
          </div>
          <Slider
            min={0}
            max={40}
            step={1}
            value={[settings.constMin, settings.constMax]}
            onValueChange={([lo, hi]) =>
              onChange({
                constMin: lo ?? 0,
                constMax: hi ?? 12,
                difficulty: "custom",
              })
            }
          />
        </div>

        <Field label="Variable">
          <div className="flex flex-wrap gap-1.5">
            {VARIABLE_LETTERS.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => onChange({ variable: letter })}
                className={cn(
                  "size-11 rounded-md font-display text-xl italic transition-colors duration-150",
                  settings.variable === letter
                    ? "bg-accent-soft text-var"
                    : "bg-surface-2 text-ink-soft hover:text-ink",
                )}
              >
                {letter}
              </button>
            ))}
          </div>
        </Field>

        <Separator />

        <ToggleRow
          label="Allow negatives"
          hint="Coefficients and constants may flip sign"
          checked={settings.negatives}
          onCheckedChange={(negatives) =>
            onChange({ negatives, difficulty: "custom" })
          }
        />
        <ToggleRow
          label="Word problem"
          hint="A story you can translate into this equation"
          checked={settings.wordProblem}
          onCheckedChange={(wordProblem) => onChange({ wordProblem })}
        />
        <ToggleRow
          label="Practice mode"
          hint="Choose the next inverse operation"
          checked={settings.mode === "practice"}
          onCheckedChange={(on) =>
            onChange({ mode: on ? "practice" : "watch" })
          }
        />
        {settings.stepCount === 3 ? (
          <>
            <ToggleRow
              label="Variables on both sides"
              hint="Collect like terms across the equals sign"
              checked={settings.bothSides}
              onCheckedChange={(bothSides) =>
                onChange({ bothSides, difficulty: "custom" })
              }
            />
            <ToggleRow
              label="Distributive property"
              hint="Expand a(x + b) first"
              checked={settings.distribute}
              onCheckedChange={(distribute) =>
                onChange({ distribute, difficulty: "custom" })
              }
            />
          </>
        ) : null}

        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={onNew}>
            New {noun}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onReset}
            aria-label="Reset settings"
          >
            <RotateCcw />
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-muted">
          Integer solutions only. Ranges steer generation; a new {noun} always
          matches the current step count.
        </p>
      </div>
    </aside>
  );
}

function applyDifficulty(
  difficulty: Difficulty,
  onChange: (patch: Partial<Settings>) => void,
) {
  if (difficulty === "custom") {
    onChange({ difficulty });
    return;
  }
  onChange({ difficulty, ...DIFFICULTY_PRESETS[difficulty] });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-1 rounded-md bg-surface-2 p-1",
        options.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-10 rounded-sm text-sm font-medium transition-colors duration-150",
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
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-xs text-muted">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
