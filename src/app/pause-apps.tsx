import { useState } from 'react';
import { Switch, View } from 'react-native';
import { canResumeItself } from '../../modules/usage-stats/gate';
import { looksLikeMoney } from '@/domain/apps';
import { loadSettings, saveSettings } from '@/db/repo';
import { changed } from '@/db/store';
import { useLoad } from '@/data/hooks';
import { useAppList } from '@/ui/AppTagList';
import { BackBar, Card, LoadingState, Row, Screen, Section, Txt } from '@/ui/components';
import { space, useTheme } from '@/ui/theme';

/** Instagram and YouTube are counted even when not tagged as wasted, so they can't be listed either. */
const NEVER = new Set(['com.instagram.android', 'com.google.android.youtube']);
const GRANT = 'adb shell pm grant com.focusmonster.app android.permission.WRITE_SECURE_SETTINGS';

/** Apps (mostly banks) that won't open while an accessibility service is on: FocusMonster turns off for them. */
export default function PauseApps() {
  const { colors } = useTheme();
  const list = useAppList();
  const loaded = useLoad(async () => ({ settings: await loadSettings(), resumes: canResumeItself() }));
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  if (!list || !loaded) return <LoadingState label="Loading your apps…" />;

  const { resumes } = loaded;
  const picked = chosen ?? new Set(loaded.settings.pauseApps);
  // Gated apps can't be listed: that would be a way around the gate.
  const apps = list.apps
    .filter((a) => list.tags[a.packageName] !== 'wasted' && !NEVER.has(a.packageName))
    .map((a) => ({ ...a, money: looksLikeMoney(a.packageName, a.label) }))
    .sort((a, b) => Number(b.money) - Number(a.money) || a.label.localeCompare(b.label));

  const toggle = (pkg: string, on: boolean) => {
    const next = new Set(picked);
    if (on) next.add(pkg);
    else next.delete(pkg);
    setChosen(next);
    saveSettings({ pauseApps: [...next] }).then(changed, (e) => console.warn(e));
  };

  return (
    <Screen>
      <BackBar title="Settings" />
      <Txt variant="title">Apps that turn FocusMonster off</Txt>
      <Txt muted>
        Some banking and UPI apps refuse to open while any accessibility service is on, not just FocusMonster's. Pick them here: when one opens, FocusMonster switches its service off. Apps you marked as wasted time can't be picked.
      </Txt>

      {resumes ? (
        <Card tone="good">
          <Txt variant="heading">Turns back on by itself</Txt>
          <Txt>About 45 seconds after you leave the app, or at once if you open a wasted-time app.</Txt>
          <Txt variant="caption" muted>
            Some banks check before FocusMonster has switched off and still show their warning the first time. Close the bank and open it again within a minute: it opens normally.
          </Txt>
        </Card>
      ) : (
        <Card tone="primary">
          <Txt variant="heading">One-time setup to turn back on by itself</Txt>
          <Txt>
            Android lets an app turn its own accessibility service off, but not back on. Without this step FocusMonster still switches off for these apps, and a notification takes you straight to its switch to turn it back on.
          </Txt>
          <Txt>To have it come back on by itself, connect the phone to a computer with USB debugging on and run this once:</Txt>
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: space.md }}>
            <Txt selectable style={{ fontFamily: 'monospace', fontSize: 13 }}>
              {GRANT}
            </Txt>
          </View>
          <Txt variant="caption" muted>
            It survives updates and restarts, until FocusMonster is uninstalled. On Xiaomi phones, also turn on &quot;USB debugging (Security settings)&quot; first. Come back to this screen afterwards to check.
          </Txt>
        </Card>
      )}

      <Section title="Your apps" meta={picked.size ? `${picked.size} picked` : undefined} />
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        {apps.map((a, i) => (
          <View key={a.packageName} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <Row style={{ paddingVertical: space.xs }}>
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1}>{a.label}</Txt>
                {a.money ? (
                  <Txt variant="caption" muted>
                    Banking or payments
                  </Txt>
                ) : null}
              </View>
              <Switch
                accessibilityLabel={`Turn FocusMonster off for ${a.label}`}
                value={picked.has(a.packageName)}
                onValueChange={(on) => toggle(a.packageName, on)}
                trackColor={{ true: colors.primary, false: colors.track }}
              />
            </Row>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
