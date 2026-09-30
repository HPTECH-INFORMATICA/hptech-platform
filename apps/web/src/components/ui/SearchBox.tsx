import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

type SearchBoxBaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  searchIcon?: ReactNode;
  loading?: boolean;
  className?: string;
  inputClassName?: string;
};

type ClearableSearchBoxProps = {
  onClear: () => void;
  clearLabel: string;
};

type StaticSearchBoxProps = {
  onClear?: never;
  clearLabel?: never;
};

export type SearchBoxProps = SearchBoxBaseProps &
  (ClearableSearchBoxProps | StaticSearchBoxProps);

function hasContent(value: InputHTMLAttributes<HTMLInputElement>["value"]) {
  return value !== undefined && value !== null && String(value).length > 0;
}

const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  function SearchBox(
    {
      label,
      description,
      error,
      searchIcon,
      clearLabel,
      onClear,
      loading = false,
      className,
      inputClassName,
      id,
      value,
      disabled,
      readOnly,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      "aria-busy": ariaBusy,
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
    const showClear = Boolean(onClear) && hasContent(value) && !loading;

    const controlClasses = [
      "flex min-h-11 w-full items-center rounded-[var(--radius-md)] border bg-hp-surface text-hp-foreground transition-[background-color,border-color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] hover:border-hp-primary has-[:focus-visible]:border-hp-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hp-focus",
      hasError
        ? "border-hp-danger has-[:focus-visible]:border-hp-danger"
        : "border-hp-border-strong",
      disabled
        ? "cursor-not-allowed opacity-[var(--state-disabled-opacity)]"
        : "",
      readOnly ? "bg-hp-surface-subtle" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const inputClasses = [
      "min-h-11 min-w-0 flex-1 bg-transparent text-sm leading-[var(--line-height-normal)] text-hp-foreground outline-none placeholder:text-hp-subtle disabled:cursor-not-allowed read-only:cursor-default [&::-webkit-search-cancel-button]:appearance-none",
      searchIcon ? "px-2" : "px-4",
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
        </label>

        <div className={controlClasses}>
          {searchIcon && (
            <span
              className="pointer-events-none inline-flex shrink-0 items-center justify-center pl-4 text-hp-muted"
              aria-hidden="true"
            >
              <span className="inline-flex size-[var(--icon-size-md)] items-center justify-center">
                {searchIcon}
              </span>
            </span>
          )}

          <input
            ref={ref}
            {...props}
            id={inputId}
            type="search"
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            aria-describedby={describedBy}
            aria-invalid={hasError ? true : ariaInvalid}
            aria-busy={loading ? true : ariaBusy}
            className={inputClasses}
          />

          {loading && (
            <span
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <span className="size-[var(--icon-size-md)] motion-safe:animate-spin motion-safe:[animation-duration:var(--duration-slow)] motion-safe:[animation-timing-function:var(--easing-linear)] rounded-[var(--radius-full)] border-2 border-current border-r-transparent" />
            </span>
          )}

          {showClear && (
            <button
              type="button"
              disabled={disabled}
              aria-label={clearLabel}
              onClick={onClear}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-xl leading-[var(--line-height-compact)] text-hp-muted transition-[background-color,color,opacity] duration-[var(--duration-fast)] ease-[var(--easing-standard)] hover:bg-hp-surface-subtle hover:text-hp-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus disabled:cursor-not-allowed disabled:opacity-[var(--state-disabled-opacity)]"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        {description && (
          <p id={descriptionId} className="text-sm leading-[var(--line-height-compact)] text-hp-muted">
            {description}
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

SearchBox.displayName = "SearchBox";

export default SearchBox;
