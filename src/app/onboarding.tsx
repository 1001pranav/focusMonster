import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { hasUsageAccess, openUsageAccessSettings, usageStatsAvailable } from '../../modules/usage-stats';
import type { AppTag } from '@/domain/apps';
import { formatMinutes, today } from '@/domain/dates';
import { daysPerYear } from '@/domain/reclaimed';
import { targetFor } from '@/domain/target';
import { saveGoal, saveSettings, saveTags } from '@/db/repo';
import { changed } from '@/db/store';
import { ensurePermission } from '@/services/notifications';
import { detectBaseline } from '@/services/usage';
import { AppTagList, useAppList } from '@/ui/AppTagList';
import { Button, Card, Field, Screen, Stepper, Txt } from '@/ui/components';
import { space } from '@/ui/theme';

type Step = 'welcome' | 'access' | 'apps' | 'baseline' | 'goal';

export default function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [tags, setTags] = useState<Record<string, AppTag> | null>(null);
  const [baseline, setBaseline] = useState<{ min: number; detected: boolean } | null>(null);
  const [floor, setFloor] = useState(60);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');

  const finish = async () => {
    if (!baseline) return;
    if (title.trim()) await saveGoal({ title: title.trim(), why: why.trim() });
    await saveSettings({ onboarded: true, plan: { baselineMin: baseline.min, floorMin: Math.min(floor, baseline.min), startDay: today() } });
    await ensurePermission();
    changed();
  };

  return (
    <Screen>
      {step === 'welcome' && (
        <>
          <Txt variant="title">Win your time back, a little every day</Txt>
          <Txt muted>FocusMonster measures the time that slips into feeds and short videos, then sets a daily target a bit lower than where you are now.</Txt>
          <Card>
            <Txt>• Hit today's target and tomorrow's drops by 1.5%.</Txt>
            <Txt>• Miss it and the target simply stays put. No penalty.</Txt>
            <Txt>• Everything stays on this phone.</Txt>
          </Card>
          <Button title="Let's start" onPress={() => setStep('access')} />
        </>
      )}
      {step === 'access' && <AccessStep onDone={() => setStep('apps')} />}
      {step === 'apps' && (
        <AppsStep
          onDone={async (chosen) => {
            setTags(chosen);
            const detected = await detectBaseline(chosen);
            setBaseline(detected === null ? { min: 300, detected: false } : { min: Math.max(30, Math.round(detected / 15) * 15), detected: true });
            setStep('baseline');
          }}
        />
      )}
      {step === 'baseline' && baseline && tags && (
        <>
          <Txt variant="title">Where you are now</Txt>
          <Txt muted>
            {baseline.detected ? 'Your average wasted time a day over the past week. Adjust it if last week was unusual.' : "This phone has no usage history yet. Estimate how much time a day goes to the apps you picked."}
          </Txt>
          <Card>
            <Stepper value={baseline.min} onChange={(min) => setBaseline({ ...baseline, min })} step={15} min={30} max={960} format={formatMinutes} />
            <Txt muted style={{ textAlign: 'center' }}>
              That's about {daysPerYear(baseline.min)} full days a year.
            </Txt>
          </Card>
          <Txt variant="heading">Your goal</Txt>
          <Txt muted>The target will stop shrinking here.</Txt>
          <Card>
            <Stepper value={Math.min(floor, baseline.min)} onChange={setFloor} step={15} min={15} max={baseline.min} format={formatMinutes} />
          </Card>
          <Card tone="primary">
            <Txt>
              Today's target: <Txt variant="heading">{formatMinutes(targetFor({ baselineMin: baseline.min, floorMin: Math.min(floor, baseline.min), startDay: today() }, 0))}</Txt>
            </Txt>
          </Card>
          <Button title="Continue" onPress={() => setStep('goal')} />
        </>
      )}
      {step === 'goal' && (
        <>
          <Txt variant="title">What will you do with the time?</Txt>
          <Txt muted>Name one thing that matters to you, and why. You'll see it every time you open the app, so you don't forget why you started.</Txt>
          <Field placeholder="Goal, e.g. Get fit, Finish my side project" value={title} onChangeText={setTitle} maxLength={60} />
          <Field placeholder="Why it matters to you" value={why} onChangeText={setWhy} multiline maxLength={280} />
          <Button title="Start" onPress={finish} disabled={!title.trim()} />
          <Button title="Skip for now" kind="plain" onPress={finish} />
        </>
      )}
    </Screen>
  );
}

function AccessStep({ onDone }: { onDone: () => void }) {
  const [granted, setGranted] = useState(hasUsageAccess);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setGranted(hasUsageAccess()));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (granted) onDone();
  }, [granted, onDone]);

  if (!usageStatsAvailable()) {
    return (
      <>
        <Txt variant="title">Development build needed</Txt>
        <Txt muted>Reading app usage needs FocusMonster's own native module, which Expo Go doesn't include. Build the app with `npx expo run:android` or an EAS development build.</Txt>
      </>
    );
  }
  return (
    <>
      <Txt variant="title">Allow usage access</Txt>
      <Txt muted>Android only shares how long each app is open with apps you allow. FocusMonster reads the time per app and nothing inside the apps. The data never leaves this phone.</Txt>
      <Card>
        <Txt>1. Tap the button below.</Txt>
        <Txt>2. Find FocusMonster and turn on "Permit usage access".</Txt>
        <Txt>3. Come back here.</Txt>
      </Card>
      <Button title="Open usage access settings" onPress={openUsageAccessSettings} />
    </>
  );
}

function AppsStep({ onDone }: { onDone: (tags: Record<string, AppTag>) => Promise<void> }) {
  const list = useAppList();
  const [tags, setTags] = useState<Record<string, AppTag> | null>(null);
  const [saving, setSaving] = useState(false);
  const current = tags ?? list?.tags ?? null;

  if (!list || !current) return <Txt muted>Loading your apps…</Txt>;
  return (
    <>
      <Txt variant="title">Which apps waste your time?</Txt>
      <Txt muted>Only these count against your target. Calls, maps and work apps don't. Feeds and short videos are already switched on.</Txt>
      <AppTagList apps={list.apps} tags={current} onChange={(pkg, tag) => setTags({ ...current, [pkg]: tag })} />
      <View style={{ gap: space.sm }}>
        <Button
          title={saving ? 'Saving…' : 'Continue'}
          disabled={saving}
          onPress={async () => {
            setSaving(true);
            await saveTags(list.apps.map((a) => ({ packageName: a.packageName, label: a.label, tag: current[a.packageName] })));
            await onDone(current);
          }}
        />
      </View>
    </>
  );
}
