import { requireOptionalNativeModule } from 'expo';

/** Native side: modules/usage-stats/android. Absent in Expo Go: the app needs a development build. */
interface UsageStatsNative {
  hasUsageAccess(): boolean;
  openUsageAccessSettings(): void;
  foregroundTime(startMs: number, endMs: number): Promise<string>;
  launcherApps(): Promise<string>;
}

const native = requireOptionalNativeModule<UsageStatsNative>('UsageStats');

export const usageStatsAvailable = () => Boolean(native);

export const hasUsageAccess = () => native?.hasUsageAccess() ?? false;

export const openUsageAccessSettings = () => native?.openUsageAccessSettings();

/** Milliseconds each app spent in the foreground between the two times. */
export async function foregroundTime(startMs: number, endMs: number): Promise<Record<string, number>> {
  if (!native) return {};
  return JSON.parse(await native.foregroundTime(startMs, endMs)) as Record<string, number>;
}

export interface LauncherApp {
  packageName: string;
  label: string;
}

/** Apps with a launcher icon, sorted by name. */
export async function launcherApps(): Promise<LauncherApp[]> {
  if (!native) return [];
  return JSON.parse(await native.launcherApps()) as LauncherApp[];
}
