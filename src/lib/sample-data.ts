import { addDays, toKey } from './dates.ts';
import type { Entries } from './stats.ts';

/** Plausible-looking history for previewing the UI (dev builds only). */
export function sampleEntries(today: Date, days = 120): Entries {
  const out: Entries = {};
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 1; i < days; i++) {
    const d = addDays(today, -i);
    if (rand() < 0.08) continue; // occasional missed day
    const weekend = d.getDay() === 5 || d.getDay() === 6;
    const r = rand();
    out[toKey(d)] = weekend
      ? r < 0.3
        ? 0
        : r < 0.55
          ? 1
          : 2 + Math.floor(rand() * 3)
      : r < 0.7
        ? 0
        : r < 0.9
          ? 1
          : 2;
  }
  return out;
}
