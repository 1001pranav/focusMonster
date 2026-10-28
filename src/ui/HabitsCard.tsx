import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MAX_HABITS, suggestionsFor } from '@/domain/habits';
import { addHabit, archiveHabit, setHabitDone } from '@/db/repo';
import { changed } from '@/db/store';
import type { TodayData } from '@/data/hooks';
import { Card, Chip, Field, Row, Txt } from './components';
import { space, useTheme } from './theme';

/** Offline habits that replace scrolling. The first three appear on the gate as "Instead". */
export function HabitsCard({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const act = (work: Promise<void>) => work.then(changed, (e) => console.warn(e));
  const habits = data.habits.map((h) => h.habit);
  const add = (t: string) => {
    if (!t.trim() || habits.length >= MAX_HABITS) return;
    act(addHabit(t.trim()));
    setTitle('');
  };

  return (
    <Card>
      {!data.habits.length ? <Txt muted>Pick small things you'd rather do. The first three show on the gate, one tap away.</Txt> : null}
      {data.habits.map(({ habit, done, pickedAtGate }) => (
        <Row key={habit.id} onPress={() => act(setHabitDone(habit.id, data.day, !done))}>
          <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? colors.good : colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Txt>{habit.title}</Txt>
            {pickedAtGate && !done ? (
              <Txt variant="caption" muted>
                Picked at the gate today. Did you do it?
              </Txt>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${habit.title}`} hitSlop={12} onPress={() => act(archiveHabit(habit.id))}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </Row>
      ))}
      {habits.length < MAX_HABITS ? (
        <View style={{ gap: space.sm, paddingTop: space.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {suggestionsFor(habits)
              .slice(0, 4)
              .map((s) => (
                <Chip key={s} label={`+ ${s}`} selected={false} onPress={() => add(s)} />
              ))}
          </View>
          <Field placeholder="Your own" value={title} onChangeText={setTitle} onSubmitEditing={() => add(title)} returnKeyType="done" maxLength={40} />
        </View>
      ) : null}
    </Card>
  );
}
