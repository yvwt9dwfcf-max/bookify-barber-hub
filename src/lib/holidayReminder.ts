import { addDays, format } from 'date-fns';

export const HOLIDAY_REMINDER_DAYS = 5;
/** 'closed' / 'open' hide the reminder for good; 'later:yyyy-MM-dd' hides it until that day. */
export type ReminderChoice = 'closed' | 'open' | `later:${string}`;

export function nextHolidayToRemind(
  now: Date,
  choices: Record<string, ReminderChoice>,
  getName: (d: Date) => string | null,
): { date: string; name: string } | null {
  const today = format(now, 'yyyy-MM-dd');
  for (let i = 1; i <= HOLIDAY_REMINDER_DAYS; i++) {
    const d = addDays(now, i);
    const name = getName(d);
    if (!name) continue;
    const date = format(d, 'yyyy-MM-dd');
    const c = choices[date];
    if (c === 'closed' || c === 'open') continue;
    if (c?.startsWith('later:') && c.slice(6) > today) continue;
    return { date, name };
  }
  return null;
}
