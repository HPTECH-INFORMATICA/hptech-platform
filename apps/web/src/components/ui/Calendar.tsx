"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from "react";

import IconButton from "@/components/ui/IconButton";

export type CalendarDate = string;
export type CalendarMonth = string;

export type CalendarRange = {
  from: CalendarDate;
  to?: CalendarDate;
};

export type CalendarWeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type CalendarBaseProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  month?: CalendarMonth;
  defaultMonth?: CalendarMonth;
  onMonthChange?: (month: CalendarMonth) => void;
  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  isDateDisabled?: (date: CalendarDate) => boolean;
  locale?: string;
  weekStartsOn?: CalendarWeekStartsOn;
  showOutsideDays?: boolean;
  fixedWeeks?: boolean;
  ariaLabel?: string;
};

export type CalendarSingleProps = CalendarBaseProps & {
  mode: "single";
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onValueChange?: (value: CalendarDate | null) => void;
};

export type CalendarRangeProps = CalendarBaseProps & {
  mode: "range";
  value?: CalendarRange | null;
  defaultValue?: CalendarRange | null;
  onValueChange?: (value: CalendarRange | null) => void;
};

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

type CivilParts = {
  year: number;
  month: number;
  day: number;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const FALLBACK_LOCALE = "pt-BR";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0, 12).getDate();
}

