import type { PropsWithChildren } from "react";

type BaseCardProps = PropsWithChildren<{
  as?: "article" | "aside" | "section" | "div";
  state?: "default" | "interactive" | "selected" | "disabled";
  padding?: "none" | "sm" | "md" | "lg";
  borderVisible?: boolean;
  elevation?: "none" | "sm" | "md";
  className?: string;
}>;

const paddingClasses = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8 md:p-12",
};

const stateClasses = {
  default: "",
  interactive: "transition hover:-translate-y-0.5 hover:border-cyan hover:shadow-md",
  selected: "border-cyan ring-1 ring-cyan",
  disabled: "cursor-not-allowed opacity-50",
};

const elevationClasses = {
  none: "shadow-none",
  sm: "shadow-card",
  md: "shadow-md",
};

export default function BaseCard({
  as: Component = "div",
  children,
  state = "default",
  padding = "md",
  borderVisible = true,
  elevation = "sm",
  className = "",
}: BaseCardProps) {
  return (
    <Component
      className={`rounded-2xl bg-surface ${borderVisible ? "border border-border" : ""} ${paddingClasses[padding]} ${stateClasses[state]} ${elevationClasses[elevation]} ${className}`}
    >
      {children}
    </Component>
  );
}
