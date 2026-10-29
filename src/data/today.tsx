import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { today } from '@/domain/dates';
import { useTodayResult, type LoadResult, type TodayData } from './hooks';

const TodayContext = createContext<LoadResult<TodayData> | null>(null);

/** How often to check whether the date changed while the app stayed open. */
const DAY_CHECK_MS = 60_000;

/**
 * Loads today's data once for all tabs. The load syncs usage and reads every table, so each tab
 * running its own would double the work on every change.
 *
 * It also reloads when the date changes while the app is open: without that, an app left on screen
 * past midnight keeps showing yesterday until something else triggers a reload.
 */
export function TodayProvider({ children }: { children: ReactNode }) {
  const result = useTodayResult();
  const shownDay = result.value?.day;
  const reload = useRef(result.reload);
  useEffect(() => {
    reload.current = result.reload;
  });

  useEffect(() => {
    if (!shownDay) return;
    const check = setInterval(() => {
      if (today() !== shownDay) reload.current();
    }, DAY_CHECK_MS);
    return () => clearInterval(check);
  }, [shownDay]);

  return <TodayContext.Provider value={result}>{children}</TodayContext.Provider>;
}

export function useToday(): LoadResult<TodayData> {
  const value = useContext(TodayContext);
  if (!value) throw new Error('useToday needs a TodayProvider (the tabs layout has one)');
  return value;
}
