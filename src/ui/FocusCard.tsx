import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { formatMinutes } from '@/domain/dates';
import { FOCUS_CHOICES } from '@/domain/focus';
import { setTaskStatus } from '@/db/repo';
import { changed } from '@/db/store';
import type { TodayData } from '@/data/hooks';
import { endFocusEarly, startFocus } from '@/services/focus';
import { Button, Card, Chip, Txt } from './components';
import { space, useTheme } from './theme';

/** Start a focus session on one of today's tasks, watch it run, and close the task when it ends. */
export function FocusCard({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const { running, justDone, todayMin } = data.focus;
  const [now, setNow] = useState(data.now);
  const [taskId, setTaskId] = useState<string | null>(null);
  const openTasks = data.tasks.filter((t) => t.day === data.day && t.status === 'todo');

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      setNow(Date.now());
      // Reload when it ends, so the card and the gate's config move on.
      if (Date.now() >= running.plannedEnd) changed();
    }, 15000);
    return () => clearInterval(tick);
  }, [running]);

  // Failures are shown, not just logged: a tap that silently does nothing is the worst outcome.
  const act = (work: Promise<void>) => work.then(changed, (e) => Alert.alert("That didn't work", e instanceof Error ? e.message : String(e)));
  const start = (min: number) => {
    const go = () => act(startFocus(min, taskId, data.tasks.find((t) => t.id === taskId)?.goalId ?? null));
    if (data.gate.serviceOn) return go();
    Alert.alert(
      "Apps can't be closed yet",
      "The mindful gate's Accessibility service is off, so the timer would run but Instagram and the rest stay open. Set it up in Settings first.",
      [
        { text: 'Set it up', onPress: () => router.push('/settings') },
        { text: 'Start anyway', style: 'destructive', onPress: go },
      ],
    );
  };
  const taskTitle = (id: string | null) => data.tasks.find((t) => t.id === id)?.title;

  if (running) {
    const left = Math.max(1, (running.plannedEnd - Math.max(now, data.now)) / 60000);
    return (
      <Card tone="primary">
        <Txt variant="caption" muted>
          FOCUS SESSION
        </Txt>
        <Txt variant="title">{formatMinutes(left)} left</Txt>
        {taskTitle(running.taskId) ? <Txt>{taskTitle(running.taskId)}</Txt> : null}
        <Txt variant="caption" style={data.gate.serviceOn ? undefined : { color: colors.over }}>
          {data.gate.serviceOn ? 'Wasted apps stay closed until it ends.' : "⚠ Apps aren't being closed: the Accessibility service is off."}
        </Txt>
        <Button
          title="End early"
          kind="plain"
          onPress={() =>
            Alert.alert('End the session early?', 'The minutes so far still count.', [
              { text: 'Keep going', style: 'cancel' },
              { text: 'End it', style: 'destructive', onPress: () => act(endFocusEarly()) },
            ])
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      {justDone && taskTitle(justDone.taskId) ? (
        <View style={{ gap: space.sm, paddingBottom: space.sm }}>
          <Txt variant="heading">Session done. Did you finish “{taskTitle(justDone.taskId)}”?</Txt>
          <Button title="Mark it done" onPress={() => act(setTaskStatus(justDone.taskId!, 'done'))} />
        </View>
      ) : (
        <Txt variant="heading">Focus session</Txt>
      )}
      {todayMin >= 1 ? (
        <Txt variant="caption" muted>
          {formatMinutes(todayMin)} focused today.
        </Txt>
      ) : null}
      {data.gate.serviceOn ? (
        <Txt variant="caption" muted>
          Every wasted app stays closed while it runs.
        </Txt>
      ) : (
        <Txt variant="caption" style={{ color: colors.over }}>
          ⚠ The Accessibility service is off, so a session can't close any app yet.
        </Txt>
      )}
      {openTasks.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {openTasks.map((t) => (
            <Chip key={t.id} label={t.title} selected={taskId === t.id} onPress={() => setTaskId(taskId === t.id ? null : t.id)} />
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {FOCUS_CHOICES.map((min) => (
          <View key={min} style={{ flex: 1 }}>
            <Button
              title={`${min} min`}
              kind={min === FOCUS_CHOICES[0] ? 'primary' : 'secondary'}
              onPress={() => start(min)}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}
