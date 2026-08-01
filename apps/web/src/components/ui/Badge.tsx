import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type BadgeVariant =
  | "neutral"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger";

type BadgeSize = "sm" | "md";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-hp-surface-subtle text-hp-muted",
  primary: "bg-hp-primary-soft text-hp-primary",
  info: "bg-[var(--color-info-soft)] text-hp-info",
  success: "bg-[var(--color-success-soft)] text-hp-success",
  warning: "bg-[var(--color-warning-soft)] text-hp-warning",
  danger: "bg-[var(--color-danger-soft)] text-hp-danger",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-hp-muted",
  primary: "bg-hp-primary",
  info: "bg-hp-info",
  success: "bg-hp-success",
  warning: "bg-hp-warning",
  danger: "bg-hp-danger",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "gap-1 px-2 py-1 text-xs",
  md: "gap-2 px-3 py-1 text-sm",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    variant = "neutral",
    size = "md",
    dot = false,
    icon,
    className,
    children,
    ...props
  },
  ref,
) {
  const classes = [
    "inline-flex max-w-full items-center whitespace-nowrap rounded-[var(--radius-full)] font-medium leading-[var(--line-height-compact)]",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span ref={ref} className={classes} {...props}>
      {dot && (
        <span
          className={`size-1 shrink-0 rounded-[var(--radius-full)] ${dotClasses[variant]}`}
          aria-hidden="true"
        />
      )}

      {icon && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}

      {children}
    </span>
  );
});

Badge.displayName = "Badge";

export default Badge;
