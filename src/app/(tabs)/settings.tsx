import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Switch, View } from 'react-native';
import { hasUsageAccess, openUsageAccessSettings } from '../../../modules/usage-stats';
import { gateServiceEnabled } from '../../../modules/usage-stats/gate';
import { formatMinutes } from '@/domain/dates';
import { timeUntil } from '@/domain/lock';
import { LIMIT_CHOICES, type ShortsPolicy } from '@/domain/shorts';
import { loadSettings, saveSettings } from '@/db/repo';
import { changed } from '@/db/store';
import { useLoad } from '@/data/hooks';
import { setGateWanted } from '@/services/lock';
import { setShortsPolicy } from '@/services/shorts';
import { ensurePermission } from '@/services/notifications';
import { Card, Chip, Row, Screen, Stepper, Txt } from '@/ui/components';
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
    await ensurePermission();
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
      <ShortsSettings policy={settings.shorts} next={settings.pending.shortsNext ?? null} serviceOn={serviceOn} now={now} />
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

const MODES: { mode: ShortsPolicy['mode']; label: string }[] = [
  { mode: 'count', label: 'Just count' },
  { mode: 'pause', label: 'Pause me' },
  { mode: 'block', label: 'Block' },
];

/** Reels/Shorts policy. Stricter choices apply at once; gentler ones wait 24 hours. */
function ShortsSettings({ policy, next, serviceOn, now }: { policy: ShortsPolicy; next: (ShortsPolicy & { at: number }) | null; serviceOn: boolean; now: number }) {
  const shown = next ?? policy;
  const choose = (p: ShortsPolicy) => setShortsPolicy(p).then(changed);
  const describe = (p: ShortsPolicy) =>
    p.mode === 'count' ? 'counting only' : p.mode === 'pause' ? `a pause every ${p.limit} videos` : 'the player blocked';
  return (
    <>
      <Card>
        <Txt variant="heading">Reels and Shorts</Txt>
        <Txt variant="caption" muted>
          The rest of Instagram and YouTube stays open: messages, search, your feed, long videos.
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {MODES.map((m) => (
            <Chip key={m.mode} label={m.label} selected={shown.mode === m.mode} onPress={() => choose({ mode: m.mode, limit: m.mode === 'pause' ? (shown.mode === 'pause' ? shown.limit : 20) : 0 })} />
          ))}
        </View>
        {shown.mode === 'pause' ? (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Txt variant="caption" muted>
              Every
            </Txt>
            {LIMIT_CHOICES.map((n) => (
              <Chip key={n} label={`${n}`} selected={shown.limit === n} onPress={() => choose({ mode: 'pause', limit: n })} />
            ))}
            <Txt variant="caption" muted>
              videos
            </Txt>
          </View>
        ) : null}
        {next ? (
          <Txt variant="caption" muted>
            Still {describe(policy)} until the change starts {timeUntil(next.at, now)}. Pick the current setting again to cancel.
          </Txt>
        ) : null}
      </Card>
      {!serviceOn ? <GateSetup /> : null}
    </>
  );
}
