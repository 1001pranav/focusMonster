import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { defaultTag, wastedMinutes, type AppTag } from '@/domain/apps';
import { addDays, today, type Day } from '@/domain/dates';
import { reclaimedMinutes } from '@/domain/reclaimed';
import { streakOf, type Streak } from '@/domain/streak';
import { averageBefore, evaluate, type DayResult } from '@/domain/target';
import type { Goal, Task } from '@/domain/tasks';
import { loadAppLabels, loadDailyUsage, loadGoals, loadSettings, loadTags, loadTasks, type Settings } from '@/db/repo';
import { useStore } from '@/db/store';
import { syncFinishedDays, usageSameTimeLastWeek, usageSoFar } from '@/services/usage';

/** Runs `load` on mount, after every database write, and when the app comes back to the foreground. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []): T | null {
  const version = useStore((s) => s.version);
  const [foreground, setForeground] = useState(0);
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setForeground((n) => n + 1));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    let live = true;
    load().then((v) => live && setValue(v), (e) => console.warn(e));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, foreground, ...deps]);
  return value;
}

export interface AppMinutes {
  packageName: string;
  label: string;
  minutes: number;
  tag: AppTag;
}

export interface TodayData {
  settings: Settings;
  day: Day;
  targetMin: number;
  wastedMin: number;
  /** Same weekday last week, up to the same time; null without data. */
  lastWeekMin: number | null;
  avg7Min: number | null;
  days: DayResult[];
  streak: Streak;
  reclaimedMin: number;
  apps: AppMinutes[];
  goals: Goal[];
  tasks: Task[];
}

export function useToday(): TodayData | null {
  return useLoad(async () => {
    const settings = await loadSettings();
    const plan = settings.plan;
    const day = today();
    await syncFinishedDays();
    const [tags, labels, usage, lastWeek, goals, tasks] = await Promise.all([loadTags(), loadAppLabels(), usageSoFar(), usageSameTimeLastWeek(), loadGoals(), loadTasks(addDays(day, -1))]);
    const stored = await loadDailyUsage(plan ? addDays(plan.startDay, -7) : addDays(day, -14));
    const wastedByDay = Object.fromEntries(Object.entries(stored).map(([d, u]) => [d, wastedMinutes(u, tags)]));
    const { days, todayTarget } = plan ? evaluate(plan, wastedByDay, day) : { days: [], todayTarget: 0 };
    const apps = Object.entries(usage)
      .map(([packageName, ms]) => ({ packageName, label: labels[packageName] ?? packageName, minutes: ms / 60000, tag: tags[packageName] ?? defaultTag(packageName) }))
      .filter((a) => a.minutes >= 1)
      .sort((a, b) => b.minutes - a.minutes);
    return {
      settings,
      day,
      targetMin: todayTarget,
      wastedMin: wastedMinutes(usage, tags),
      lastWeekMin: lastWeek ? wastedMinutes(lastWeek, tags) : null,
      avg7Min: averageBefore(wastedByDay, day, 7),
      days,
      streak: streakOf(days),
      reclaimedMin: plan ? reclaimedMinutes(days, plan.baselineMin) : 0,
      apps,
      goals,
      tasks,
    };
  });
}
