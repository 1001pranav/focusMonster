import { router } from 'expo-router';
import { useState } from 'react';
import type { AppTag } from '@/domain/apps';
import { timeUntil } from '@/domain/lock';
import { loadSettings } from '@/db/repo';
import { changed } from '@/db/store';
import { useLoad } from '@/data/hooks';
import { saveWastedChoice } from '@/services/lock';
import { AppTagList, useAppList } from '@/ui/AppTagList';
import { BackBar, Button, Screen, Txt, LoadingState } from '@/ui/components';

export default function Apps() {
  const list = useAppList();
  const loaded = useLoad(async () => ({ settings: await loadSettings(), now: Date.now() }));
  const [edited, setEdited] = useState<Record<string, AppTag>>({});
  if (!list || !loaded) return <LoadingState label="Loading your apps…" />;

  const { now } = loaded;
  const { untagAt } = loaded.settings.pending;
  // What the switches show: the user's intent, so an app on its way out already shows as off.
  const shown: Record<string, AppTag> = { ...list.tags };
  for (const pkg of Object.keys(untagAt)) shown[pkg] = 'neutral';
  Object.assign(shown, edited);

  const notes: Record<string, string> = {};
  for (const a of list.apps) {
    const pkg = a.packageName;
    if (shown[pkg] === 'wasted' || list.tags[pkg] !== 'wasted') continue;
    notes[pkg] = untagAt[pkg] ? `Still counts, stops ${timeUntil(untagAt[pkg], now)}` : 'Stops counting 24 hours after you save';
  }

  const save = async () => {
    await saveWastedChoice(Object.fromEntries(list.apps.map((a) => [a.packageName, shown[a.packageName] === 'wasted'])));
    changed();
    router.back();
  };

  return (
    <Screen>
      <BackBar title="Settings" />
      <Txt variant="title">Wasted-time apps</Txt>
      <Txt muted>Adding an app counts at once. Removing one takes 24 hours, so a late-night decision can't undo a daytime one. Switch it back on to cancel.</Txt>
      <AppTagList apps={list.apps} tags={shown} notes={notes} onChange={(pkg, tag) => setEdited({ ...edited, [pkg]: tag })} />
      <Button title="Save" onPress={save} />
    </Screen>
  );
}
