import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, View } from 'react-native';
import { openUsageAccessSettings } from '../../modules/usage-stats';
import { openAccessibilitySettings, openAppDetails } from '../../modules/usage-stats/gate';
import { changed } from '@/db/store';
import type { TodayData } from '@/data/hooks';
import { setGateWanted } from '@/services/lock';
import { ensurePermission } from '@/services/notifications';
import { Button, Card, Txt } from './components';
import { space, useTheme } from './theme';

interface Step {
  done: boolean;
  title: string;
  why: string;
  action?: { title: string; run: () => void };
  /** Extra help shown under the step while it's open. */
  help?: { text: string; action: { title: string; run: () => void } };
}

/**
 * Everything the app needs switched on, as one checklist with a count. Hidden once all is done.
 * One place instead of a warning per card.
 */
export function SetupCard({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const restricted = Platform.OS === 'android' && Number(Platform.Version) >= 33;
  const steps: Step[] = [
    {
      done: data.setup.usageAccess,
      title: 'Usage access',
      why: 'To see how long each app is open.',
      action: { title: 'Open usage access', run: openUsageAccessSettings },
    },
    {
      done: data.gate.wanted && data.gate.serviceOn,
      title: 'Accessibility service',
      why: 'For the gate, focus sessions, bedtime and the Reels counter. It only watches the apps you marked as wasted time.',
      action: data.gate.wanted
        ? { title: 'Open Accessibility', run: openAccessibilitySettings }
        : { title: 'Turn on', run: () => setGateWanted(true).then(changed) },
      help:
        data.gate.wanted && restricted
          ? { text: 'Says "Restricted setting"? App info → ⋮ (top right) → Allow restricted settings, then try again.', action: { title: 'Open App info', run: openAppDetails } }
          : undefined,
    },
    {
      done: data.setup.notifications,
      title: 'Notifications',
      why: 'For the morning plan, the nightly recap and budget warnings.',
      action: {
        title: 'Allow',
        run: () => ensurePermission().then((ok) => (ok ? changed() : Linking.openSettings())),
      },
    },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.findIndex((s) => !s.done);

  return (
    <Card tone="primary">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="heading">Finish setting up</Txt>
        <Txt variant="label" muted>
          {done} of {steps.length}
        </Txt>
      </View>
      {steps.map((s, i) => (
        <View key={s.title} style={{ flexDirection: 'row', gap: space.md, paddingTop: space.xs }}>
          <Ionicons name={s.done ? 'checkmark-circle' : i === next ? 'radio-button-on' : 'ellipse-outline'} size={22} color={s.done ? colors.good : i === next ? colors.primary : colors.textMuted} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt variant="label" style={s.done ? { color: colors.textMuted, textDecorationLine: 'line-through' } : { fontSize: 15 }}>
              {s.title}
            </Txt>
            {!s.done && i === next ? (
              <>
                <Txt variant="caption" muted>
                  {s.why}
                </Txt>
                {s.action ? <Button title={s.action.title} onPress={s.action.run} /> : null}
                {s.help ? (
                  <>
                    <Txt variant="caption" muted>
                      {s.help.text}
                    </Txt>
                    <Button title={s.help.action.title} kind="secondary" onPress={s.help.action.run} />
                  </>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}
