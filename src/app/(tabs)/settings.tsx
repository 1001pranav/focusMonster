import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { hasUsageAccess, openUsageAccessSettings } from '../../../modules/usage-stats';
import { formatMinutes } from '@/domain/dates';
import { loadSettings, saveSettings } from '@/db/repo';
import { changed } from '@/db/store';
import { useLoad } from '@/data/hooks';
import { ensurePermission, scheduleDaily } from '@/services/notifications';
import { Card, Row, Screen, Stepper, Txt } from '@/ui/components';
import { space, useTheme } from '@/ui/theme';

/** Times in 30-minute steps, stored as 'HH:MM'. */
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default function Settings() {
  const { colors } = useTheme();
  const settings = useLoad(loadSettings);
  if (!settings) return <Screen>{null}</Screen>;
  const { plan } = settings;

  const setTime = async (key: 'morningAt' | 'nightAt', min: number) => {
    const next = { ...settings, [key]: toHHMM(min) };
    await saveSettings({ [key]: next[key] });
    if (await ensurePermission()) await scheduleDaily(next.morningAt, next.nightAt);
    changed();
  };

  return (
    <Screen>
      <Txt variant="title">Settings</Txt>
      {plan && (
        <Card>
          <Txt variant="heading">Your plan</Txt>
          <Txt muted>
            Started {plan.startDay} at {formatMinutes(plan.baselineMin)} a day. Target stops at {formatMinutes(plan.floorMin)}.
          </Txt>
          <Txt variant="caption" muted>
            The baseline is fixed on purpose: lowering it later would erase the progress it measures.
          </Txt>
        </Card>
      )}
      <Card>
        <Row onPress={() => router.push('/apps')} style={{ justifyContent: 'space-between' }}>
          <Txt>Wasted-time apps</Txt>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Row>
        <Row onPress={openUsageAccessSettings} style={{ justifyContent: 'space-between' }}>
          <Txt>Usage access</Txt>
          <Txt variant="label" style={{ color: hasUsageAccess() ? colors.good : colors.over }}>
            {hasUsageAccess() ? 'On' : 'Off'}
          </Txt>
        </Row>
      </Card>
      <Card>
        <Txt variant="heading">Morning plan</Txt>
        <Stepper value={toMinutes(settings.morningAt)} onChange={(v) => setTime('morningAt', v)} step={30} min={4 * 60} max={12 * 60} format={toHHMM} />
        <View style={{ height: space.sm }} />
        <Txt variant="heading">Nightly recap</Txt>
        <Stepper value={toMinutes(settings.nightAt)} onChange={(v) => setTime('nightAt', v)} step={30} min={17 * 60} max={23 * 60 + 30} format={toHHMM} />
      </Card>
    </Screen>
  );
}
