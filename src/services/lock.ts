import type { AppTag } from '@/domain/apps';
import { cancelGateOff, cancelUntag, requestGateOff, requestUntag, takeDue } from '@/domain/lock';
import { loadSettings, loadTags, saveSettings, setTags } from '@/db/repo';

/** Applies the pending changes whose 24 hours are up. The native gate already honours them on time. */
export async function applyDuePending(): Promise<void> {
  const settings = await loadSettings();
  const { gateOff, untag, shorts, rest } = takeDue(settings.pending, Date.now());
  if (!gateOff && !untag.length && !shorts) return;
  if (untag.length) await setTags(Object.fromEntries(untag.map((pkg) => [pkg, 'neutral' as AppTag])));
  await saveSettings({ pending: rest, ...(gateOff ? { gateEnabled: false } : {}), ...(shorts ? { shorts } : {}) });
}

/** On is immediate; off waits 24 hours. Turning it back on cancels a pending off. */
export async function setGateWanted(on: boolean): Promise<void> {
  const { pending } = await loadSettings();
  if (on) await saveSettings({ gateEnabled: true, pending: cancelGateOff(pending) });
  else await saveSettings({ pending: requestGateOff(pending, Date.now()) });
}

/**
 * Saves the user's choice of wasted apps. Adding one counts at once; removing one waits 24 hours,
 * and switching it back on in the meantime cancels the removal.
 */
export async function saveWastedChoice(wanted: Record<string, boolean>): Promise<void> {
  const [settings, saved] = await Promise.all([loadSettings(), loadTags()]);
  let pending = settings.pending;
  const now: Record<string, AppTag> = {};
  for (const [pkg, wasted] of Object.entries(wanted)) {
    if (wasted) {
      if (saved[pkg] !== 'wasted') now[pkg] = 'wasted';
      pending = cancelUntag(pending, pkg);
    } else if (saved[pkg] === 'wasted') {
      pending = requestUntag(pending, pkg, Date.now());
    }
  }
  await setTags(now);
  await saveSettings({ pending });
}
