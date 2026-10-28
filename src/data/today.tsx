import { createContext, useContext, type ReactNode } from 'react';
import { useTodayResult, type LoadResult, type TodayData } from './hooks';

const TodayContext = createContext<LoadResult<TodayData> | null>(null);

/**
 * Loads today's data once for all tabs. The load syncs usage and reads every table, so each tab
 * running its own would double the work on every change.
 */
export function TodayProvider({ children }: { children: ReactNode }) {
  return <TodayContext.Provider value={useTodayResult()}>{children}</TodayContext.Provider>;
}

export function useToday(): LoadResult<TodayData> {
  const value = useContext(TodayContext);
  if (!value) throw new Error('useToday needs a TodayProvider (the tabs layout has one)');
  return value;
}
