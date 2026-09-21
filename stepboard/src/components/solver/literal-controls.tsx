import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { LitSettings, LitStepFilter } from "@/lib/literal/types";
import { cn } from "@/lib/utils";

export function LiteralControls({
  settings,
  onChange,
  onReset,
  onNew,
}: {
  settings: LitSettings;
  onChange: (patch: Partial<LitSettings>) => void;
  onReset: () => void;
  onNew: () => void;
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
        <div className="space-y-2">
          <Label>Steps</Label>
          <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
            {(
              [
                { value: 1, label: "One" },
                { value: 2, label: "Two" },
                { value: "mix", label: "Mix" },
              ] as { value: LitStepFilter; label: string }[]
            ).map((opt) => {
              const active = settings.stepFilter === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => onChange({ stepFilter: opt.value })}
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
        </div>

        <Separator />

        <ToggleRow
          label="Word problem"
          hint="A story that uses this formula. Isolate the letter, then plug in."
          checked={settings.wordProblem}
          onCheckedChange={(wordProblem) => onChange({ wordProblem })}
        />
        <ToggleRow
          label="Practice mode"
          hint="Choose the next inverse operation"
          checked={settings.mode === "practice"}
          onCheckedChange={(on) => onChange({ mode: on ? "practice" : "watch" })}
        />

        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={onNew}>
            New formula
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
          The teal letter is what you solve for. Orange letters are the other
          quantities in the formula. A new formula matches the current steps
          and switches.
        </p>
      </div>
    </aside>
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