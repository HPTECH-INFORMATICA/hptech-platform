import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type IconButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

type IconButtonSize = "sm" | "md" | "lg";

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children" | "className"
> & {
  icon: ReactNode;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  className?: string;
};

const variantClasses: Record<IconButtonVariant, string> = {
  primary:
    "bg-hp-primary text-[var(--color-text-inverse)] hover:bg-hp-primary-hover active:bg-hp-primary-active",
  secondary:
    "bg-hp-secondary text-[var(--color-text-inverse)] hover:bg-hp-secondary-hover active:opacity-[var(--state-active-opacity)]",
  outline:
    "border border-hp-primary bg-transparent text-hp-primary hover:bg-hp-primary-soft active:text-hp-primary-active",
  ghost:
    "bg-transparent text-hp-foreground hover:bg-hp-surface-subtle active:bg-hp-primary-soft",
  danger:
    "bg-hp-danger text-[var(--color-text-inverse)] hover:opacity-[var(--state-hover-opacity)] active:opacity-[var(--state-active-opacity)]",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "size-11",
  md: "size-11",
  lg: "size-12",
};

const iconSizeClasses: Record<IconButtonSize, string> = {
  sm: "size-[var(--icon-size-sm)]",
  md: "size-[var(--icon-size-md)]",
  lg: "size-[var(--icon-size-lg)]",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      label,
      variant = "ghost",
      size = "md",
      loading = false,
      className,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    const classes = [
      "relative inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-[background-color,color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus disabled:cursor-not-allowed disabled:opacity-[var(--state-disabled-opacity)]",
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        {...props}
        type={type}
        disabled={disabled || loading}
        aria-label={label}
        aria-busy={loading || undefined}
        className={classes}
      >
        <span
          className={`inline-flex items-center justify-center ${iconSizeClasses[size]} ${
            loading ? "opacity-0" : ""
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>

        {loading && (
          <span
            className="absolute inset-0 inline-flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              className={`${iconSizeClasses[size]} motion-safe:animate-spin motion-safe:[animation-duration:var(--duration-slow)] motion-safe:[animation-timing-function:var(--easing-linear)] rounded-[var(--radius-full)] border-2 border-current border-r-transparent`}
            />
          </span>
        )}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export default IconButton;
