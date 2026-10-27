import { Switch, View } from 'react-native';
import { launcherApps, type LauncherApp } from '../../modules/usage-stats';
import { defaultTag, type AppTag } from '@/domain/apps';
import { addDays, formatMinutes, today } from '@/domain/dates';
import { loadDailyUsage, loadTags } from '@/db/repo';
import { useLoad } from '@/data/hooks';
import { syncFinishedDays } from '@/services/usage';
import { Card, Row, Txt } from './components';
import { space, useTheme } from './theme';

export interface ListedApp extends LauncherApp {
  /** Average minutes a day over the past week. */
  avgMin: number;
}

/** Launcher apps, most used first, with the saved tag or the default for each. */
export function useAppList(): { apps: ListedApp[]; tags: Record<string, AppTag> } | null {
  return useLoad(async () => {
    await syncFinishedDays();
    const [apps, stored, usage] = await Promise.all([launcherApps(), loadTags(), loadDailyUsage(addDays(today(), -7))]);
    const days = Math.max(1, Object.keys(usage).length);
    const total: Record<string, number> = {};
    for (const day of Object.values(usage)) for (const [pkg, ms] of Object.entries(day)) total[pkg] = (total[pkg] ?? 0) + ms;
    const listed = apps.map((a) => ({ ...a, avgMin: (total[a.packageName] ?? 0) / days / 60000 })).sort((a, b) => b.avgMin - a.avgMin);
    const tags = Object.fromEntries(listed.map((a) => [a.packageName, stored[a.packageName] ?? defaultTag(a.packageName)]));
    return { apps: listed, tags };
  });
}

export function AppTagList({ apps, tags, onChange }: { apps: ListedApp[]; tags: Record<string, AppTag>; onChange: (packageName: string, tag: AppTag) => void }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 0, paddingVertical: space.sm }}>
      {apps.map((a, i) => (
        <View key={a.packageName} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
          <Row style={{ paddingVertical: space.xs }}>
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1}>{a.label}</Txt>
              <Txt variant="caption" muted>
                {a.avgMin >= 1 ? `${formatMinutes(a.avgMin)} a day` : 'Barely used'}
              </Txt>
            </View>
            <Switch
              accessibilityLabel={`Count ${a.label} as wasted time`}
              value={tags[a.packageName] === 'wasted'}
              onValueChange={(on) => onChange(a.packageName, on ? 'wasted' : 'neutral')}
              trackColor={{ true: colors.over, false: colors.track }}
            />
          </Row>
        </View>
      ))}
    </Card>
  );
}
