import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type CardVariant = "default" | "subtle" | "elevated" | "outlined";
type CardPadding = "none" | "sm" | "md" | "lg";
type CardStatus = "neutral" | "info" | "success" | "warning" | "danger";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  selected?: boolean;
  status?: CardStatus;
  statusLabel?: string;
  children: ReactNode;
};

const variantClasses: Record<CardVariant, string> = {
  default:
    "border-hp-border bg-hp-surface shadow-[var(--shadow-xs)]",
  subtle: "border-hp-border bg-hp-surface-subtle",
  elevated:
    "border-hp-border bg-hp-surface-elevated shadow-[var(--shadow-sm)]",
  outlined: "border-hp-border-strong bg-transparent",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const statusClasses: Record<CardStatus, string> = {
  neutral: "border-l-hp-border-strong",
  info: "border-l-hp-info",
  success: "border-l-hp-success",
  warning: "border-l-hp-warning",
  danger: "border-l-hp-danger",
};

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "default",
    padding = "md",
    interactive = false,
    selected = false,
    status,
    statusLabel,
    className,
    children,
    "aria-disabled": ariaDisabled,
    ...props
  },
  ref,
) {
  const isAriaDisabled = ariaDisabled === true || ariaDisabled === "true";
  const classes = [
    "flex h-full min-w-0 flex-col rounded-[var(--radius-lg)] border text-hp-foreground",
    variantClasses[variant],
    paddingClasses[padding],
    status ? `border-l-4 ${statusClasses[status]}` : "",
    interactive
      ? "transition-[border-color,background-color,box-shadow,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus"
      : "",
    interactive && !isAriaDisabled
      ? "hover:border-hp-primary hover:shadow-[var(--shadow-sm)]"
      : "",
    selected ? "border-hp-primary bg-hp-primary-soft" : "",
    isAriaDisabled
      ? "cursor-not-allowed opacity-[var(--state-disabled-opacity)]"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      {...props}
      aria-disabled={ariaDisabled}
      className={classes}
    >
      {status && statusLabel && <span className="sr-only">{statusLabel}</span>}
      {children}
    </div>
  );
});

Card.displayName = "Card";

export default Card;
