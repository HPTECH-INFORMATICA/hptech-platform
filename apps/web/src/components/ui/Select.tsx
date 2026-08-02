import {
  forwardRef,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  options: readonly SelectOption[];
  className?: string;
  selectClassName?: string;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    description,
    error,
    placeholder,
    options,
    className,
    selectClassName,
    id,
    required,
    disabled,
    multiple,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = description ? `${selectId}-description` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;
  const hasError = Boolean(error);
  const hasEmptyOption = options.some((option) => option.value === "");
  const showPlaceholder = Boolean(placeholder) && !multiple && !hasEmptyOption;

  const selectClasses = [
    "w-full appearance-auto rounded-[var(--radius-md)] border bg-hp-surface text-sm leading-[var(--line-height-normal)] text-hp-foreground outline-none transition-[background-color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] hover:border-hp-primary focus-visible:border-hp-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus disabled:cursor-not-allowed disabled:opacity-[var(--state-disabled-opacity)]",
    multiple ? "px-4 py-3" : "min-h-11 pl-4 pr-10",
    hasError
      ? "border-hp-danger focus-visible:border-hp-danger"
      : "border-hp-border-strong",
    selectClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={["w-full space-y-2", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={selectId}
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

      <select
        ref={ref}
        {...props}
        id={selectId}
        required={required}
        disabled={disabled}
        multiple={multiple}
        aria-describedby={describedBy}
        aria-invalid={hasError ? true : ariaInvalid}
        className={selectClasses}
      >
        {showPlaceholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-hp-danger">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = "Select";

export default Select;
