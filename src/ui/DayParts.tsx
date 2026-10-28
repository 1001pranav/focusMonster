import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { formatMinutes, startOf } from '@/domain/dates';
import type { TodayData } from '@/data/hooks';
import { Bar, Button, Row, Txt } from './components';
import { space, useTheme } from './theme';

/** The last seven finished days: hit or missed. */
export function Week({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const recent = data.days.slice(-7);
  if (!recent.length) return <Txt muted>Your first finished day shows up here tomorrow.</Txt>;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {recent.map((d) => (
        <View key={d.day} style={{ alignItems: 'center', gap: space.xs }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: d.hit ? colors.goodSoft : colors.overSoft }}>
            <Ionicons name={d.hit ? 'checkmark' : 'remove'} size={18} color={d.hit ? colors.good : colors.over} />
          </View>
          <Txt variant="caption" muted>
            {startOf(d.day).toLocaleDateString(undefined, { weekday: 'narrow' })}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/** Today's top wasted apps, as bars. */
export function TopApps({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const wasted = data.apps.filter((a) => a.tag === 'wasted').slice(0, 5);
  if (!wasted.length) return <Txt muted>Nothing in wasted-time apps yet today.</Txt>;
  const max = wasted[0].minutes;
  return (
    <>
      {wasted.map((a) => (
        <View key={a.packageName} style={{ gap: space.xs, paddingVertical: 2 }}>
          <Row style={{ justifyContent: 'space-between', minHeight: 0 }}>
            <Txt numberOfLines={1} style={{ flex: 1 }}>
              {a.label}
            </Txt>
            <Txt variant="label">{formatMinutes(a.minutes)}</Txt>
          </Row>
          <Bar fraction={a.minutes / max} color={colors.over} />
        </View>
      ))}
      <Button title="Change which apps count" kind="plain" onPress={() => router.push('/apps')} />
    </>
  );
}
