import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { gateServiceEnabled } from '../../modules/usage-stats/gate';
import { defaultTag, wastedMinutes, type AppTag } from '@/domain/apps';
import { addDays, startOf, today, type Day } from '@/domain/dates';
import { summarize, type GateSummary } from '@/domain/gate';
import { shortVideoLines, type ShortVideoLine } from '@/domain/shorts';
import { focusedToday, running, statusOf, type FocusSession } from '@/domain/focus';
import { doneOn, type Habit } from '@/domain/habits';
import { reclaimedMinutes } from '@/domain/reclaimed';
import { streakOf, type Streak } from '@/domain/streak';
import { averageBefore, evaluate, type DayResult } from '@/domain/target';
import type { Goal, Task } from '@/domain/tasks';
import { loadAppLabels, loadDailyUsage, loadFocusSessions, loadGateEvents, loadHabitLogs, loadHabits, loadReflections, loadShortVideo, loadGoals, loadSettings, loadTags, loadTasks, type Settings } from '@/db/repo';
import { useStore } from '@/db/store';
import { importGateLog, pushGateConfig } from '@/services/gate';
import { applyDuePending } from '@/services/lock';
import { importShortVideo } from '@/services/shorts';
import { checkChallenge, type ActiveChallenge } from '@/services/challenges';
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
  gate: { wanted: boolean; serviceOn: boolean; today: GateSummary };
  shortVideo: ShortVideoLine[];
  focus: {
    running: FocusSession | null;
    /** A session that ran to the end in the last 15 minutes while its task is still open. */
    justDone: FocusSession | null;
    todayMin: number;
  };
  habits: { habit: Habit; done: boolean; pickedAtGate: boolean }[];
  challenge: ActiveChallenge | null;
  /** Tonight's one-liner, once written. */
  reflection: string | null;
  now: number;
}

export function useToday(): TodayData | null {
  return useLoad(async () => {
    await applyDuePending();
    const settings = await loadSettings();
    const plan = settings.plan;
    const day = today();
    await syncFinishedDays();
    await importGateLog();
    await importShortVideo();
    const [tags, labels, usage, lastWeek, goals, tasks] = await Promise.all([loadTags(), loadAppLabels(), usageSoFar(), usageSameTimeLastWeek(), loadGoals(), loadTasks(addDays(day, -1))]);
    const stored = await loadDailyUsage(plan ? addDays(plan.startDay, -7) : addDays(day, -14));
    const wastedByDay = Object.fromEntries(Object.entries(stored).map(([d, u]) => [d, wastedMinutes(u, tags)]));
    const { days, todayTarget, nextIfHit } = plan ? evaluate(plan, wastedByDay, day) : { days: [], todayTarget: 0, nextIfHit: 0 };
    const gateEvents = await loadGateEvents(startOf(day).getTime());
    const shortRows = await loadShortVideo(addDays(day, -1));
    const now = Date.now();
    const [sessions, habits, habitLogs, reflections] = await Promise.all([loadFocusSessions(startOf(day).getTime()), loadHabits(), loadHabitLogs(day), loadReflections(day)]);
    const focus = running(sessions, now);
    const justDone =
      [...sessions].reverse().find((s) => statusOf(s, now) === 'done' && now - s.plannedEnd < 15 * 60000 && tasks.some((t) => t.id === s.taskId && t.status === 'todo')) ?? null;
    const challenge = await checkChallenge({ current: day, tags, bedtime: settings.bedtime, days });
    const pickedAtGate = new Set(gateEvents.filter((e) => e.choice === 'instead').map((e) => e.habitId));
    pushGateConfig({ enabled: settings.gateEnabled, pending: settings.pending, shorts: settings.shorts, focus, habits, tags, targetMin: todayTarget, nextIfHit, morningAt: settings.morningAt, nightAt: settings.nightAt, bedtime: settings.bedtime, tasks, goals, day });
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
      gate: { wanted: settings.gateEnabled, serviceOn: gateServiceEnabled(), today: summarize(gateEvents) },
      shortVideo: shortVideoLines(shortRows, day, addDays(day, -1)),
      focus: { running: focus, justDone, todayMin: focusedToday(sessions, day, now) },
      habits: habits.map((habit) => ({ habit, done: doneOn(habitLogs, habit.id, day), pickedAtGate: pickedAtGate.has(habit.id) })),
      challenge,
      reflection: reflections[0]?.text ?? null,
      now,
    };
  });
}
