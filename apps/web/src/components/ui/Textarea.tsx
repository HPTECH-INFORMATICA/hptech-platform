"use client";

import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

type TextareaResize = "none" | "vertical" | "horizontal" | "both";

export type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  resize?: TextareaResize;
  showCount?: boolean;
  className?: string;
  textareaClassName?: string;
};

const resizeClasses: Record<TextareaResize, string> = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

function getValueLength(
  value: TextareaHTMLAttributes<HTMLTextAreaElement>["value"],
): number {
  if (value === undefined || value === null) {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.join("").length;
  }

  return String(value).length;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      description,
      error,
      resize = "vertical",
      showCount = false,
      className,
      textareaClassName,
      id,
      value,
      defaultValue,
      maxLength,
      required,
      disabled,
      readOnly,
      onChange,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const descriptionId = description
      ? `${textareaId}-description`
      : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const counterIsVisible = showCount && maxLength !== undefined;
    const counterId = counterIsVisible ? `${textareaId}-counter` : undefined;
    const describedBy = [
      ariaDescribedBy,
      descriptionId,
      errorId,
      counterId,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
    const hasError = Boolean(error);
    const isControlled = value !== undefined;
    const [uncontrolledLength, setUncontrolledLength] = useState(() =>
      getValueLength(defaultValue),
    );
    const currentLength = isControlled
      ? getValueLength(value)
      : uncontrolledLength;

    function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
      if (!isControlled) {
        setUncontrolledLength(event.currentTarget.value.length);
      }

      onChange?.(event);
    }

    const textareaClasses = [
      "min-h-12 w-full rounded-[var(--radius-md)] border bg-hp-surface px-4 py-3 text-sm leading-[var(--line-height-normal)] text-hp-foreground outline-none transition-[background-color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] placeholder:text-hp-subtle hover:border-hp-primary focus-visible:border-hp-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus disabled:cursor-not-allowed disabled:opacity-[var(--state-disabled-opacity)] read-only:cursor-default read-only:bg-hp-surface-subtle",
      hasError
        ? "border-hp-danger focus-visible:border-hp-danger"
        : "border-hp-border-strong",
      resizeClasses[resize],
      textareaClassName,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={["w-full space-y-2", className].filter(Boolean).join(" ")}>
        <label
          htmlFor={textareaId}
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

        <textarea
          ref={ref}
          {...props}
          id={textareaId}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          onChange={handleChange}
          aria-describedby={describedBy}
          aria-invalid={hasError ? true : ariaInvalid}
          className={textareaClasses}
        />

        {description && (
          <p id={descriptionId} className="text-sm leading-[var(--line-height-compact)] text-hp-muted">
            {description}
          </p>
        )}

        {counterIsVisible && (
          <p id={counterId} className="text-right text-sm text-hp-muted">
            {currentLength} / {maxLength}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="text-sm text-hp-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
