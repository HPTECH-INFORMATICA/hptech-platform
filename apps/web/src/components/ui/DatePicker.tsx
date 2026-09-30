"use client";

import {
  forwardRef,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import Calendar, {
  type CalendarDate,
  type CalendarMonth,
  type CalendarRange,
  type CalendarWeekStartsOn,
} from "@/components/ui/Calendar";
import Input from "@/components/ui/Input";
import Popover, {
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";

export type DatePickerInvalidReason =
  | "invalid-format"
  | "invalid-date"
  | "out-of-range"
  | "disabled-date"
  | "invalid-range";

export type DatePickerInputFormat = "DD/MM/YYYY" | "MM/DD/YYYY";

type DatePickerBaseProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  locale?: string;
  inputFormat?: DatePickerInputFormat;
  weekStartsOn?: CalendarWeekStartsOn;
  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  isDateDisabled?: (date: CalendarDate) => boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onInvalidValue?: (text: string, reason: DatePickerInvalidReason) => void;
  inputClassName?: string;
  popoverClassName?: string;
};

export type DatePickerSingleProps = DatePickerBaseProps & {
  mode: "single";
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onValueChange?: (value: CalendarDate | null) => void;
};

export type DatePickerRangeProps = DatePickerBaseProps & {
  mode: "range";
  value?: CalendarRange | null;
  defaultValue?: CalendarRange | null;
  onValueChange?: (value: CalendarRange | null) => void;
};

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

type CivilParts = { year: number; month: number; day: number };
type ParseResult =
  | { date: CalendarDate }
  | { reason: "invalid-format" | "invalid-date" };
type FieldName = "single" | "from" | "to";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0, 12).getDate();
}

function parseCivilDate(value: CalendarDate): CivilParts | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

function formatCivilDate(parts: CivilParts): CalendarDate {
  return `${String(parts.year).padStart(4, "0")}-${pad(parts.month)}-${pad(parts.day)}`;
}

function formatDraft(value: CalendarDate | null | undefined, format: DatePickerInputFormat): string {
  if (!value) return "";
  const parts = parseCivilDate(value);
  if (!parts) return "";
  return format === "DD/MM/YYYY"
    ? `${pad(parts.day)}/${pad(parts.month)}/${String(parts.year).padStart(4, "0")}`
    : `${pad(parts.month)}/${pad(parts.day)}/${String(parts.year).padStart(4, "0")}`;
}

function parseDraft(text: string, format: DatePickerInputFormat): ParseResult {
  const trimmed = text.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return { reason: "invalid-format" };
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  const day = format === "DD/MM/YYYY" ? first : second;
  const month = format === "DD/MM/YYYY" ? second : first;
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { reason: "invalid-date" };
  }
  return { date: formatCivilDate({ year, month, day }) };
}

function compareDates(left: CalendarDate, right: CalendarDate): number {
  return left.localeCompare(right);
}

