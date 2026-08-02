import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

type SwitchLabelPosition = "start" | "end";

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  labelPosition?: SwitchLabelPosition;
  className?: string;
  inputClassName?: string;
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    label,
    description,
    error,
    labelPosition = "end",
    className,
    inputClassName,
    id,
    required,
    disabled,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const descriptionId = description ? `${switchId}-description` : undefined;
  const errorId = error ? `${switchId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;
  const hasError = Boolean(error);
  const textOrder = labelPosition === "start" ? "order-1" : "order-2";
  const controlOrder = labelPosition === "start" ? "order-2" : "order-1";

  const inputClasses = [
    "peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const trackClasses = [
    "pointer-events-none absolute inset-0 rounded-[var(--radius-full)] border bg-hp-surface-subtle transition-[background-color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] group-hover:border-hp-primary peer-checked:border-hp-primary peer-checked:bg-hp-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-hp-focus",
    hasError ? "border-hp-danger" : "border-hp-border-strong",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={["w-full space-y-2", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={switchId}
        className={`group flex min-h-11 items-start gap-3 text-hp-foreground ${
          disabled
            ? "cursor-not-allowed opacity-[var(--state-disabled-opacity)]"
            : "cursor-pointer"
        }`}
      >
        <span className={`${controlOrder} relative h-6 w-12 shrink-0`}>
          <input
            ref={ref}
            {...props}
            id={switchId}
            type="checkbox"
            required={required}
            disabled={disabled}
            aria-describedby={describedBy}
            className={inputClasses}
          />

          <span className={trackClasses} aria-hidden="true" />
          <span
            className="pointer-events-none absolute left-1 top-1 size-4 rounded-[var(--radius-full)] bg-hp-surface transition-transform duration-[var(--duration-fast)] ease-[var(--easing-standard)] peer-checked:translate-x-6 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>

        <span className={`${textOrder} min-w-0 flex-1`}>
          <span className="block text-sm font-medium leading-[var(--line-height-compact)]">
            {label}
            {required && (
              <>
                <span className="ml-1 text-hp-danger" aria-hidden="true">
                  *
                </span>
                <span className="sr-only"> (obrigatório)</span>
              </>
            )}
          </span>

          {description && (
            <span
              id={descriptionId}
              className="mt-1 block text-sm leading-[var(--line-height-normal)] text-hp-muted"
            >
              {description}
            </span>
          )}
        </span>
      </label>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-hp-danger">
          {error}
        </p>
      )}
    </div>
  );
});

Switch.displayName = "Switch";

export default Switch;
