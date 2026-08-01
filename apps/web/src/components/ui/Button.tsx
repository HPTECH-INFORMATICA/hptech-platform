import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "link";

type ButtonSize = "sm" | "md" | "lg" | "icon";

type CommonButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

type ContentButtonProps = CommonButtonProps & {
  size?: Exclude<ButtonSize, "icon">;
  children: ReactNode;
  "aria-label"?: string;
};

type IconButtonProps = CommonButtonProps & {
  size: "icon";
  children: ReactNode;
  "aria-label": string;
};

export type ButtonProps = ContentButtonProps | IconButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
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
  link: "bg-transparent text-hp-primary underline-offset-4 hover:text-hp-primary-hover hover:underline active:text-hp-primary-active",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm sm:min-h-9",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
  icon: "size-11 shrink-0 p-0",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    children,
    className,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  const classes = [
    "relative inline-flex items-center justify-center gap-[var(--icon-gap)] rounded-[var(--radius-md)] font-semibold leading-[var(--line-height-compact)] transition-[background-color,color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus disabled:cursor-not-allowed disabled:opacity-[var(--state-disabled-opacity)]",
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
      aria-busy={loading || undefined}
      className={classes}
    >
      <span
        className={`inline-flex items-center justify-center gap-[var(--icon-gap)] ${
          loading ? "opacity-0" : ""
        }`}
      >
        {leftIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </span>

      {loading && (
        <span
          className="absolute inset-0 inline-flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="size-[var(--icon-size-md)] motion-safe:animate-spin motion-safe:[animation-duration:var(--duration-slow)] motion-safe:[animation-timing-function:var(--easing-linear)] rounded-full border-2 border-current border-r-transparent" />
        </span>
      )}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
