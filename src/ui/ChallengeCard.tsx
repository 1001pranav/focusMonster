import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { endChallenge } from '@/db/repo';
import { changed } from '@/db/store';
import type { TodayData } from '@/data/hooks';
import { Button, Card, Txt } from './components';
import { space, useTheme } from './theme';

/** The running challenge with a dot per day, or an invitation to start one. */
export function ChallengeCard({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const active = data.challenge;
  if (!active || active.progress.status === 'ended') {
    return (
      <Card>
        <Txt variant="heading">Try a challenge</Txt>
        <Txt muted>A week with one clear rule, measured from your phone, not ticked off by hand.</Txt>
        <Button title="Pick a challenge" kind="secondary" onPress={() => router.push('/challenges')} />
      </Card>
    );
  }
  const { def, progress, challenge } = active;
  const finished = progress.status === 'won' || progress.status === 'lost';
  return (
    <Card tone={progress.status === 'won' ? 'good' : undefined}>
      <Txt variant="caption" muted>
        {progress.status === 'upcoming' ? `CHALLENGE · STARTS ${challenge.startDay}` : progress.status === 'won' ? 'CHALLENGE WON' : progress.status === 'lost' ? 'CHALLENGE OVER' : 'CHALLENGE'}
      </Txt>
      <Txt variant="heading">{def.title}</Txt>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {progress.results.map((r, i) => (
          <View key={i} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: r === true ? colors.goodSoft : r === false ? colors.overSoft : colors.surfaceAlt }}>
            {r !== null ? <Ionicons name={r ? 'checkmark' : 'close'} size={16} color={r ? colors.good : colors.over} /> : null}
          </View>
        ))}
      </View>
      <Txt variant="caption" muted>
        {progress.status === 'won'
          ? `${progress.passed} of ${def.days} days. That habit is yours now.`
          : progress.status === 'lost'
            ? `${progress.passed} of ${def.required} needed. The rule was hard; try it again or pick another.`
            : `${progress.passed} of ${def.required} needed so far. ${def.description}`}
      </Txt>
      {finished ? (
        <Button title="Pick the next one" kind="secondary" onPress={() => router.push('/challenges')} />
      ) : (
        <Button title="Give up" kind="plain" onPress={() => endChallenge(challenge.id).then(changed)} />
      )}
    </Card>
  );
}
