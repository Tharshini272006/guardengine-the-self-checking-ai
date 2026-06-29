import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = ["Validate", "Retrieve", "Generate", "Judge", "Route"] as const;

interface PipelineAnimationProps {
  running?: boolean;
  className?: string;
}

export function PipelineAnimation({ running = true, className }: PipelineAnimationProps) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setActive((v) => (v + 1) % STEPS.length), 600);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all",
              i === active && running
                ? "border-primary/50 bg-primary/15 text-primary ring-glow"
                : i < active && running
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-muted/30 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i === active && running
                  ? "bg-primary animate-pulse"
                  : i < active && running
                    ? "bg-success"
                    : "bg-muted-foreground/40",
              )}
            />
            {s}
          </span>
          {i < STEPS.length - 1 && (
            <span
              className={cn(
                "h-px w-4 transition-colors",
                i < active && running ? "bg-success/50" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
