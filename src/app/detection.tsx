import { Share, View } from 'react-native';
import { detectionInfo, gateServiceEnabled, type DetectionApp } from '../../modules/usage-stats/gate';
import { SHORT_VIDEO_APPS } from '@/domain/shorts';
import { useLoad } from '@/data/hooks';
import { Button, Card, Screen, Txt } from '@/ui/components';
import { space, useTheme } from '@/ui/theme';

const time = (ms?: number) => (ms ? new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'never');

/**
 * What Reels/Shorts detection saw today. When Instagram or YouTube renames its player in an update,
 * the scroll ids here show the new name, so the fix is a one-line change instead of a guess.
 */
export default function Detection() {
  const { colors } = useTheme();
  const info = useLoad(async () => ({ serviceOn: gateServiceEnabled(), ...detectionInfo() }));
  if (!info) return <Screen>{null}</Screen>;

  const report = () =>
    Share.share({
      message: [`FocusMonster detection check (${info.day ?? 'today'})`, `Accessibility service: ${info.serviceOn ? 'on' : 'off'}`, JSON.stringify(info.apps ?? {}, null, 2)].join('\n'),
    });

  return (
    <Screen>
      <Txt variant="title">Detection check</Txt>
      <Txt muted>What the Reels and Shorts counter saw today. It records only the apps' internal names for the parts of the screen you scrolled, never what was on it.</Txt>
      <Card tone={info.serviceOn ? undefined : 'over'}>
        <Txt variant="heading">Accessibility service: {info.serviceOn ? 'on' : 'off'}</Txt>
        {!info.serviceOn ? <Txt>Nothing can be counted until it's on (Settings → Mindful gate).</Txt> : null}
      </Card>
      {Object.entries(SHORT_VIDEO_APPS).map(([pkg, label]) => {
        const app: DetectionApp = info.apps?.[pkg] ?? {};
        const verdict = !app.opened
          ? `Not opened today (or not seen by the service).`
          : !app.playerSeen
            ? `Opened ${app.opened}×, but the ${label} player was never recognised. If you watched ${label}, its name has changed: send this report.`
            : `Working: the ${label} player was recognised ${app.playerSeen}×, last at ${time(app.lastPlayerSeen)}.`;
        return (
          <Card key={pkg}>
            <Txt variant="heading">{label === 'Reels' ? 'Instagram' : 'YouTube'}</Txt>
            <Txt style={{ color: app.opened && !app.playerSeen ? colors.over : colors.text }}>{verdict}</Txt>
            {app.scrolls?.length ? (
              <View style={{ gap: space.xs }}>
                <Txt variant="caption" muted>
                  RECENT SCROLLS (scrolled view {'<'} its parents)
                </Txt>
                {app.scrolls
                  .slice()
                  .reverse()
                  .map((c) => (
                    <Txt key={c} variant="caption" style={{ fontFamily: 'monospace' }}>
                      {c}
                    </Txt>
                  ))}
              </View>
            ) : null}
          </Card>
        );
      })}
      <Button title="Send report" icon="share-outline" onPress={() => report().catch(() => {})} />
    </Screen>
  );
}
