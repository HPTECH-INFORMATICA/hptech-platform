"use client";

import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export type ToggleVariant = "default" | "outline";
export type ToggleSize = "sm" | "md" | "lg";

export type ToggleProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  children: ReactNode;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: ToggleVariant;
  size?: ToggleSize;
};

const variantClasses: Record<ToggleVariant, string> = {
  default:
    "border border-transparent bg-transparent hover:bg-[var(--toggle-hover-background)]",
  outline:
    "border border-[var(--toggle-border)] bg-[var(--toggle-background)] hover:bg-[var(--toggle-hover-background)]",
};

const sizeClasses: Record<ToggleSize, string> = {
  sm: "min-h-[var(--layout-touch-target)] px-[var(--space-2)] py-[var(--space-1)] text-xs",
  md: "min-h-[var(--layout-touch-target)] px-[var(--space-3)] py-[var(--space-2)] text-sm",
  lg: "min-h-[var(--layout-touch-target)] px-[var(--space-4)] py-[var(--space-3)] text-base",
};

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  function Toggle(
    {
      children,
      pressed,
      defaultPressed = false,
      onPressedChange,
      variant = "default",
      size = "md",
      disabled = false,
      type = "button",
      className,
      onClick,
      ...props
    },
    forwardedRef,
  ) {
    const [isControlled] = useState(() => pressed !== undefined);
    const [uncontrolledPressed, setUncontrolledPressed] =
      useState(defaultPressed);

    const resolvedPressed = isControlled
      ? Boolean(pressed)
      : uncontrolledPressed;

    const requestPressedChange = (nextPressed: boolean) => {
      if (disabled || nextPressed === resolvedPressed) return;

      if (!isControlled) {
        setUncontrolledPressed(nextPressed);
      }

      onPressedChange?.(nextPressed);
    };

    return (
      <button
        ref={forwardedRef}
        {...props}
        type={type}
        disabled={disabled}
        aria-pressed={resolvedPressed}
        data-state={resolvedPressed ? "on" : "off"}
        data-disabled={disabled ? "" : undefined}
        data-variant={variant}
        data-size={size}
        className={[
          "inline-flex items-center justify-center gap-[var(--space-2)] rounded-[var(--toggle-radius)] font-medium text-[var(--toggle-foreground)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=on]:bg-[var(--toggle-active-background)] data-[state=on]:text-[var(--toggle-active-foreground)]",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => {
          onClick?.(event);

          if (event.defaultPrevented || disabled) return;

          requestPressedChange(!resolvedPressed);
        }}
      >
        {children}
      </button>
    );
  },
);

Toggle.displayName = "Toggle";

export default Toggle;