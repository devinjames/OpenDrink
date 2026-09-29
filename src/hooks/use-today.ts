import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { startOfDay, toKey } from '@/lib/dates.ts';

/** Today's date at local midnight; rolls over at midnight and on app resume. */
export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    const refresh = () =>
      setToday((prev) => {
        const now = startOfDay(new Date());
        return toKey(now) === toKey(prev) ? prev : now;
      });
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const timer = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  return today;
}
