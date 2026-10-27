import { router } from 'expo-router';
import { useState } from 'react';
import type { AppTag } from '@/domain/apps';
import { saveTags } from '@/db/repo';
import { changed } from '@/db/store';
import { AppTagList, useAppList } from '@/ui/AppTagList';
import { Button, Screen, Txt } from '@/ui/components';

export default function Apps() {
  const list = useAppList();
  const [tags, setTags] = useState<Record<string, AppTag> | null>(null);
  const current = tags ?? list?.tags ?? null;
  if (!list || !current) return <Screen>{null}</Screen>;

  const save = async () => {
    await saveTags(list.apps.map((a) => ({ packageName: a.packageName, label: a.label, tag: current[a.packageName] })));
    changed();
    router.back();
  };

  return (
    <Screen>
      <Txt variant="title">Wasted-time apps</Txt>
      <Txt muted>Changing an app also changes how past days are counted, so your streak may shift.</Txt>
      <AppTagList apps={list.apps} tags={current} onChange={(pkg, tag) => setTags({ ...current, [pkg]: tag })} />
      <Button title="Save" onPress={save} />
    </Screen>
  );
}
