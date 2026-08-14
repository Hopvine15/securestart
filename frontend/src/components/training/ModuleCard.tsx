import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import BaseCard from "../ui/BaseCard";
import ButtonLink from "../ui/ButtonLink";

export type ModuleStatus = "not-started" | "in-progress" | "retake-required" | "completed";

type ModuleCardProps = {
  title: string;
  description: string;
  to: string;
  status?: ModuleStatus;
  estimatedMinutes: number;
  progress?: number;
  bestScore?: number;
  actionLabel?: string;
};

const statusStyles = {
  "not-started": {
    label: "Not started",
    badge: "border-border bg-surface-muted text-muted",
    dot: "bg-muted",
    card: "border-border",
    progress: "bg-cyan",
    percentage: "text-cyan",
    action: "Start module",
    actionVariant: "dark",
  },
  "in-progress": {
    label: "In progress",
    badge: "border-cyan bg-cyan text-cyan-dark",
    dot: "bg-cyan-dark",
    card: "border-cyan ring-1 ring-cyan/20",
    progress: "bg-cyan",
    percentage: "text-cyan",
    action: "Continue",
    actionVariant: "primary",
  },
  "retake-required": {
    label: "Retake required",
    badge: "border-error bg-surface-muted text-error",
    dot: "bg-error",
    card: "border-error",
    progress: "bg-cyan",
    percentage: "text-error",
    action: "Retake module",
    actionVariant: "dark",
  },
  completed: {
    label: "Completed",
    badge: "border-success-foreground bg-success-background text-success-foreground",
    dot: "bg-success-foreground",
    card: "border-border",
    progress: "bg-success-foreground",
    percentage: "text-success-foreground",
    action: "Review",
    actionVariant: "secondary",
  },
} as const;

function normaliseProgress(progress: number) {
  return Math.min(100, Math.max(0, progress));
}

export default function ModuleCard({
  title,
  description,
  to,
  status = "not-started",
  estimatedMinutes,
  progress: suppliedProgress,
  bestScore,
  actionLabel,
}: ModuleCardProps) {
  const styles = statusStyles[status];
  const progress = normaliseProgress(suppliedProgress ?? (status === "completed" ? 100 : 0));
  const topStatusBar = status === "retake-required" ? "bg-error" : "bg-border";

  return (
    <BaseCard
      as="article"
      padding="none"
      state="interactive"
      className={`flex min-h-72 flex-col overflow-hidden ${styles.card}`}
    >
      <div className={`h-1.5 w-full ${topStatusBar}`} aria-hidden="true">
        <div className={`h-full ${styles.progress}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${styles.badge}`}>
            <span className={`size-2 rounded-full ${styles.dot}`} aria-hidden="true" />
            {styles.label}
          </span>
          <span className="shrink-0 text-xs text-muted">{estimatedMinutes} min</span>
        </div>

        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-ink">
            <Link className="no-underline hover:text-cyan-dark" to={to}>{title}</Link>
          </h3>
          <p className="mt-2 text-sm text-muted">{description}</p>
          {(status === "completed" || status === "retake-required") && bestScore !== undefined && (
            <p className={`mt-2 text-sm font-medium ${status === "completed" ? "text-success-foreground" : "text-error"}`}>
              Best score: {bestScore}%
            </p>
          )}
        </div>

        <div className="mt-auto pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink">Progress</span>
            <span className={`font-bold ${styles.percentage}`}>{progress}%</span>
          </div>
          <div
            aria-label={`${title} progress`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="mt-1 h-2 overflow-hidden rounded-full bg-border"
            role="progressbar"
          >
            <div className={`h-full rounded-full ${styles.progress}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <ButtonLink ariaLabel={`${actionLabel ?? styles.action}: ${title}`} fullWidth to={to} variant={styles.actionVariant}>
          {actionLabel ?? styles.action} <ChevronRight aria-hidden="true" className="size-4" />
        </ButtonLink>
      </div>
    </BaseCard>
  );
}
