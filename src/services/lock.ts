import { defaultTag, type AppTag } from '@/domain/apps';
import { isWeaker, type Bedtime } from '@/domain/bedtime';
import { cancelBedtime, cancelGateOff, cancelOverlayOff, requestOverlayOff, cancelUntag, requestBedtime, requestGateOff, requestUntag, takeDue } from '@/domain/lock';
import { loadSettings, loadTags, saveSettings, saveTags, setTags } from '@/db/repo';

/** Applies the pending changes whose 24 hours are up. The native gate already honours them on time. */
export async function applyDuePending(): Promise<void> {
  const settings = await loadSettings();
  const { gateOff, overlayOff, untag, shorts, bedtime, rest } = takeDue(settings.pending, Date.now());
  if (!gateOff && !overlayOff && !untag.length && !shorts && !bedtime) return;
  if (untag.length) await setTags(Object.fromEntries(untag.map((pkg) => [pkg, 'neutral' as AppTag])));
  await saveSettings({ pending: rest, ...(gateOff ? { gateEnabled: false } : {}), ...(shorts ? { shorts } : {}), ...(bedtime ? { bedtime } : {}), ...(overlayOff ? { shortsOverlay: false } : {}) });
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
 *
 * Apps installed after onboarding have no saved row yet. They get one first, with the tag they
 * already count with (wasted for the default feeds), so the rules below apply to them too: without
 * it a new app could never be added, and a newly installed TikTok could never be removed.
 */
export async function saveWastedChoice(choices: { packageName: string; label: string; wasted: boolean }[]): Promise<void> {
  const [settings, saved] = await Promise.all([loadSettings(), loadTags()]);
  const missing = choices.filter((c) => !(c.packageName in saved));
  if (missing.length) await saveTags(missing.map((c) => ({ packageName: c.packageName, label: c.label, tag: defaultTag(c.packageName) })));
  const current = (pkg: string) => saved[pkg] ?? defaultTag(pkg);
  let pending = settings.pending;
  const now: Record<string, AppTag> = {};
  for (const { packageName: pkg, wasted } of choices) {
    if (wasted) {
      if (current(pkg) !== 'wasted') now[pkg] = 'wasted';
      pending = cancelUntag(pending, pkg);
    } else if (current(pkg) === 'wasted') {
      pending = requestUntag(pending, pkg, Date.now());
    }
  }
  await setTags(now);
  await saveSettings({ pending });
}

/** Stricter bedtimes apply at once; any change that frees a protected minute waits 24 hours. */
export async function setBedtime(next: Bedtime): Promise<void> {
  const { bedtime, pending } = await loadSettings();
  if (isWeaker(bedtime, next)) await saveSettings({ pending: requestBedtime(pending, next, Date.now()) });
  else await saveSettings({ bedtime: next, pending: cancelBedtime(pending) });
}

/** On is immediate; off waits 24 hours, like the gate. */
export async function setOverlayWanted(on: boolean): Promise<void> {
  const { pending } = await loadSettings();
  if (on) await saveSettings({ shortsOverlay: true, pending: cancelOverlayOff(pending) });
  else await saveSettings({ pending: requestOverlayOff(pending, Date.now()) });
}
