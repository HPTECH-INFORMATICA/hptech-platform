import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type ToastVariant = "neutral" | "info" | "success" | "warning" | "danger";
type ToastLive = "polite" | "assertive";

export type ToastProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "title" | "role" | "aria-live" | "aria-atomic"
> & {
  variant?: ToastVariant;
  title?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  dismissAction?: ReactNode;
  dismissible?: boolean;
  live?: ToastLive;
};

const variantClasses: Record<ToastVariant, string> = {
  neutral: "border-l-hp-border-strong",
  info: "border-l-hp-info",
  success: "border-l-hp-success",
  warning: "border-l-hp-warning",
  danger: "border-l-hp-danger",
};

const iconClasses: Record<ToastVariant, string> = {
  neutral: "text-hp-muted",
  info: "text-hp-info",
  success: "text-hp-success",
  warning: "text-hp-warning",
  danger: "text-hp-danger",
};

const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  {
    variant = "neutral",
    title,
    description,
    icon,
    action,
    dismissAction,
    dismissible = true,
    live,
    className,
    ...props
  },
  ref,
) {
  const resolvedLive = live ?? (variant === "danger" ? "assertive" : "polite");
  const role = resolvedLive === "assertive" ? "alert" : "status";
  const classes = [
    "flex w-full min-w-0 max-w-full items-start gap-3 rounded-[var(--radius-lg)] border border-hp-border-strong border-l-4 bg-hp-surface-elevated p-4 text-hp-foreground shadow-[var(--shadow-md)]",
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
      aria-live={resolvedLive}
      aria-atomic="true"
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

      {dismissible && dismissAction && (
        <div className="shrink-0 self-start">{dismissAction}</div>
      )}
    </div>
  );
});

Toast.displayName = "Toast";

export default Toast;
