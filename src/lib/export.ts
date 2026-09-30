import { fromKey, WEEKDAY_SHORT } from './dates.ts';
import { bucketFor, type Entries } from './stats.ts';

export const CSV_HEADER = 'date,weekday,drinks,status';

/**
 * One row per logged day, oldest first. Unlogged days are left out rather than written
 * as zero, matching the app's rule that unlogged is not sober. `status` uses the
 * threshold in effect at export time.
 */
export function entriesToCsv(entries: Entries, threshold: number): string {
  const rows = Object.keys(entries)
    .sort()
    .map((day) => {
      const count = entries[day];
      const weekday = WEEKDAY_SHORT[fromKey(day).getDay()];
      return `${day},${weekday},${count},${bucketFor(count, threshold)}`;
    });
  return [CSV_HEADER, ...rows].join('\n') + '\n';
}

export function exportFileName(today: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `opendrink-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}.csv`;
}
