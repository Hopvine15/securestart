import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

type ButtonLinkProps = PropsWithChildren<{
  to: string;
  variant?: "primary" | "secondary" | "dark";
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
}>;

const variants = {
  primary: "bg-cyan text-navy hover:bg-cyan-dark hover:text-white hover:shadow-md",
  secondary: "border border-border bg-surface text-navy hover:border-cyan hover:text-cyan-dark hover:shadow-sm",
  dark: "bg-navy text-white hover:bg-cyan hover:text-navy hover:shadow-md",
};

export default function ButtonLink({
  to,
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ariaLabel,
}: ButtonLinkProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={`${fullWidth ? "flex w-full" : "inline-flex"} items-center justify-center gap-2 rounded-control px-6 py-3 text-base font-semibold no-underline transition-all transition-600 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 ${variants[variant]} ${className}`}
      to={to}
    >
      {children}
    </Link>
  );
}
