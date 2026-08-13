import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import BaseCard from "../ui/BaseCard";
import ButtonLink from "../ui/ButtonLink";

export type ModuleStatus = "not-started" | "in-progress" | "completed";

type ModuleCardProps = {
  title: string;
  description: string;
  to: string;
  status?: ModuleStatus;
  estimatedMinutes: number;
  actionLabel?: string;
};

const statusStyles = {
  "not-started": {
    label: "Not started",
    badge: "border-border bg-surface-muted text-muted",
    dot: "bg-muted",
    card: "border-border",
    action: "Start module",
    actionVariant: "dark",
  },
  "in-progress": {
    label: "In progress",
    badge: "border-cyan bg-cyan text-cyan-dark",
    dot: "bg-cyan-dark",
    card: "border-cyan ring-1 ring-cyan/20",
    action: "Continue",
    actionVariant: "primary",
  },
  completed: {
    label: "Completed",
    badge: "border-success-foreground bg-success-background text-success-foreground",
    dot: "bg-success-foreground",
    card: "border-border",
    action: "Review",
    actionVariant: "secondary",
  },
} as const;

export default function ModuleCard({
  title,
  description,
  to,
  status = "not-started",
  estimatedMinutes,
  actionLabel,
}: ModuleCardProps) {
  const styles = statusStyles[status];

  return (
    <BaseCard
      as="article"
      padding="none"
      state="interactive"
      className={`flex min-h-72 flex-col overflow-hidden ${styles.card}`}
    >
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
        </div>

        <ButtonLink ariaLabel={`${actionLabel ?? styles.action}: ${title}`} className="mt-auto" fullWidth to={to} variant={styles.actionVariant}>
          {actionLabel ?? styles.action} <ChevronRight aria-hidden="true" className="size-4" />
        </ButtonLink>
      </div>
    </BaseCard>
  );
}
