import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  className?: string;
  inputClassName?: string;
};

const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  {
    label,
    description,
    error,
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
  const radioId = id ?? generatedId;
  const descriptionId = description ? `${radioId}-description` : undefined;
  const errorId = error ? `${radioId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;
  const hasError = Boolean(error);

  const inputClasses = [
    "peer absolute inset-0 size-5 cursor-pointer opacity-0 disabled:cursor-not-allowed",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const indicatorClasses = [
    "pointer-events-none absolute inset-0 rounded-[var(--radius-full)] border bg-hp-surface transition-[background-color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] group-hover:border-hp-primary peer-checked:border-hp-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-hp-focus peer-disabled:opacity-[var(--state-disabled-opacity)]",
    hasError ? "border-hp-danger" : "border-hp-border-strong",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={["w-full space-y-2", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={radioId}
        className={`group flex min-h-11 items-start gap-3 text-hp-foreground ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="relative mt-1 size-5 shrink-0">
          <input
            ref={ref}
            {...props}
            id={radioId}
            type="radio"
            required={required}
            disabled={disabled}
            aria-describedby={describedBy}
            className={inputClasses}
          />

          <span className={indicatorClasses} aria-hidden="true" />
          <span
            className="pointer-events-none absolute inset-0 m-auto size-2 rounded-[var(--radius-full)] bg-hp-primary opacity-0 peer-checked:opacity-100"
            aria-hidden="true"
          />
        </span>

        <span className="min-w-0 flex-1">
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

Radio.displayName = "Radio";

export default Radio;
