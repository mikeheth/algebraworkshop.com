import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { hasPlusPreview, unlockPlusPreview } from "@/lib/plus";

export function PlusPreview({
  title,
  lede,
  points,
  children,
}: {
  title: string;
  lede: string;
  points: string[];
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(hasPlusPreview());
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-dvh" />;
  if (open) return children;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/80">
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
            <Link to="/" className="hover:text-ink-soft">
              Algebra Workshop
            </Link>
            {" · Plus"}
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight">{title}</h1>
          <p className="mt-3 text-ink-soft">{lede}</p>
          <ul className="mt-6 space-y-2 text-sm text-ink">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                unlockPlusPreview();
                setOpen(true);
              }}
            >
              Preview this board
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Back to workshop</Link>
            </Button>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-muted">
            <Lock className="size-3.5" />
            Plus tools stay free to preview until billing opens.
          </p>
        </div>
      </header>
    </div>
  );
}
