import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "prefix"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  inputClassName?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    description,
    error,
    prefix,
    suffix,
    className,
    inputClassName,
    id,
    required,
    disabled,
    readOnly,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;
  const hasError = Boolean(error);

  const controlClasses = [
    "flex min-h-11 w-full items-center rounded-[var(--radius-md)] border bg-hp-surface text-hp-foreground transition-[background-color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] hover:border-hp-primary has-[:focus-visible]:border-hp-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hp-focus",
    hasError
      ? "border-hp-danger has-[:focus-visible]:border-hp-danger"
      : "border-hp-border-strong",
    disabled ? "cursor-not-allowed opacity-[var(--state-disabled-opacity)]" : "",
    readOnly ? "bg-hp-surface-subtle" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inputClasses = [
    "min-h-11 min-w-0 flex-1 bg-transparent px-4 text-sm leading-[var(--line-height-normal)] text-hp-foreground outline-none placeholder:text-hp-subtle disabled:cursor-not-allowed read-only:cursor-default",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={["w-full space-y-2", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium leading-[var(--line-height-compact)] text-hp-foreground"
      >
        {label}
        {required && (
          <>
            <span className="ml-1 text-hp-danger" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </label>

      {description && (
        <p id={descriptionId} className="text-sm text-hp-muted">
          {description}
        </p>
      )}

      <div className={controlClasses}>
        {prefix && (
          <span
            className="pointer-events-none inline-flex shrink-0 select-none pl-4 text-hp-muted"
            aria-hidden="true"
          >
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          {...props}
          id={inputId}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-describedby={describedBy}
          aria-invalid={hasError ? true : ariaInvalid}
          className={inputClasses}
        />

        {suffix && (
          <span
            className="pointer-events-none inline-flex shrink-0 select-none pr-4 text-hp-muted"
            aria-hidden="true"
          >
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-hp-danger">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
