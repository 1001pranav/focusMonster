import { shortVideoDays } from '../../modules/usage-stats/gate';
import { cancelShorts, requestShorts } from '@/domain/lock';
import { isWeaker, type ShortsPolicy, type ShortVideoDay } from '@/domain/shorts';
import { loadSettings, saveSettings, saveShortVideo } from '@/db/repo';

/** Copies the native Reels/Shorts counter into SQLite, which keeps the days the counter drops. */
export async function importShortVideo(): Promise<void> {
  const rows: ShortVideoDay[] = [];
  for (const [day, apps] of Object.entries(shortVideoDays())) {
    for (const [packageName, v] of Object.entries(apps)) rows.push({ day, packageName, count: v.count, ms: v.ms, blocked: v.blocked });
  }
  await saveShortVideo(rows);
}

/** Stricter applies at once and cancels a pending weaker change; weaker waits 24 hours. */
export async function setShortsPolicy(policy: ShortsPolicy): Promise<void> {
  const { shorts, pending } = await loadSettings();
  if (isWeaker(shorts, policy)) await saveSettings({ pending: requestShorts(pending, policy, Date.now()) });
  else await saveSettings({ shorts: policy, pending: cancelShorts(pending) });
}
