export type AvailabilityIntervalDraft = {
  weekday: number;
  start_time: string;
  end_time: string;
};

export type AvailabilityExceptionKind = "AVAILABLE" | "UNAVAILABLE";

export type AvailabilityExceptionDraft = {
  local_date: string;
  kind: AvailabilityExceptionKind;
  full_day: boolean;
  start_time: string;
  end_time: string;
};

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CIVIL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/;

export function normalizeCivilTime(value: string): string {
  const trimmed = value.trim();
  if (!CIVIL_TIME_PATTERN.test(trimmed)) return trimmed;
  return trimmed.slice(0, 5);
}

export function normalizeWeeklyIntervals(
  intervals: AvailabilityIntervalDraft[],
): AvailabilityIntervalDraft[] {
  return intervals
    .map((interval) => ({
      weekday: interval.weekday,
      start_time: normalizeCivilTime(interval.start_time),
      end_time: normalizeCivilTime(interval.end_time),
    }))
    .sort(
      (left, right) =>
        left.weekday - right.weekday ||
        left.start_time.localeCompare(right.start_time) ||
        left.end_time.localeCompare(right.end_time),
    );
}

export function weeklyIntervalsEqual(
  left: AvailabilityIntervalDraft[],
  right: AvailabilityIntervalDraft[],
): boolean {
  return JSON.stringify(normalizeWeeklyIntervals(left)) === JSON.stringify(normalizeWeeklyIntervals(right));
}

export function validateWeeklyIntervals(
  intervals: AvailabilityIntervalDraft[],
): string | null {
  const normalized = normalizeWeeklyIntervals(intervals);
  for (const interval of normalized) {
    if (!Number.isInteger(interval.weekday) || interval.weekday < 0 || interval.weekday > 6) {
      return "O dia da semana informado é inválido.";
    }
    if (!CIVIL_TIME_PATTERN.test(interval.start_time) || !CIVIL_TIME_PATTERN.test(interval.end_time)) {
      return "Preencha os horários inicial e final de todos os intervalos.";
    }
    if (interval.start_time >= interval.end_time) {
      return "O horário inicial deve ser anterior ao horário final.";
    }
  }
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    if (previous.weekday === current.weekday && current.start_time < previous.end_time) {
      return "Os intervalos do mesmo dia não podem se sobrepor.";
    }
  }
  return null;
}

export function weeklyPayload(intervals: AvailabilityIntervalDraft[]) {
  return { intervals: normalizeWeeklyIntervals(intervals) };
}

export function validateExceptionDraft(draft: AvailabilityExceptionDraft): string | null {
  if (!CIVIL_DATE_PATTERN.test(draft.local_date)) return "Informe uma data válida.";
  if (draft.kind === "AVAILABLE" && draft.full_day) {
    return "Disponibilidade excepcional exige horários.";
  }
  if (draft.full_day) return null;
  const start = normalizeCivilTime(draft.start_time);
  const end = normalizeCivilTime(draft.end_time);
  if (!CIVIL_TIME_PATTERN.test(start) || !CIVIL_TIME_PATTERN.test(end)) {
    return "Informe os horários inicial e final.";
  }
  return start < end ? null : "O horário inicial deve ser anterior ao horário final.";
}

export function exceptionPayload(draft: AvailabilityExceptionDraft) {
  return {
    local_date: draft.local_date,
    kind: draft.kind,
    start_time: draft.full_day ? null : normalizeCivilTime(draft.start_time),
    end_time: draft.full_day ? null : normalizeCivilTime(draft.end_time),
  };
}

export function isPastCivilDate(value: string, today: string): boolean {
  return CIVIL_DATE_PATTERN.test(value) && CIVIL_DATE_PATTERN.test(today) && value < today;
}

export function todayInTimezone(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
