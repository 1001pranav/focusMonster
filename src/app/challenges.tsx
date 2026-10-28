import { router } from 'expo-router';
import { CHALLENGES } from '@/domain/challenges';
import { today } from '@/domain/dates';
import { changed } from '@/db/store';
import { startChallenge } from '@/services/challenges';
import { BackBar, Button, Card, Screen, Txt } from '@/ui/components';

export default function Challenges() {
  const start = async (type: string) => {
    await startChallenge(type, today());
    changed();
    router.back();
  };
  return (
    <Screen>
      <BackBar />
      <Txt variant="title">Challenges</Txt>
      <Txt muted>One at a time. Each is checked against your phone's own usage data, so it can't be fudged. Starting one ends the current one.</Txt>
      {CHALLENGES.map((c) => (
        <Card key={c.type}>
          <Txt variant="heading">{c.title}</Txt>
          <Txt muted>{c.description}</Txt>
          <Button title={c.startsOn === 'saturday' ? 'Start this weekend' : 'Start today'} kind="secondary" onPress={() => start(c.type)} />
        </Card>
      ))}
    </Screen>
  );
}
