import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Switch, View } from 'react-native';
import { hasUsageAccess, openUsageAccessSettings } from '../../../modules/usage-stats';
import { canResumeItself, gateServiceEnabled, openAccessibilitySettings } from '../../../modules/usage-stats/gate';
import { formatMinutes, startOf } from '@/domain/dates';
import { timeUntil } from '@/domain/lock';
import { LIMIT_CHOICES, type ShortsPolicy } from '@/domain/shorts';
import { hhmmOf, minuteOf, MORNING_FREE_CHOICES, opensAt, type Bedtime } from '@/domain/bedtime';
import { loadSettings, saveSettings } from '@/db/repo';
import { changed } from '@/db/store';
import { useLoadResult } from '@/data/hooks';
import { setBedtime, setGateWanted, setOverlayWanted } from '@/services/lock';
import { setShortsPolicy } from '@/services/shorts';
import { ensurePermission } from '@/services/notifications';
import { pauseForBanking, PAUSE_MIN } from '@/services/gate';
import { Card, Chip, ErrorState, LoadingState, Row, Screen, Section, Stepper, Txt } from '@/ui/components';
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
  const { value: loaded, error, reload } = useLoadResult(async () => ({ settings: await loadSettings(), serviceOn: gateServiceEnabled(), resumes: canResumeItself(), usageAccess: hasUsageAccess(), now: Date.now() }));
  if (!loaded) return error ? <ErrorState error={error} onRetry={reload} /> : <LoadingState />;
  const { settings, serviceOn, resumes, usageAccess, now } = loaded;
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

  const pause = () =>
    Alert.alert(
      `Pause for ${PAUSE_MIN} minutes?`,
      resumes
        ? `Some banking and UPI apps won't open while any accessibility service is on. This turns FocusMonster's off: the gate, focus blocking and the Reels counter stop, and come back on by themselves after ${PAUSE_MIN} minutes.`
        : "Some banking and UPI apps won't open while any accessibility service is on. This turns FocusMonster's off: the gate, focus blocking and the Reels counter stop until you turn it back on in Accessibility. You'll get a reminder.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          onPress: () =>
            pauseForBanking().then((result) => {
              if (result === 'off') Alert.alert('Nothing to pause', "The Accessibility service isn't on right now.");
              changed();
            }),
        },
      ],
    );

  const gateStatus = !settings.gateEnabled
    ? 'Off'
    : offAt !== null
      ? `Still on, turns off ${timeUntil(offAt, now)}. Switch on to keep it.`
      : serviceOn
        ? 'On: wasted apps open after a short pause'
        : 'Waiting for the Accessibility service';

  const setTime = async (key: 'morningAt' | 'nightAt', min: number) => {
    await saveSettings({ [key]: toHHMM(min) });
    await ensurePermission();
    changed();
  };

  const status = (on: boolean) => (
    <Txt variant="label" style={{ color: on ? colors.good : colors.over }}>
      {on ? 'On' : 'Off'}
    </Txt>
  );

  return (
    <Screen>
      <Txt variant="title">Settings</Txt>

      <Section title="Protection" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="heading">Mindful gate</Txt>
            <Txt variant="caption" muted>
              {gateStatus}
            </Txt>
          </View>
          <Switch accessibilityLabel="Mindful gate" value={gateOn} onValueChange={toggleGate} trackColor={{ true: colors.primary, false: colors.track }} />
        </Row>
        <Txt variant="caption" muted>
          It only watches the apps you marked as wasted time, plus Instagram and YouTube for counting, and the apps it turns off for. Every other app is never watched.
        </Txt>
        <Row onPress={() => router.push('/pause-apps')} style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt>Apps that turn FocusMonster off</Txt>
            <Txt variant="caption" muted>
              {settings.pauseApps.length
                ? `${settings.pauseApps.length} ${settings.pauseApps.length === 1 ? 'app' : 'apps'} · ${resumes ? 'turns back on by itself' : 'you turn it back on'}`
                : 'For banks that refuse to open while it runs'}
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Row>
        {serviceOn ? (
          <Row onPress={pause} style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt>Some other app won't open?</Txt>
              <Txt variant="caption" muted>
                Pause for {PAUSE_MIN} minutes
              </Txt>
            </View>
            <Ionicons name="pause-circle-outline" size={24} color={colors.primary} />
          </Row>
        ) : null}
      </Card>
      {!serviceOn ? <GateSetup /> : null}
      <ShortsSettings policy={settings.shorts} next={settings.pending.shortsNext ?? null} now={now} overlay={settings.shortsOverlay} overlayOffAt={settings.pending.overlayOffAt ?? null} />
      <BedtimeSettings bedtime={settings.bedtime} next={settings.pending.bedtimeNext ?? null} now={now} />

      <Section title="Your plan" />
      <Card>
        {plan ? (
          <>
            <Txt>
              Started {startOf(plan.startDay).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} at {formatMinutes(plan.baselineMin)} a day. The target stops dropping at {formatMinutes(plan.floorMin)}.
            </Txt>
            <Txt variant="caption" muted>
              The baseline is fixed on purpose: lowering it later would erase the progress it measures.
            </Txt>
          </>
        ) : null}
        <Row onPress={() => router.push('/apps')} style={{ justifyContent: 'space-between' }}>
          <Txt>Wasted-time apps</Txt>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Row>
      </Card>

      <Section title="Notifications" />
      <Card>
        <Txt variant="label">Morning plan</Txt>
        <Stepper value={toMinutes(settings.morningAt)} onChange={(v) => setTime('morningAt', v)} step={30} min={4 * 60} max={12 * 60} format={toHHMM} />
        <View style={{ height: space.sm }} />
        <Txt variant="label">Nightly recap</Txt>
        <Stepper value={toMinutes(settings.nightAt)} onChange={(v) => setTime('nightAt', v)} step={30} min={17 * 60} max={23 * 60 + 30} format={toHHMM} />
      </Card>

      <Section title="Permissions and help" />
      <Card>
        <Row onPress={openUsageAccessSettings} style={{ justifyContent: 'space-between' }}>
          <Txt>Usage access</Txt>
          {status(usageAccess)}
        </Row>
        <Row onPress={openAccessibilitySettings} style={{ justifyContent: 'space-between' }}>
          <Txt>Accessibility service</Txt>
          {status(serviceOn)}
        </Row>
        <Row onPress={() => router.push('/detection')} style={{ justifyContent: 'space-between' }}>
          <Txt>Reels and Shorts detection check</Txt>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Row>
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
function ShortsSettings({ policy, next, now, overlay, overlayOffAt }: { policy: ShortsPolicy; next: (ShortsPolicy & { at: number }) | null; now: number; overlay: boolean; overlayOffAt: number | null }) {
  const { colors } = useTheme();
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
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt>Live counter</Txt>
            <Txt variant="caption" muted>
              {!overlay ? 'Off' : overlayOffAt !== null ? `Turns off ${timeUntil(overlayOffAt, now)}. Switch on to keep it.` : 'A small count at the top while you watch'}
            </Txt>
          </View>
          <Switch
            accessibilityLabel="Live counter"
            value={overlay && overlayOffAt === null}
            onValueChange={(on) => setOverlayWanted(on).then(changed)}
            trackColor={{ true: colors.primary, false: colors.track }}
          />
        </Row>
        {next ? (
          <Txt variant="caption" muted>
            Still {describe(policy)} until the change starts {timeUntil(next.at, now)}. Pick the current setting again to cancel.
          </Txt>
        ) : null}
      </Card>
    </>
  );
}

