import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { archiveGoal, loadGoals, saveGoal } from '@/db/repo';
import { changed } from '@/db/store';
import { BackBar, Button, Field, Screen, Txt } from '@/ui/components';

export default function EditGoal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');

  useEffect(() => {
    if (isNew) return;
    loadGoals().then((goals) => {
      const goal = goals.find((g) => g.id === id);
      if (goal) {
        setTitle(goal.title);
        setWhy(goal.why);
      }
    });
  }, [id, isNew]);

  const save = async () => {
    await saveGoal({ id: isNew ? undefined : id, title: title.trim(), why: why.trim() });
    changed();
    router.back();
  };

  const archive = () =>
    Alert.alert('Archive this goal?', 'Its finished tasks stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveGoal(id);
          changed();
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <BackBar title="Goals" />
      <Txt variant="title">{isNew ? 'New goal' : 'Edit goal'}</Txt>
      <Field placeholder="Goal" value={title} onChangeText={setTitle} maxLength={60} autoFocus={isNew} />
      <Field placeholder="Why it matters to you" value={why} onChangeText={setWhy} multiline maxLength={280} />
      <Txt variant="caption" muted>
        The why shows on your Today screen. Write it the way you'd say it to a friend.
      </Txt>
      <Button title="Save" onPress={save} disabled={!title.trim()} />
      {!isNew && <Button title="Archive goal" kind="plain" onPress={archive} />}
    </Screen>
  );
}
