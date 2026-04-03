/**
 * Brazilian national holidays (fixed + Easter-based movable)
 * Returns holiday name for a given date, or null if not a holiday.
 */

interface Holiday {
  month: number; // 1-indexed
  day: number;
  name: string;
}

const FIXED_HOLIDAYS: Holiday[] = [
  { month: 1, day: 1, name: 'Confraternização Universal' },
  { month: 4, day: 21, name: 'Tiradentes' },
  { month: 5, day: 1, name: 'Dia do Trabalho' },
  { month: 9, day: 7, name: 'Independência do Brasil' },
  { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
  { month: 11, day: 2, name: 'Finados' },
  { month: 11, day: 15, name: 'Proclamação da República' },
  { month: 11, day: 20, name: 'Dia da Consciência Negra' },
  { month: 12, day: 25, name: 'Natal' },
];

/**
 * Calculates Easter Sunday using the Anonymous Gregorian algorithm
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get all movable holidays for a given year (Easter-based)
 */
function getMovableHolidays(year: number): { date: Date; name: string }[] {
  const easter = getEasterSunday(year);
  return [
    { date: addDaysToDate(easter, -48), name: 'Carnaval' },
    { date: addDaysToDate(easter, -47), name: 'Carnaval' },
    { date: addDaysToDate(easter, -2), name: 'Paixão de Cristo' },
    { date: easter, name: 'Páscoa' },
    { date: addDaysToDate(easter, 60), name: 'Corpus Christi' },
  ];
}

/**
 * Returns the holiday name if the given date is a Brazilian holiday, or null.
 */
export function getHolidayName(date: Date): string | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  // Check fixed holidays
  const fixed = FIXED_HOLIDAYS.find(h => h.month === month && h.day === day);
  if (fixed) return fixed.name;

  // Check movable holidays
  const movable = getMovableHolidays(year);
  const match = movable.find(h =>
    h.date.getFullYear() === year &&
    h.date.getMonth() === date.getMonth() &&
    h.date.getDate() === day
  );

  return match?.name ?? null;
}
