import { router } from 'expo-router';
import { REASON_LABELS } from '@/domain/gate';
import { changed } from '@/db/store';
import { useToday } from '@/data/today';
import { setGateWanted } from '@/services/lock';
import { ChallengeCard } from '@/ui/ChallengeCard';
import { Button, Card, ErrorState, LoadingState, Screen, Section, Txt } from '@/ui/components';
import { TopApps, Week } from '@/ui/DayParts';
import { ReflectionCard } from '@/ui/ReflectionCard';

/** Looking back: the week, where the time went, what the gate did, the challenge, tonight's note. */
export default function Progress() {
  const { value: data, error, reload } = useToday();
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : <LoadingState />;
  const gate = data.gate.today;
  const top = gate.reasons[0];
  return (
    <Screen>
      <Txt variant="title">Progress</Txt>

      <Section title="This week" action="Full review" onAction={() => router.push('/review')} />
      <Card>
        <Week data={data} />
      </Card>

      <Section title="Where today's time went" />
      <Card>
        <TopApps data={data} />
      </Card>

      <Section title="Mindful gate today" />
      <Card>
        {!data.gate.wanted ? (
          <>
            <Txt muted>A short pause before wasted apps, asking why. It gets longer as the day's budget runs out.</Txt>
            <Button title="Turn on the gate" kind="secondary" onPress={() => setGateWanted(true).then(changed)} />
          </>
        ) : !gate.shown ? (
          <Txt muted>{data.gate.serviceOn ? "No pauses yet today." : 'Waiting for the Accessibility service (Today → Finish setting up).'}</Txt>
        ) : (
          <>
            <Txt variant="heading">
              Paused you {gate.shown}× · turned back {gate.turnedBack}×
            </Txt>
            {top ? <Txt muted>Most common reason: {REASON_LABELS[top.reason].toLowerCase()} ({top.count}).</Txt> : null}
          </>
        )}
      </Card>

      <Section title="Challenge" />
      <ChallengeCard data={data} />

      <Section title="Tonight" />
      <ReflectionCard data={data} />
    </Screen>
  );
}
