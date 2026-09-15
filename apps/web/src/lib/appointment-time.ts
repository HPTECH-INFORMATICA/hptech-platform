export function civilDateTimeInTimezone(
  value: string,
  timezone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function getValidUtcOffsets(value: string, timezone: string): number[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return [];
  const [, year, month, day, hour, minute] = match;
  const civilUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const expected = `${year}-${month}-${day}T${hour}:${minute}`;
  const offsets: number[] = [];

  for (let offset = -840; offset <= 840; offset += 15) {
    const parts = formatter.formatToParts(new Date(civilUtc - offset * 60_000));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const formatted = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
    if (formatted === expected) offsets.push(offset);
  }
  return offsets;
}

export function formatUtcOffset(offset: number): string {
  const sign = offset >= 0 ? "+" : "−";
  const absolute = Math.abs(offset);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}