function addDay(value: CalendarDate): CalendarDate {
  const parts = parseCivilDate(value) ?? { year: 2000, month: 1, day: 1 };
  const date = new Date(parts.year, parts.month - 1, parts.day + 1, 12);
  return formatCivilDate({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

function getMonth(value: CalendarDate): CalendarMonth {
  return value.slice(0, 7);
}

function currentMonth(): CalendarMonth {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, "0")}-${pad(now.getMonth() + 1)}`;
}

function technicalMessage(reason: DatePickerInvalidReason): string {
  switch (reason) {
    case "invalid-format": return "Use o formato de data indicado.";
    case "invalid-date": return "Informe uma data existente.";
    case "out-of-range": return "A data está fora do período permitido.";
    case "disabled-date": return "A data informada está indisponível.";
    case "invalid-range": return "Informe um período válido.";
  }
}

function DatePickerInner(
  props: DatePickerProps,
  ref: React.ForwardedRef<HTMLDivElement>,
): ReactElement {
  const {
    mode,
    value,
    defaultValue,
    label,
    description,
    error,
    id,
    name,
    required = false,
    disabled = false,
    readOnly = false,
    placeholder,
    ariaLabel = "Calendário de datas",
    locale = "pt-BR",
    inputFormat = "DD/MM/YYYY",
    weekStartsOn = 0,
    minDate,
    maxDate,
    isDateDisabled,
    open,
    defaultOpen = false,
    onOpenChange,
    onValueChange,
    onInvalidValue,
    className,
    inputClassName,
    popoverClassName,
    ...rootProps
  } = props;

  const generatedId = useId();
  const baseId = id ?? generatedId;
  const rangeDescriptionId = description ? `${baseId}-description` : undefined;
  const [valueControlled] = useState(value !== undefined);
  const [openControlled] = useState(open !== undefined);
  const [internalSingle, setInternalSingle] = useState<CalendarDate | null>(
    mode === "single" ? defaultValue ?? null : null,
  );
  const [internalRange, setInternalRange] = useState<CalendarRange | null>(
    mode === "range" ? defaultValue ?? null : null,
  );
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const resolvedSingle = mode === "single"
    ? valueControlled ? value ?? null : internalSingle
    : null;
  const resolvedRange = mode === "range"
    ? valueControlled ? value ?? null : internalRange
    : null;
  const resolvedOpen = openControlled ? open ?? false : internalOpen;
  const [singleDraft, setSingleDraft] = useState(() =>
    formatDraft(mode === "single" ? value ?? defaultValue : null, inputFormat),
  );
  const [fromDraft, setFromDraft] = useState(() =>
    formatDraft(mode === "range" ? (value ?? defaultValue)?.from : null, inputFormat),
  );
  const [toDraft, setToDraft] = useState(() =>
    formatDraft(mode === "range" ? (value ?? defaultValue)?.to : null, inputFormat),
  );
  const [invalidField, setInvalidField] = useState<FieldName | null>(null);
  const [invalidReason, setInvalidReason] = useState<DatePickerInvalidReason | null>(null);
  const initialVisibleDate = mode === "single"
    ? value ?? defaultValue ?? undefined
    : (value ?? defaultValue)?.from;
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() =>
    initialVisibleDate ? getMonth(initialVisibleDate) : currentMonth(),
  );
  const calendarInitialFocusRef = useRef<HTMLElement | null>(null);
  const valueSignature = mode === "single"
    ? `single:${resolvedSingle ?? ""}:${inputFormat}`
    : `range:${resolvedRange?.from ?? ""}:${resolvedRange?.to ?? ""}:${inputFormat}`;
  const [syncedValueSignature, setSyncedValueSignature] = useState(valueSignature);

  if (syncedValueSignature !== valueSignature) {
    setSyncedValueSignature(valueSignature);
    if (mode === "single") {
      setSingleDraft(formatDraft(resolvedSingle, inputFormat));
      if (resolvedSingle) setVisibleMonth(getMonth(resolvedSingle));
    } else {
      setFromDraft(formatDraft(resolvedRange?.from, inputFormat));
      setToDraft(formatDraft(resolvedRange?.to, inputFormat));
      if (resolvedRange?.from) setVisibleMonth(getMonth(resolvedRange.from));
    }
    setInvalidField(null);
    setInvalidReason(null);
  }

  function requestOpen(nextOpen: boolean): void {
    if ((disabled || readOnly) && nextOpen) return;
    if (!openControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function reportInvalid(field: FieldName, text: string, reason: DatePickerInvalidReason): void {
    setInvalidField(field);
    setInvalidReason(reason);
    onInvalidValue?.(text, reason);
  }

  function validateDate(date: CalendarDate): DatePickerInvalidReason | null {
    if (minDate && compareDates(date, minDate) < 0) return "out-of-range";
    if (maxDate && compareDates(date, maxDate) > 0) return "out-of-range";
    if (isDateDisabled?.(date)) return "disabled-date";
    return null;
  }

  function rangeHasDisabled(from: CalendarDate, to: CalendarDate): boolean {
    for (let cursor = from; compareDates(cursor, to) <= 0; cursor = addDay(cursor)) {
      if (validateDate(cursor)) return true;
    }
    return false;
  }

  function publishSingle(nextValue: CalendarDate | null): void {
    if (!valueControlled) setInternalSingle(nextValue);
    if (props.mode === "single") {
      (onValueChange as DatePickerSingleProps["onValueChange"])?.(nextValue);
    }
  }

  function publishRange(nextValue: CalendarRange | null): void {
    if (!valueControlled) setInternalRange(nextValue);
    if (props.mode === "range") {
      (onValueChange as DatePickerRangeProps["onValueChange"])?.(nextValue);
    }
  }

  function commitSingle(): void {
    if (disabled || readOnly) return;
    if (!singleDraft.trim()) {
      if (required) {
        setInvalidField("single");
        setInvalidReason("invalid-format");
        return;
      }
      setInvalidField(null);
      setInvalidReason(null);
      publishSingle(null);
      return;
    }
    const parsed = parseDraft(singleDraft, inputFormat);
    if ("reason" in parsed) {
      reportInvalid("single", singleDraft, parsed.reason);
      return;
    }
    const validation = validateDate(parsed.date);
    if (validation) {
      reportInvalid("single", singleDraft, validation);
      return;
    }
    setInvalidField(null);
    setInvalidReason(null);
    setVisibleMonth(getMonth(parsed.date));
    publishSingle(parsed.date);
    setSingleDraft(formatDraft(parsed.date, inputFormat));
  }

  function commitRange(field: "from" | "to"): void {
    if (disabled || readOnly) return;
    const fromText = fromDraft.trim();
    const toText = toDraft.trim();
    if (!fromText && !toText) {
      if (required) {
        setInvalidField(field);
        setInvalidReason("invalid-format");
        return;
      }
      setInvalidField(null);
      setInvalidReason(null);
      publishRange(null);
      return;
    }
    if (!fromText) {
      reportInvalid("from", fromDraft, "invalid-range");
      return;
    }
    const parsedFrom = parseDraft(fromText, inputFormat);
    if ("reason" in parsedFrom) {
      reportInvalid("from", fromDraft, parsedFrom.reason);
      return;
    }
    const fromValidation = validateDate(parsedFrom.date);
    if (fromValidation) {
      reportInvalid("from", fromDraft, fromValidation);
      return;
    }
    if (!toText) {
      if (required) {
        setInvalidField("to");
        setInvalidReason("invalid-format");
        return;
      }
      setInvalidField(null);
      setInvalidReason(null);
      setVisibleMonth(getMonth(parsedFrom.date));
      publishRange({ from: parsedFrom.date });
      setFromDraft(formatDraft(parsedFrom.date, inputFormat));
      return;
    }
    const parsedTo = parseDraft(toText, inputFormat);
    if ("reason" in parsedTo) {
      reportInvalid("to", toDraft, parsedTo.reason);
      return;
    }
    const toValidation = validateDate(parsedTo.date);
    if (toValidation) {
      reportInvalid("to", toDraft, toValidation);
      return;
    }
    if (
      compareDates(parsedTo.date, parsedFrom.date) < 0 ||
      rangeHasDisabled(parsedFrom.date, parsedTo.date)
    ) {
      reportInvalid(field, field === "from" ? fromDraft : toDraft, "invalid-range");
      return;
    }
    const nextRange = { from: parsedFrom.date, to: parsedTo.date };
    setInvalidField(null);
    setInvalidReason(null);
    setVisibleMonth(getMonth(parsedFrom.date));
    publishRange(nextRange);
    setFromDraft(formatDraft(nextRange.from, inputFormat));
    setToDraft(formatDraft(nextRange.to, inputFormat));
  }

  function restoreDrafts(): void {
    if (mode === "single") setSingleDraft(formatDraft(resolvedSingle, inputFormat));
    else {
      setFromDraft(formatDraft(resolvedRange?.from, inputFormat));
      setToDraft(formatDraft(resolvedRange?.to, inputFormat));
    }
    setInvalidField(null);
    setInvalidReason(null);
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    field: FieldName,
  ): void {
    if (event.key === "Enter") {
      event.preventDefault();
      if (mode === "single") commitSingle();
      else commitRange(field === "to" ? "to" : "from");
    } else if (event.key === "Escape") {
      event.preventDefault();
      restoreDrafts();
      requestOpen(false);
    }
  }

  function handleSingleCalendar(nextValue: CalendarDate | null): void {
    if (!nextValue || disabled || readOnly) return;
    setInvalidField(null);
    setInvalidReason(null);
    setVisibleMonth(getMonth(nextValue));
    if (!valueControlled) {
      setInternalSingle(nextValue);
      setSingleDraft(formatDraft(nextValue, inputFormat));
    }
    if (props.mode === "single") {
      (onValueChange as DatePickerSingleProps["onValueChange"])?.(nextValue);
    }
    requestOpen(false);
  }

  function handleRangeCalendar(nextValue: CalendarRange | null): void {
    if (!nextValue || disabled || readOnly) return;
    setInvalidField(null);
    setInvalidReason(null);
    setVisibleMonth(getMonth(nextValue.from));
    if (!valueControlled) {
      setInternalRange(nextValue);
      setFromDraft(formatDraft(nextValue.from, inputFormat));
      setToDraft(formatDraft(nextValue.to, inputFormat));
    }
    if (props.mode === "range") {
      (onValueChange as DatePickerRangeProps["onValueChange"])?.(nextValue);
    }
    if (nextValue.to) requestOpen(false);
  }

  const resolvedError = error ?? (invalidReason ? technicalMessage(invalidReason) : undefined);
  const placeholderText = placeholder ?? inputFormat.replace("YYYY", "AAAA");
  const rootClasses = ["w-full space-y-[var(--date-picker-gap)]", className]
    .filter(Boolean).join(" ");
  const triggerClasses =
    "inline-flex size-[var(--date-picker-trigger-size)] shrink-0 items-center justify-center rounded-[var(--date-picker-trigger-radius)] border border-[var(--date-picker-trigger-border)] bg-[var(--date-picker-trigger-background)] text-[var(--date-picker-trigger-foreground)] transition-colors duration-[var(--duration-fast)] ease-[var(--easing-standard)] hover:bg-[var(--date-picker-trigger-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-[var(--state-disabled-opacity)] motion-reduce:transition-none";

  const calendar = mode === "single" ? (
    <Calendar
      ref={(node) => {
        calendarInitialFocusRef.current = node?.querySelector<HTMLElement>('button[tabindex="0"]') ?? null;
      }}
      mode="single"
      value={resolvedSingle}
      onValueChange={handleSingleCalendar}
      month={visibleMonth}
      onMonthChange={setVisibleMonth}
      minDate={minDate}
      maxDate={maxDate}
      isDateDisabled={isDateDisabled}
      locale={locale}
      weekStartsOn={weekStartsOn}
      ariaLabel={ariaLabel}
    />
  ) : (
    <Calendar
      ref={(node) => {
        calendarInitialFocusRef.current = node?.querySelector<HTMLElement>('button[tabindex="0"]') ?? null;
      }}
      mode="range"
      value={resolvedRange}
      onValueChange={handleRangeCalendar}
      month={visibleMonth}
      onMonthChange={setVisibleMonth}
      minDate={minDate}
      maxDate={maxDate}
      isDateDisabled={isDateDisabled}
      locale={locale}
      weekStartsOn={weekStartsOn}
      ariaLabel={ariaLabel}
    />
  );

  return (
    <div ref={ref} {...rootProps} className={rootClasses}>
      <Popover
        open={resolvedOpen}
        onOpenChange={requestOpen}
        initialFocusRef={calendarInitialFocusRef}
      >
        {mode === "single" ? (
          <div className="flex min-w-0 items-start gap-[var(--date-picker-control-gap)]">
            <Input
              id={baseId}
              label={label}
              description={description}
              error={resolvedError}
              value={singleDraft}
              onChange={(event) => setSingleDraft(event.target.value)}
              onBlur={commitSingle}
              onKeyDown={(event) => handleInputKeyDown(event, "single")}
              placeholder={placeholderText}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              aria-invalid={invalidField === "single" || undefined}
              inputMode="numeric"
              autoComplete="off"
              className="min-w-0 flex-1"
              inputClassName={inputClassName}
            />
            <PopoverTrigger
              type="button"
              disabled={disabled || readOnly}
              aria-label="Abrir calendário"
              className={`${triggerClasses} mt-[calc(var(--space-2)+var(--font-size-text-sm)*var(--line-height-compact))]`}
            >
              <span aria-hidden="true">▦</span>
            </PopoverTrigger>
          </div>
        ) : (
          <fieldset className="min-w-0 space-y-[var(--date-picker-gap)]">
            <legend className="text-sm font-medium text-hp-foreground">
              {label}{required ? <span aria-hidden="true" className="ml-1 text-hp-danger">*</span> : null}
            </legend>
            {description ? <p id={rangeDescriptionId} className="text-sm text-hp-muted">{description}</p> : null}
            <div className="grid min-w-0 gap-[var(--date-picker-range-gap)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <Input
                id={`${baseId}-from`}
                label="De"
                error={resolvedError}
                value={fromDraft}
                onChange={(event) => setFromDraft(event.target.value)}
                onBlur={() => commitRange("from")}
                onKeyDown={(event) => handleInputKeyDown(event, "from")}
                placeholder={placeholderText}
                disabled={disabled}
                readOnly={readOnly}
                required={required}
                aria-invalid={Boolean(error) || invalidField === "from" || undefined}
                aria-describedby={rangeDescriptionId}
                inputMode="numeric"
                autoComplete="off"
                inputClassName={inputClassName}
              />
              <Input
                id={`${baseId}-to`}
                label="Até"
                value={toDraft}
                onChange={(event) => setToDraft(event.target.value)}
                onBlur={() => commitRange("to")}
                onKeyDown={(event) => handleInputKeyDown(event, "to")}
                placeholder={placeholderText}
                disabled={disabled}
                readOnly={readOnly}
                required={required}
                aria-invalid={Boolean(error) || invalidField === "to" || undefined}
                aria-describedby={[rangeDescriptionId, resolvedError ? `${baseId}-from-error` : undefined]
                  .filter(Boolean).join(" ") || undefined}
                inputMode="numeric"
                autoComplete="off"
                inputClassName={inputClassName}
              />
              <PopoverTrigger
                type="button"
                disabled={disabled || readOnly}
                aria-label="Abrir calendário"
                className={triggerClasses}
              >
                <span aria-hidden="true">▦</span>
              </PopoverTrigger>
            </div>
          </fieldset>
        )}

        <PopoverContent
          align="start"
          aria-label={ariaLabel}
          className={["w-[var(--date-picker-popover-width)] max-w-[calc(100vw-var(--space-8))]", popoverClassName]
            .filter(Boolean).join(" ")}
        >
          {calendar}
        </PopoverContent>
      </Popover>

      {name && mode === "single" ? (
        <input type="hidden" name={name} value={resolvedSingle ?? ""} />
      ) : null}
      {name && mode === "range" ? (
        <>
          <input type="hidden" name={`${name}.from`} value={resolvedRange?.from ?? ""} />
          {resolvedRange?.to ? (
            <input type="hidden" name={`${name}.to`} value={resolvedRange.to} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const DatePicker = forwardRef(DatePickerInner) as (
  props: DatePickerProps & { ref?: React.ForwardedRef<HTMLDivElement> },
) => ReactElement;

export default DatePicker;