function parseDate(value: CalendarDate): CivilParts | null {
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

function parseMonth(value: CalendarMonth): Omit<CivilParts, "day"> | null {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function assertDate(value: CalendarDate | undefined, name: string): void {
  if (value !== undefined && !parseDate(value) && process.env.NODE_ENV !== "production") {
    throw new Error(`Calendar recebeu ${name} inválido: "${value}". Use YYYY-MM-DD.`);
  }
}

function assertMonth(value: CalendarMonth | undefined, name: string): void {
  if (value !== undefined && !parseMonth(value) && process.env.NODE_ENV !== "production") {
    throw new Error(`Calendar recebeu ${name} inválido: "${value}". Use YYYY-MM.`);
  }
}

function formatDate({ year, month, day }: CivilParts): CalendarDate {
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

function formatMonth({ year, month }: Omit<CivilParts, "day">): CalendarMonth {
  return `${String(year).padStart(4, "0")}-${pad(month)}`;
}

function localDate(value: CalendarDate): Date {
  const parts = parseDate(value);
  if (!parts) return new Date(2000, 0, 1, 12);
  return new Date(parts.year, parts.month - 1, parts.day, 12);
}

function todayDate(): CalendarDate {
  const now = new Date();
  return formatDate({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
}

function monthOf(value: CalendarDate): CalendarMonth {
  return value.slice(0, 7);
}

function compareDates(left: CalendarDate, right: CalendarDate): number {
  return left.localeCompare(right);
}

function addDays(value: CalendarDate, amount: number): CalendarDate {
  const date = localDate(value);
  date.setDate(date.getDate() + amount);
  return formatDate({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

function addMonths(value: CalendarMonth, amount: number): CalendarMonth {
  const parts = parseMonth(value) ?? { year: 2000, month: 1 };
  const date = new Date(parts.year, parts.month - 1 + amount, 1, 12);
  return formatMonth({ year: date.getFullYear(), month: date.getMonth() + 1 });
}

function addYears(value: CalendarDate, amount: number): CalendarDate {
  const parts = parseDate(value) ?? { year: 2000, month: 1, day: 1 };
  const targetYear = parts.year + amount;
  return formatDate({
    year: targetYear,
    month: parts.month,
    day: Math.min(parts.day, daysInMonth(targetYear, parts.month)),
  });
}

function moveByMonths(value: CalendarDate, amount: number): CalendarDate {
  const parts = parseDate(value) ?? { year: 2000, month: 1, day: 1 };
  const target = parseMonth(addMonths(monthOf(value), amount)) ?? parts;
  return formatDate({
    year: target.year,
    month: target.month,
    day: Math.min(parts.day, daysInMonth(target.year, target.month)),
  });
}

function startOfWeek(value: CalendarDate, weekStartsOn: CalendarWeekStartsOn): CalendarDate {
  const weekday = localDate(value).getDay();
  return addDays(value, -((weekday - weekStartsOn + 7) % 7));
}

function endOfWeek(value: CalendarDate, weekStartsOn: CalendarWeekStartsOn): CalendarDate {
  return addDays(startOfWeek(value, weekStartsOn), 6);
}

function monthBounds(month: CalendarMonth): { start: CalendarDate; end: CalendarDate } {
  const parts = parseMonth(month) ?? { year: 2000, month: 1 };
  return {
    start: formatDate({ ...parts, day: 1 }),
    end: formatDate({ ...parts, day: daysInMonth(parts.year, parts.month) }),
  };
}

function generateCalendarDates(
  month: CalendarMonth,
  weekStartsOn: CalendarWeekStartsOn,
  fixedWeeks: boolean,
): CalendarDate[] {
  const bounds = monthBounds(month);
  const first = startOfWeek(bounds.start, weekStartsOn);
  const naturalLast = endOfWeek(bounds.end, weekStartsOn);
  let naturalCount = 1;
  for (let cursor = first; cursor !== naturalLast; cursor = addDays(cursor, 1)) {
    naturalCount += 1;
  }
  const count = fixedWeeks ? 42 : naturalCount;
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}

function normalizeLocale(locale: string): string {
  try {
    new Intl.DateTimeFormat(locale).format(localDate("2000-01-01"));
    return locale;
  } catch {
    return FALLBACK_LOCALE;
  }
}

function isRange(value: CalendarDate, range: CalendarRange | null): boolean {
  if (!range?.to) return false;
  return compareDates(value, range.from) >= 0 && compareDates(value, range.to) <= 0;
}

function CalendarInner(props: CalendarProps, ref: React.ForwardedRef<HTMLDivElement>): ReactElement {
  const {
    mode,
    value,
    defaultValue,
    onValueChange,
    month,
    defaultMonth,
    onMonthChange,
    minDate,
    maxDate,
    isDateDisabled,
    locale = FALLBACK_LOCALE,
    weekStartsOn = 0,
    showOutsideDays = true,
    fixedWeeks = false,
    ariaLabel = "Calendário",
    className,
    ...rootProps
  } = props;

  assertDate(minDate, "minDate");
  assertDate(maxDate, "maxDate");
  assertMonth(month, "month");
  assertMonth(defaultMonth, "defaultMonth");
  if (minDate && maxDate && compareDates(minDate, maxDate) > 0 && process.env.NODE_ENV !== "production") {
    throw new Error("Calendar requer minDate anterior ou igual a maxDate.");
  }

  if (mode === "single") {
    assertDate(value ?? defaultValue ?? undefined, "value");
  } else {
    const initialRange = value ?? defaultValue;
    if (initialRange) {
      assertDate(initialRange.from, "value.from");
      assertDate(initialRange.to, "value.to");
    }
  }

  const [controlledMode] = useState(props.value !== undefined);
  const [controlledMonthMode] = useState(month !== undefined);
  const [internalSingle, setInternalSingle] = useState<CalendarDate | null>(
    mode === "single" ? defaultValue ?? null : null,
  );
  const [internalRange, setInternalRange] = useState<CalendarRange | null>(
    mode === "range" ? defaultValue ?? null : null,
  );
  const selectedSingle = mode === "single"
    ? controlledMode ? value ?? null : internalSingle
    : null;
  const selectedRange = mode === "range"
    ? controlledMode ? value ?? null : internalRange
    : null;
  const selectedAnchor = selectedSingle ?? selectedRange?.from;
  const initialMonth = defaultMonth ?? (selectedAnchor ? monthOf(selectedAnchor) : monthOf(todayDate()));
  const [internalMonth, setInternalMonth] = useState(initialMonth);
  const resolvedMonth = controlledMonthMode ? month ?? initialMonth : internalMonth;
  const [focusedDate, setFocusedDate] = useState<CalendarDate | null>(null);
  const pendingFocusRef = useRef<CalendarDate | null>(null);
  const dayRefs = useRef(new Map<CalendarDate, HTMLButtonElement>());
  const liveId = useId();
  const safeLocale = normalizeLocale(locale);
  const today = todayDate();

  const isDisabled = (date: CalendarDate): boolean =>
    Boolean(
      (minDate && compareDates(date, minDate) < 0) ||
      (maxDate && compareDates(date, maxDate) > 0) ||
      isDateDisabled?.(date),
    );

  const dates = useMemo(
    () => generateCalendarDates(resolvedMonth, weekStartsOn, fixedWeeks),
    [fixedWeeks, resolvedMonth, weekStartsOn],
  );
  const visibleEnabledDates = dates.filter(
    (date) => (showOutsideDays || monthOf(date) === resolvedMonth) && !isDisabled(date),
  );
  const selectedFocusCandidate = selectedSingle ?? selectedRange?.to ?? selectedRange?.from;
  const tabbableDate =
    (focusedDate && visibleEnabledDates.includes(focusedDate) ? focusedDate : null) ??
    (selectedFocusCandidate && visibleEnabledDates.includes(selectedFocusCandidate) ? selectedFocusCandidate : null) ??
    (visibleEnabledDates.includes(today) ? today : null) ??
    visibleEnabledDates[0] ??
    null;

  const monthFormatter = new Intl.DateTimeFormat(safeLocale, { month: "long", year: "numeric" });
  const fullDateFormatter = new Intl.DateTimeFormat(safeLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekdayFormatter = new Intl.DateTimeFormat(safeLocale, { weekday: "short" });
  const monthLabel = monthFormatter.format(localDate(`${resolvedMonth}-01`));
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    weekdayFormatter.format(localDate(addDays(startOfWeek("2024-01-07", weekStartsOn), index))),
  );

  function requestMonth(nextMonth: CalendarMonth): void {
    if (!controlledMonthMode) setInternalMonth(nextMonth);
    onMonthChange?.(nextMonth);
  }

  function monthUnavailable(targetMonth: CalendarMonth): boolean {
    const bounds = monthBounds(targetMonth);
    return Boolean(
      (minDate && compareDates(bounds.end, minDate) < 0) ||
      (maxDate && compareDates(bounds.start, maxDate) > 0),
    );
  }

  function intervalHasDisabled(from: CalendarDate, to: CalendarDate): boolean {
    for (let cursor = from; compareDates(cursor, to) <= 0; cursor = addDays(cursor, 1)) {
      if (isDisabled(cursor)) return true;
    }
    return false;
  }

  function selectDate(date: CalendarDate): void {
    if (isDisabled(date)) return;
    if (mode === "single") {
      if (!controlledMode) setInternalSingle(date);
      onValueChange?.(date);
      return;
    }

    let nextRange: CalendarRange;
    if (!selectedRange || selectedRange.to) {
      nextRange = { from: date };
    } else {
      const from = compareDates(date, selectedRange.from) < 0 ? date : selectedRange.from;
      const to = compareDates(date, selectedRange.from) < 0 ? selectedRange.from : date;
      if (intervalHasDisabled(from, to)) return;
      nextRange = { from, to };
    }
    if (!controlledMode) setInternalRange(nextRange);
    onValueChange?.(nextRange);
  }

  function findEnabledDate(origin: CalendarDate, step: number): CalendarDate | null {
    let candidate = origin;
    for (let attempt = 0; attempt < 3_660; attempt += 1) {
      if ((!minDate || compareDates(candidate, minDate) >= 0) &&
          (!maxDate || compareDates(candidate, maxDate) <= 0) &&
          !isDisabled(candidate)) return candidate;
      candidate = addDays(candidate, step);
      if ((minDate && compareDates(candidate, minDate) < 0) ||
          (maxDate && compareDates(candidate, maxDate) > 0)) return null;
    }
    return null;
  }

  function moveFocus(target: CalendarDate, step: number): void {
    const enabled = findEnabledDate(target, step);
    if (!enabled) return;
    setFocusedDate(enabled);
    pendingFocusRef.current = enabled;
    if (monthOf(enabled) !== resolvedMonth) requestMonth(monthOf(enabled));
    else requestAnimationFrame(() => dayRefs.current.get(enabled)?.focus());
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: CalendarDate): void {
    let target: CalendarDate | null = null;
    let step = 1;
    switch (event.key) {
      case "ArrowLeft": target = addDays(date, -1); step = -1; break;
      case "ArrowRight": target = addDays(date, 1); break;
      case "ArrowUp": target = addDays(date, -7); step = -1; break;
      case "ArrowDown": target = addDays(date, 7); break;
      case "Home": target = startOfWeek(date, weekStartsOn); break;
      case "End": target = endOfWeek(date, weekStartsOn); step = -1; break;
      case "PageUp": target = event.shiftKey ? addYears(date, -1) : moveByMonths(date, -1); step = -1; break;
      case "PageDown": target = event.shiftKey ? addYears(date, 1) : moveByMonths(date, 1); break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectDate(date);
        return;
      default: return;
    }
    event.preventDefault();
    moveFocus(target, step);
  }

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending || monthOf(pending) !== resolvedMonth) return;
    pendingFocusRef.current = null;
    dayRefs.current.get(pending)?.focus();
  }, [resolvedMonth]);

  function handleOutsideSelection(
    event: MouseEvent<HTMLButtonElement>,
    date: CalendarDate,
  ): void {
    if (monthOf(date) !== resolvedMonth) requestMonth(monthOf(date));
    selectDate(date);
    setFocusedDate(date);
    event.currentTarget.focus();
  }

  const rootClasses = [
    "w-full max-w-[var(--calendar-max-width)] rounded-[var(--calendar-radius)] border border-[var(--calendar-border)] bg-[var(--calendar-background)] p-[var(--calendar-padding)] text-[var(--calendar-foreground)]",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div ref={ref} {...rootProps} className={rootClasses}>
      <div className="mb-[var(--calendar-header-gap)] flex min-w-0 items-center justify-between gap-[var(--calendar-gap)]">
        <IconButton
          icon={<span aria-hidden="true">‹</span>}
          label="Mês anterior"
          size="sm"
          disabled={monthUnavailable(addMonths(resolvedMonth, -1))}
          onClick={() => requestMonth(addMonths(resolvedMonth, -1))}
        />
        <div className="min-w-0 text-center text-sm font-semibold capitalize" aria-hidden="true">
          {monthLabel}
        </div>
        <IconButton
          icon={<span aria-hidden="true">›</span>}
          label="Próximo mês"
          size="sm"
          disabled={monthUnavailable(addMonths(resolvedMonth, 1))}
          onClick={() => requestMonth(addMonths(resolvedMonth, 1))}
        />
      </div>

      <div id={liveId} className="sr-only" aria-live="polite" aria-atomic="true">
        {monthLabel}
      </div>

      <div role="grid" aria-label={`${ariaLabel}: ${monthLabel}`} aria-describedby={liveId}>
        <div role="row" className="grid grid-cols-7 gap-[var(--calendar-gap)]">
          {weekdayLabels.map((label, index) => (
            <div
              key={`${label}-${index}`}
              role="columnheader"
              aria-label={fullDateFormatter.format(localDate(addDays(startOfWeek("2024-01-07", weekStartsOn), index))).split(",")[0]}
              className="flex min-h-[var(--calendar-weekday-height)] items-center justify-center text-xs font-medium uppercase text-[var(--calendar-muted-foreground)]"
            >
              {label.replace(".", "")}
            </div>
          ))}
        </div>

        {Array.from({ length: dates.length / 7 }, (_, weekIndex) => (
          <div key={weekIndex} role="row" className="grid grid-cols-7 gap-[var(--calendar-gap)]">
            {dates.slice(weekIndex * 7, weekIndex * 7 + 7).map((date) => {
              const outside = monthOf(date) !== resolvedMonth;
              const hidden = outside && !showOutsideDays;
              const disabled = hidden || isDisabled(date);
              const selected = mode === "single"
                ? selectedSingle === date
                : selectedRange?.from === date || selectedRange?.to === date || isRange(date, selectedRange);
              const rangeStart = mode === "range" && selectedRange?.from === date;
              const rangeEnd = mode === "range" && selectedRange?.to === date;
              const rangeMiddle = mode === "range" && isRange(date, selectedRange) && !rangeStart && !rangeEnd;
              const parts = parseDate(date) ?? { day: 1 };
              return (
                <div key={date} role="gridcell" aria-selected={selected || undefined} className="min-w-0">
                  <button
                    ref={(node) => {
                      if (node) dayRefs.current.set(date, node);
                      else dayRefs.current.delete(date);
                    }}
                    type="button"
                    disabled={disabled}
                    tabIndex={!disabled && date === tabbableDate ? 0 : -1}
                    aria-label={fullDateFormatter.format(localDate(date))}
                    aria-current={date === today ? "date" : undefined}
                    aria-disabled={disabled || undefined}
                    aria-hidden={hidden || undefined}
                    data-outside={outside || undefined}
                    data-today={date === today || undefined}
                    data-selected={selected || undefined}
                    data-range-start={rangeStart || undefined}
                    data-range-middle={rangeMiddle || undefined}
                    data-range-end={rangeEnd || undefined}
                    className="flex size-[var(--calendar-cell-size)] min-w-[var(--calendar-touch-target)] items-center justify-center justify-self-center rounded-[var(--calendar-day-radius)] text-sm outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--easing-standard)] hover:bg-[var(--calendar-day-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--calendar-focus)] disabled:cursor-not-allowed disabled:text-[var(--calendar-disabled-foreground)] data-[outside=true]:text-[var(--calendar-outside-foreground)] data-[today=true]:font-semibold data-[today=true]:ring-1 data-[today=true]:ring-[var(--calendar-today-ring)] data-[selected=true]:bg-[var(--calendar-selected-background)] data-[selected=true]:text-[var(--calendar-selected-foreground)] data-[range-middle=true]:rounded-[var(--radius-none)] data-[range-middle=true]:bg-[var(--calendar-range-background)] data-[range-middle=true]:text-[var(--calendar-range-foreground)] motion-reduce:transition-none"
                    onFocus={() => setFocusedDate(date)}
                    onKeyDown={(event) => handleDayKeyDown(event, date)}
                    onClick={(event) => handleOutsideSelection(event, date)}
                  >
                    {parts.day}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const Calendar = forwardRef(CalendarInner) as (
  props: CalendarProps & { ref?: React.ForwardedRef<HTMLDivElement> },
) => ReactElement;

export default Calendar;
