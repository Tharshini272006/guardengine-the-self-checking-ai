import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuardBadgeProps {
  faithfulness?: number | null;
  relevancy?: number | null;
  precision?: number | null;
  retryCount?: number;
  status?: string | null;
  className?: string;
}

export function GuardBadge({
  faithfulness,
  relevancy,
  precision,
  retryCount = 0,
  status,
  className,
}: GuardBadgeProps) {
  const isPending = status === "pending" || status === "processing";
  const isFailed = status === "failed";

  const f = faithfulness ?? 0;
  const r = relevancy ?? 0;
  const allGreen = f >= 0.7 && r >= 0.7 && retryCount === 0;

  let tone: "success" | "warning" | "destructive" | "muted" = "muted";
  let Icon = CheckCircle2;
  let label = "Verified";

  if (isPending) {
    tone = "muted";
    Icon = Loader2;
    label = "Verifying";
  } else if (isFailed) {
    tone = "destructive";
    Icon = XCircle;
    label = "Failed";
  } else if (allGreen) {
    tone = "success";
    Icon = CheckCircle2;
    label = "Verified";
  } else if (retryCount > 0) {
    tone = "warning";
    Icon = AlertTriangle;
    label = "Retried";
  } else {
    tone = "success";
    Icon = CheckCircle2;
  }

  const toneClasses: Record<typeof tone, string> = {
    success:
      "border-success/40 bg-success/10 text-success",
    warning:
      "border-warning/40 bg-warning/10 text-warning",
    destructive:
      "border-destructive/40 bg-destructive/10 text-destructive",
    muted:
      "border-border bg-muted/40 text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
      <span>{label}</span>
      {!isPending && !isFailed && (
        <span className="text-foreground/80 font-mono">
          F:{f.toFixed(2)} · R:{(relevancy ?? 0).toFixed(2)}
          {precision != null ? ` · P:${precision.toFixed(2)}` : ""}
        </span>
      )}
      {retryCount > 0 && !isFailed && (
        <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px]">
          {retryCount} retry
        </span>
      )}
    </div>
  );
}
