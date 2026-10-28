import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { addDays, formatMinutes, startOf, today } from '@/domain/dates';
import { weeklyFocusByGoal } from '@/domain/focus';
import { MAX_GOALS } from '@/domain/tasks';
import { loadFocusSessions, loadGoals, loadTasks } from '@/db/repo';
import { useLoadResult } from '@/data/hooks';
import { useToday } from '@/data/today';
import { Button, Card, ErrorState, LoadingState, Row, Screen, Section, Txt } from '@/ui/components';
import { HabitsCard } from '@/ui/HabitsCard';
import { space, useTheme } from '@/ui/theme';

/** What the won-back time is for: up to three goals, and the habits that replace scrolling. */
export default function Goals() {
  const { colors } = useTheme();
  const todayData = useToday().value;
  const { value: goals, error, reload } = useLoadResult(async () => {
    const weekStart = addDays(today(), -6);
    const [all, tasks, sessions] = await Promise.all([loadGoals(), loadTasks(weekStart), loadFocusSessions(startOf(weekStart).getTime())]);
    const doneThisWeek = (id: string) => tasks.filter((t) => t.goalId === id && t.status === 'done' && t.day >= weekStart).length;
    const focus = weeklyFocusByGoal(sessions, tasks, today(), Date.now());
    return all.map((g) => ({ ...g, done: doneThisWeek(g.id), focusMin: focus[g.id] ?? 0 }));
  });
  if (!goals) return error ? <ErrorState error={error} onRetry={reload} /> : <LoadingState />;

  return (
    <Screen>
      <Txt variant="title">Goals</Txt>
      <Section title="What the time is for" meta={`${goals.length} of ${MAX_GOALS}`} />
      {!goals.length ? (
        <Card>
          <Txt muted>Name what you'd rather do with the time you win back. Keep at least one away from screens.</Txt>
        </Card>
      ) : null}
      {goals.map((g) => (
        <Card key={g.id}>
          <Row onPress={() => router.push({ pathname: '/goal/[id]', params: { id: g.id } })} style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: space.xs }}>
              <Txt variant="heading">{g.title}</Txt>
              {g.why ? <Txt muted>“{g.why}”</Txt> : null}
              <Txt variant="caption" style={{ color: colors.primary }}>
                {g.done} tasks done{g.focusMin >= 1 ? ` · ${formatMinutes(g.focusMin)} focused` : ''} this week
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Row>
        </Card>
      ))}
      {goals.length < MAX_GOALS ? (
        <Button title="Add a goal" icon="add" kind={goals.length ? 'secondary' : 'primary'} onPress={() => router.push({ pathname: '/goal/[id]', params: { id: 'new' } })} />
      ) : null}

      <Section title="Instead of scrolling" />
      {todayData ? <HabitsCard data={todayData} /> : null}
    </Screen>
  );
}
