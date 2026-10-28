import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Switch, View } from 'react-native';
import { hasUsageAccess, openUsageAccessSettings } from '../../../modules/usage-stats';
import { gateServiceEnabled } from '../../../modules/usage-stats/gate';
import { formatMinutes } from '@/domain/dates';
import { timeUntil } from '@/domain/lock';
import { loadSettings, saveSettings } from '@/db/repo';
import { changed } from '@/db/store';
import { useLoad } from '@/data/hooks';
import { setGateWanted } from '@/services/lock';
import { ensurePermission, scheduleDaily } from '@/services/notifications';
import { Card, Row, Screen, Stepper, Txt } from '@/ui/components';
import { GateSetup } from '@/ui/GateSetup';
import { space, useTheme } from '@/ui/theme';

/** Times in 30-minute steps, stored as 'HH:MM'. */
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default function Settings() {
  const { colors } = useTheme();
  const loaded = useLoad(async () => ({ settings: await loadSettings(), serviceOn: gateServiceEnabled(), now: Date.now() }));
  if (!loaded) return <Screen>{null}</Screen>;
  const { settings, serviceOn, now } = loaded;
  const { plan } = settings;
  const offAt = settings.pending.gateOffAt;
  const gateOn = settings.gateEnabled && offAt === null;

  const toggleGate = (on: boolean) => {
    if (on) return setGateWanted(true).then(changed);
    Alert.alert('Turn off the mindful gate?', 'It stays on for 24 more hours, so the decision is made by your rested self, not a tired one. You can cancel any time before then.', [
      { text: 'Keep it on', style: 'cancel' },
      { text: 'Turn off in 24h', style: 'destructive', onPress: () => setGateWanted(false).then(changed) },
    ]);
  };

  const gateStatus = !settings.gateEnabled
    ? 'Off'
    : offAt !== null
      ? `Still on, turns off ${timeUntil(offAt, now)}. Switch on to keep it.`
      : serviceOn
        ? 'On: wasted apps open after a short pause'
        : 'Waiting for Accessibility to be turned on';

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
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="heading">Mindful gate</Txt>
            <Txt variant="caption" muted>
              {gateStatus}
            </Txt>
          </View>
          <Switch
            accessibilityLabel="Mindful gate"
            value={gateOn}
            onValueChange={toggleGate}
            trackColor={{ true: colors.primary, false: colors.track }}
          />
        </Row>
      </Card>
      {settings.gateEnabled && !serviceOn ? <GateSetup /> : null}
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
