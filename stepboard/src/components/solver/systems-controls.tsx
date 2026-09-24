import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { ElimStyle, SystemMethod, SystemSettings } from "@/lib/systems/types";
import { cn } from "@/lib/utils";

export function SystemsControls({
  method,
  settings,
  onChange,
  onReset,
  onNew,
}: {
  method: SystemMethod;
  settings: SystemSettings;
  onChange: (patch: Partial<SystemSettings>) => void;
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
        {method === "elimination" ? (
          <div className="space-y-2">
            <Label>How the column cancels</Label>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
              {(
                [
                  { value: "add", label: "Add" },
                  { value: "subtract", label: "Subtract" },
                  { value: "scale", label: "Multiply first" },
                  { value: "mix", label: "Mix" },
                ] as { value: ElimStyle; label: string }[]
              ).map((opt) => {
                const active = settings.elimStyle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ elimStyle: opt.value })}
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
        ) : null}

        {method === "elimination" ? <Separator /> : null}

        <ToggleRow
          label="Negatives"
          hint="Allow negative solutions and negative slopes"
          checked={settings.negatives}
          onCheckedChange={(negatives) => onChange({ negatives })}
        />
        <ToggleRow
          label="Practice mode"
          hint="Choose the next move before it appears"
          checked={settings.mode === "practice"}
          onCheckedChange={(on) => onChange({ mode: on ? "practice" : "watch" })}
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={onNew}>New system</Button>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw />
            Reset
          </Button>
        </div>
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
  onCheckedChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label>{label}</Label>
        <p className="mt-1 text-sm text-ink-soft">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
