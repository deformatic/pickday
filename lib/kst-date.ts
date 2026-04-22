const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 24 * 60 * 60 * 1000;

type DateLike = string | Date;

type KstDateParts = {
  year: number;
  month: number;
  day: number;
};

type KstDateTimeParts = KstDateParts & {
  hour: number;
  minute: number;
  second: number;
};

const datePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const kstFormatterCache = new Map<string, Intl.DateTimeFormat>();

const localDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify([locale, options]);
  const cached = kstFormatterCache.get(key);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: KST_TIME_ZONE,
    ...options,
  });

  kstFormatterCache.set(key, formatter);
  return formatter;
}

function getPartMap(formatter: Intl.DateTimeFormat, value: Date) {
  return formatter.formatToParts(value).reduce<Record<string, string>>((parts, part) => {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }

    return parts;
  }, {});
}

function buildKstDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, second));
}

function parseKstLocalDate(year: number, month: number, day: number) {
  const date = buildKstDate(year, month, day);
  const parts = getPartMap(datePartsFormatter, date);

  if (
    Number(parts.year) !== year
    || Number(parts.month) !== month
    || Number(parts.day) !== day
  ) {
    return null;
  }

  return date;
}

function parseKstLocalDateTime(year: number, month: number, day: number, hour: number, minute: number, second: number) {
  const date = buildKstDate(year, month, day, hour, minute, second);
  const parts = getPartMap(dateTimePartsFormatter, date);

  if (
    Number(parts.year) !== year
    || Number(parts.month) !== month
    || Number(parts.day) !== day
    || Number(parts.hour) !== hour
    || Number(parts.minute) !== minute
    || Number(parts.second) !== second
  ) {
    return null;
  }

  return date;
}

function toDate(value: DateLike) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  const localDateMatch = value.match(localDatePattern);

  if (localDateMatch) {
    const [, year, month, day] = localDateMatch;
    return parseKstLocalDate(Number(year), Number(month), Number(day));
  }

  const localDateTimeMatch = value.match(localDateTimePattern);

  if (localDateTimeMatch) {
    const [, year, month, day, hour, minute, second = "0"] = localDateTimeMatch;
    return parseKstLocalDateTime(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseKstDateTimeLocalToIsoString(value: string) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

export function getKstDateParts(value: DateLike): KstDateParts | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  const parts = getPartMap(datePartsFormatter, date);

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

export function getKstDateKey(value: DateLike) {
  const parts = getKstDateParts(value);

  if (!parts) {
    return null;
  }

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getKstStartOfDay(value: DateLike) {
  const parts = getKstDateParts(value);

  if (!parts) {
    return null;
  }

  return buildKstDate(parts.year, parts.month, parts.day);
}

export function addKstDays(value: DateLike, amount: number) {
  const parts = getKstDateParts(value);

  if (!parts) {
    return null;
  }

  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return buildKstDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function addKstMonths(value: DateLike, amount: number) {
  const parts = getKstDateParts(value);

  if (!parts) {
    return null;
  }

  const next = new Date(Date.UTC(parts.year, parts.month - 1 + amount, 1));
  return buildKstDate(next.getUTCFullYear(), next.getUTCMonth() + 1, 1);
}

export function startOfKstMonth(value: DateLike) {
  const parts = getKstDateParts(value);

  if (!parts) {
    return null;
  }

  return buildKstDate(parts.year, parts.month, 1);
}

export function endOfKstMonth(value: DateLike) {
  const parts = getKstDateParts(value);

  if (!parts) {
    return null;
  }

  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0));
  return buildKstDate(lastDay.getUTCFullYear(), lastDay.getUTCMonth() + 1, lastDay.getUTCDate());
}

export function sameKstDay(left: DateLike, right: DateLike) {
  const leftKey = getKstDateKey(left);
  const rightKey = getKstDateKey(right);
  return leftKey !== null && leftKey === rightKey;
}

export function getKstWeekdayMondayIndex(value: DateLike) {
  const parts = getKstDateParts(value);

  if (!parts) {
    return null;
  }

  return (new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() + 6) % 7;
}

export function formatKstDate(value: DateLike, locale: string, options: Intl.DateTimeFormatOptions) {
  const date = toDate(value);

  if (!date) {
    throw new Error("Invalid date value");
  }

  return getFormatter(locale, options).format(date);
}

export function getKstDayOfMonth(value: DateLike) {
  const parts = getKstDateParts(value);
  return parts?.day ?? null;
}

export function enumerateKstDays(start: DateLike, end: DateLike) {
  const startDate = getKstStartOfDay(start);
  const endDate = getKstStartOfDay(end);

  if (!startDate || !endDate) {
    return [];
  }

  const days: Date[] = [];

  for (let cursor = startDate.getTime(); cursor <= endDate.getTime(); cursor += DAY_MS) {
    days.push(new Date(cursor));
  }

  return days;
}

export function getKstDateTimeParts(value: DateLike): KstDateTimeParts | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  const parts = getPartMap(dateTimePartsFormatter, date);

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function isKstDateTimeLocalString(value: string) {
  return localDateTimePattern.test(value);
}

export { KST_TIME_ZONE };
