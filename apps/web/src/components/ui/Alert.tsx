import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type AlertVariant = "neutral" | "info" | "success" | "warning" | "danger";
type AlertLive = "off" | "polite" | "assertive";

export type AlertProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> & {
  variant?: AlertVariant;
  title?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  dismissAction?: ReactNode;
  live?: AlertLive;
};

const variantClasses: Record<AlertVariant, string> = {
  neutral:
    "border-hp-border border-l-hp-border-strong bg-hp-surface-subtle",
  info: "border-hp-border border-l-hp-info bg-[var(--color-info-soft)]",
  success:
    "border-hp-border border-l-hp-success bg-[var(--color-success-soft)]",
  warning:
    "border-hp-border border-l-hp-warning bg-[var(--color-warning-soft)]",
  danger:
    "border-hp-border border-l-hp-danger bg-[var(--color-danger-soft)]",
};

const iconClasses: Record<AlertVariant, string> = {
  neutral: "text-hp-muted",
  info: "text-hp-info",
  success: "text-hp-success",
  warning: "text-hp-warning",
  danger: "text-hp-danger",
};

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    variant = "neutral",
    title,
    description,
    icon,
    action,
    dismissAction,
    live = "off",
    className,
    role: consumerRole,
    "aria-live": consumerAriaLive,
    ...props
  },
  ref,
) {
  const role =
    live === "polite"
      ? "status"
      : live === "assertive"
        ? "alert"
        : consumerRole;
  const ariaLive = live === "off" ? consumerAriaLive : live;
  const classes = [
    "flex w-full min-w-0 items-start gap-3 rounded-[var(--radius-lg)] border border-l-4 p-4 text-hp-foreground",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      {...props}
      role={role}
      aria-live={ariaLive}
      className={classes}
    >
      {icon && (
        <span
          className={`inline-flex shrink-0 items-center justify-center ${iconClasses[variant]}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      <div className="min-w-0 flex-1">
        {title && (
          <p className="font-semibold leading-[var(--line-height-compact)]">
            {title}
          </p>
        )}
        <div
          className={`${title ? "mt-1" : ""} text-sm leading-[var(--line-height-normal)]`}
        >
          {description}
        </div>

        {action && (
          <div className="mt-3 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
            {action}
          </div>
        )}
      </div>

      {dismissAction && (
        <div className="shrink-0 self-start">{dismissAction}</div>
      )}
    </div>
  );
});

Alert.displayName = "Alert";

export default Alert;
