import { useState } from 'react';
import { saveReflection } from '@/db/repo';
import { changed } from '@/db/store';
import type { TodayData } from '@/data/hooks';
import { Button, Card, Field, Txt } from './components';

/** Evenings: one line on what the reclaimed time went to. Earlier in the day it says when to come back. */
export function ReflectionCard({ data }: { data: TodayData }) {
  const [text, setText] = useState('');
  const evening = new Date(data.now).getHours() >= 18;
  return (
    <Card>
      {data.reflection ? (
        <>
          <Txt variant="caption" muted>
            TODAY YOU
          </Txt>
          <Txt>{data.reflection}</Txt>
        </>
      ) : evening ? (
        <>
          <Txt variant="heading">What did you do with the time you won back?</Txt>
          <Field placeholder="One line is enough" value={text} onChangeText={setText} maxLength={140} />
          <Button title="Save" kind="secondary" disabled={!text.trim()} onPress={() => saveReflection(data.day, text.trim()).then(changed)} />
        </>
      ) : (
        <Txt muted>After 6 pm, note in one line what you did with the time you won back. They add up in the weekly review.</Txt>
      )}
    </Card>
  );
}
