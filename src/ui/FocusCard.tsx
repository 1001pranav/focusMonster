import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { formatMinutes } from '@/domain/dates';
import { FOCUS_CHOICES } from '@/domain/focus';
import { setTaskStatus } from '@/db/repo';
import { changed } from '@/db/store';
import type { TodayData } from '@/data/hooks';
import { endFocusEarly, startFocus } from '@/services/focus';
import { Button, Card, Chip, Txt } from './components';
import { space } from './theme';

/** Start a focus session on one of today's tasks, watch it run, and close the task when it ends. */
export function FocusCard({ data }: { data: TodayData }) {
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

  const act = (work: Promise<void>) => work.then(changed, (e) => console.warn(e));
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
        <Txt variant="caption" muted>
          Wasted apps stay closed until it ends.
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
      <Txt variant="caption" muted>
        {todayMin >= 1 ? `${formatMinutes(todayMin)} focused today. ` : ''}
        {data.gate.serviceOn ? 'Every wasted app stays closed while it runs.' : 'Turn on the mindful gate in Settings so wasted apps can be closed during a session.'}
      </Txt>
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
              onPress={() => act(startFocus(min, taskId, data.tasks.find((t) => t.id === taskId)?.goalId ?? null))}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}
