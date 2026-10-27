import { router } from 'expo-router';
import { addDays, today } from '@/domain/dates';
import { MAX_GOALS } from '@/domain/tasks';
import { loadGoals, loadTasks } from '@/db/repo';
import { useLoad } from '@/data/hooks';
import { Button, Card, Row, Screen, Txt } from '@/ui/components';

export default function Goals() {
  const data = useLoad(async () => {
    const [goals, tasks] = await Promise.all([loadGoals(), loadTasks(addDays(today(), -6))]);
    const weekStart = addDays(today(), -6);
    const doneThisWeek = (id: string) => tasks.filter((t) => t.goalId === id && t.status === 'done' && t.day >= weekStart).length;
    return goals.map((g) => ({ ...g, done: doneThisWeek(g.id) }));
  });
  if (!data) return <Screen>{null}</Screen>;
  return (
    <Screen>
      <Txt variant="title">Goals</Txt>
      <Txt muted>Up to {MAX_GOALS}. With ten goals, none of them matter. Keep at least one away from screens.</Txt>
      {data.map((g) => (
        <Card key={g.id}>
          <Row onPress={() => router.push({ pathname: '/goal/[id]', params: { id: g.id } })} style={{ justifyContent: 'space-between' }}>
            <Txt variant="heading" style={{ flex: 1 }}>
              {g.title}
            </Txt>
            <Txt variant="label" muted>
              {g.done} done this week
            </Txt>
          </Row>
          {g.why ? <Txt muted>“{g.why}”</Txt> : null}
        </Card>
      ))}
      {data.length < MAX_GOALS ? (
        <Button title="Add a goal" icon="add" kind={data.length ? 'secondary' : 'primary'} onPress={() => router.push({ pathname: '/goal/[id]', params: { id: 'new' } })} />
      ) : null}
    </Screen>
  );
}
