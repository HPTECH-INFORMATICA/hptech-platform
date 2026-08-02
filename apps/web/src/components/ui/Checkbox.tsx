"use client";

import {
  forwardRef,
  useCallback,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  indeterminate?: boolean;
  className?: string;
  inputClassName?: string;
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    error,
    indeterminate = false,
    className,
    inputClassName,
    id,
    required,
    disabled,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-checked": ariaChecked,
    ...props
  },
  forwardedRef,
) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = description
    ? `${checkboxId}-description`
    : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;
  const hasError = Boolean(error);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) {
        node.indeterminate = indeterminate;
      }

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef, indeterminate],
  );

  const inputClasses = [
    "peer absolute inset-0 size-5 cursor-pointer opacity-0 disabled:cursor-not-allowed",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const indicatorClasses = [
    "pointer-events-none absolute inset-0 rounded-[var(--radius-sm)] border bg-hp-surface transition-[background-color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] group-hover:border-hp-primary peer-checked:border-hp-primary peer-checked:bg-hp-primary peer-indeterminate:border-hp-primary peer-indeterminate:bg-hp-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-hp-focus peer-disabled:opacity-[var(--state-disabled-opacity)]",
    hasError ? "border-hp-danger" : "border-hp-border-strong",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={["w-full space-y-2", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={checkboxId}
        className={`group flex min-h-11 items-start gap-3 text-hp-foreground ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="relative mt-1 size-5 shrink-0">
          <input
            ref={setInputRef}
            {...props}
            id={checkboxId}
            type="checkbox"
            required={required}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={hasError ? true : ariaInvalid}
            aria-checked={indeterminate ? "mixed" : ariaChecked}
            className={inputClasses}
          />

          <span className={indicatorClasses} aria-hidden="true" />
          <span
            className="pointer-events-none absolute inset-0 m-auto h-3 w-2 rotate-45 border-b-2 border-r-2 border-[var(--color-text-inverse)] opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute inset-0 m-auto h-1 w-3 rounded-[var(--radius-sm)] bg-[var(--color-text-inverse)] opacity-0 peer-indeterminate:opacity-100"
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

Checkbox.displayName = "Checkbox";

export default Checkbox;
