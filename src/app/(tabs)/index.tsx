import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { addDays, formatMinutes, startOf } from '@/domain/dates';
import { leftOver, slotsLeft, type Task } from '@/domain/tasks';
import { addTask, moveTask, setTaskStatus } from '@/db/repo';
import { changed } from '@/db/store';
import type { TodayData } from '@/data/hooks';
import { useToday } from '@/data/today';
import { Bar, Card, Chip, ErrorState, Field, LoadingState, Ring, Row, Screen, Section, StatChip, Txt } from '@/ui/components';
import { FocusCard } from '@/ui/FocusCard';
import { SetupCard } from '@/ui/SetupCard';
import { space, useTheme } from '@/ui/theme';

/** Today is about right now: how much is left, what to do instead, and what's done. */
export default function Today() {
  const { value: data, error, reload } = useToday();
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : <LoadingState label="Loading your day…" />;
  return (
    <Screen>
      <Header data={data} />
      <SetupCard data={data} />
      <Hero data={data} />
      <Why data={data} />
      <FocusCard data={data} />
      <TopThree data={data} />
      <ShortVideos data={data} />
    </Screen>
  );
}

function Header({ data }: { data: TodayData }) {
  const hour = new Date(data.now).getHours();
  const greeting = hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <View style={{ gap: 2, paddingHorizontal: space.xs }}>
      <Txt variant="caption" muted>
        {startOf(data.day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      </Txt>
      <Txt variant="title">{greeting}</Txt>
    </View>
  );
}

/** The one number that matters, how it compares, and the streak. */
function Hero({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const { wastedMin, targetMin, lastWeekMin, avg7Min, streak, reclaimedMin } = data;
  const left = targetMin - wastedMin;
  const comparisons = [
    { label: 'vs this time last week', other: lastWeekMin },
    { label: 'vs your 7-day average', other: avg7Min },
  ].filter((c): c is { label: string; other: number } => c.other !== null);

  return (
    <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
      <Ring progress={targetMin ? wastedMin / targetMin : 0} size={220}>
        <Txt variant="caption" muted>
          WASTED TODAY
        </Txt>
        <Txt variant="hero">{formatMinutes(wastedMin)}</Txt>
        <Txt muted>of {formatMinutes(targetMin)}</Txt>
      </Ring>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Txt variant="title" style={{ color: left >= 0 ? colors.text : colors.over }}>
          {left >= 0 ? `${formatMinutes(left)} left` : `${formatMinutes(-left)} over`}
        </Txt>
        {left < 0 ? (
          <Txt variant="caption" muted style={{ textAlign: 'center' }}>
            Tomorrow's target holds: you lose a day, nothing more.
          </Txt>
        ) : null}
      </View>
      {comparisons.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm }}>
          {comparisons.map((c) => {
            const diff = Math.round(wastedMin - c.other);
            const better = diff <= 0;
            return (
              <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: 14, backgroundColor: better ? colors.goodSoft : colors.overSoft }}>
                <Ionicons name={better ? 'arrow-down' : 'arrow-up'} size={14} color={better ? colors.good : colors.over} />
                <Txt variant="caption" style={{ color: better ? colors.good : colors.over }}>
                  {formatMinutes(Math.abs(diff))} {c.label}
                </Txt>
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
        <StatChip icon="flame-outline" value={`${streak.current}`} label="day streak" />
        <StatChip icon="snow-outline" value={`${streak.freezes}`} label={streak.freezes === 1 ? 'freeze' : 'freezes'} />
        <StatChip icon="time-outline" value={formatMinutes(reclaimedMin)} label="won back" />
      </View>
    </Card>
  );
}

/** The user's own reason for starting, kept in front of them. Rotates daily with several goals. */
function Why({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const withWhy = data.goals.filter((g) => g.why);
  if (!withWhy.length) return null;
  const goal = withWhy[Math.floor(startOf(data.day).getTime() / 86400000) % withWhy.length];
  return (
    <View style={{ flexDirection: 'row', gap: space.md, paddingHorizontal: space.sm, paddingVertical: space.xs }}>
      <View style={{ width: 3, borderRadius: 2, backgroundColor: colors.primary }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="caption" muted>
          WHY YOU STARTED · {goal.title.toUpperCase()}
        </Txt>
        <Txt variant="heading">“{goal.why}”</Txt>
      </View>
    </View>
  );
}

function TopThree({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);
  const todays = data.tasks.filter((t) => t.day === data.day && t.status !== 'dropped');
  const old = leftOver(data.tasks, data.day);
  const slots = slotsLeft(data.tasks, data.day);
  const done = todays.filter((t) => t.status === 'done').length;

  const act = (work: Promise<void>) => work.then(changed, (e) => console.warn(e));
  const add = () => {
    if (!title.trim() || slots <= 0) return;
    act(addTask(title.trim(), goalId, data.day));
    setTitle('');
    setGoalId(null);
  };
  const goalTitle = (t: Task) => data.goals.find((g) => g.id === t.goalId)?.title;

  return (
    <>
      <Section title="Today's Top 3" meta={todays.length ? `${done} of ${todays.length} done` : undefined} />
      <Card>
        {!todays.length && !old.length ? <Txt muted>Up to three things that would make today a win. Small is fine.</Txt> : null}
        {todays.map((t) => (
          <Row key={t.id} onPress={() => act(setTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done'))}>
            <Ionicons name={t.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={t.status === 'done' ? colors.good : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Txt style={t.status === 'done' ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}>{t.title}</Txt>
              {goalTitle(t) ? (
                <Txt variant="caption" muted>
                  {goalTitle(t)}
                </Txt>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Drop ${t.title}`} hitSlop={12} onPress={() => act(setTaskStatus(t.id, 'dropped'))}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </Row>
        ))}
        {old.length > 0 && (
          <View style={{ gap: space.xs, paddingTop: space.sm }}>
            <Txt variant="label" muted>
              Left over from {old[0].day === addDays(data.day, -1) ? 'yesterday' : 'earlier'}
            </Txt>
            {old.map((t) => (
              <Row key={t.id}>
                <Txt style={{ flex: 1 }} numberOfLines={1}>
                  {t.title}
                </Txt>
                <Chip label="Today" selected={false} onPress={() => slots > 0 && act(moveTask(t.id, data.day))} />
                <Chip label="Drop" selected={false} onPress={() => act(setTaskStatus(t.id, 'dropped'))} />
              </Row>
            ))}
          </View>
        )}
        {slots > 0 ? (
          <View style={{ gap: space.sm, paddingTop: todays.length ? space.sm : 0 }}>
            <Field placeholder={todays.length ? 'Add another' : 'What would make today a win?'} value={title} onChangeText={setTitle} onSubmitEditing={add} returnKeyType="done" maxLength={80} />
            {data.goals.length > 0 && title.trim() ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {data.goals.map((g) => (
                  <Chip key={g.id} label={g.title} selected={goalId === g.id} onPress={() => setGoalId(goalId === g.id ? null : g.id)} />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Txt variant="caption" muted>
            Three is the limit on purpose: finish or drop one to add more.
          </Txt>
        )}
      </Card>
    </>
  );
}

/** The count asked for from the start. Never hidden: an empty card says why. */
function ShortVideos({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const total = data.shortVideo.reduce((sum, l) => sum + l.count, 0);
  return (
    <>
      <Section title="Reels and Shorts" action="Check detection" onAction={() => router.push('/detection')} />
      <Card>
        {!data.gate.serviceOn ? (
          <Txt muted>Not counting yet: this needs the Accessibility service (see Finish setting up above).</Txt>
        ) : !data.shortVideo.length ? (
          <Txt muted>None counted today. Watched some anyway? Tap Check detection.</Txt>
        ) : (
          data.shortVideo.map((l) => (
            <View key={l.label} style={{ gap: space.xs, paddingVertical: space.xs }}>
              <Row style={{ justifyContent: 'space-between', minHeight: 0 }}>
                <Txt variant="label" style={{ fontSize: 15 }}>
                  {l.label}
                </Txt>
                <Txt variant="heading">
                  {l.count} <Txt variant="caption" muted>{`· ${formatMinutes(l.minutes)}`}</Txt>
                </Txt>
              </Row>
              <Bar fraction={total ? l.count / total : 0} color={colors.over} />
              {l.yesterday !== null || l.blocked > 0 ? (
                <Txt variant="caption" muted>
                  {[
                    l.yesterday !== null ? (l.count <= l.yesterday ? `${l.yesterday - l.count} fewer than yesterday` : `${l.count - l.yesterday} more than yesterday`) : null,
                    l.blocked > 0 ? `blocked ${l.blocked}×` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
              ) : null}
            </View>
          ))
        )}
      </Card>
    </>
  );
}