/** Bedtime start runs 19:00 to 02:00 (stored modulo a day), wake-up 04:00 to 11:00. */
const START_MIN = 19 * 60;
const START_MAX = 26 * 60;
const toStartValue = (hhmm: string) => {
  const m = minuteOf(hhmm);
  return m < START_MIN ? m + 24 * 60 : m;
};

function BedtimeSettings({ bedtime, next, now }: { bedtime: Bedtime; next: (Bedtime & { at: number }) | null; now: number }) {
  const { colors } = useTheme();
  const shown = next ?? bedtime;
  const set = (patch: Partial<Bedtime>) => setBedtime({ enabled: shown.enabled, start: shown.start, end: shown.end, morningFreeMin: shown.morningFreeMin, ...patch }).then(changed);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt variant="heading">Bedtime</Txt>
          <Txt variant="caption" muted>
            {shown.enabled ? `Wasted apps closed ${shown.start} to ${opensAt(shown)}` : 'Off'}
          </Txt>
        </View>
        <Switch accessibilityLabel="Bedtime" value={shown.enabled} onValueChange={(enabled) => set({ enabled })} trackColor={{ true: colors.primary, false: colors.track }} />
      </Row>
      {shown.enabled ? (
        <>
          <Txt variant="label">Starts</Txt>
          <Stepper value={toStartValue(shown.start)} onChange={(v) => set({ start: hhmmOf(v) })} step={30} min={START_MIN} max={START_MAX} format={hhmmOf} />
          <Txt variant="label">Wake up</Txt>
          <Stepper value={minuteOf(shown.end)} onChange={(v) => set({ end: hhmmOf(v) })} step={30} min={4 * 60} max={11 * 60} format={hhmmOf} />
          <Txt variant="label">Phone-free after waking</Txt>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {MORNING_FREE_CHOICES.map((m) => (
              <Chip key={m} label={m ? `${m} min` : 'None'} selected={shown.morningFreeMin === m} onPress={() => set({ morningFreeMin: m })} />
            ))}
          </View>
        </>
      ) : null}
      {next ? (
        <Txt variant="caption" muted>
          This frees time that bedtime covers now, so it starts {timeUntil(next.at, now)}. Until then: {bedtime.enabled ? `${bedtime.start} to ${opensAt(bedtime)}` : 'off'}.
        </Txt>
      ) : null}
    </Card>
  );
}
