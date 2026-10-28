import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { hasUsageAccess, openUsageAccessSettings } from '../../../modules/usage-stats';
import { addDays, formatMinutes, startOf } from '@/domain/dates';
import { REASON_LABELS } from '@/domain/gate';
import { leftOver, slotsLeft, type Task } from '@/domain/tasks';
import { addTask, moveTask, setTaskStatus } from '@/db/repo';
import { changed } from '@/db/store';
import { useToday, type TodayData } from '@/data/hooks';
import { setGateWanted } from '@/services/lock';
import { Button, Card, Chip, Field, Ring, Row, Screen, Txt } from '@/ui/components';
import { ChallengeCard } from '@/ui/ChallengeCard';
import { FocusCard } from '@/ui/FocusCard';
import { GateSetup } from '@/ui/GateSetup';
import { HabitsCard } from '@/ui/HabitsCard';
import { ReflectionCard } from '@/ui/ReflectionCard';
import { space, useTheme } from '@/ui/theme';

export default function Today() {
  const data = useToday();
  if (!data) return <Screen>{null}</Screen>;
  return (
    <Screen>
      {!hasUsageAccess() && (
        <Card tone="over">
          <Txt variant="heading">Usage access is off</Txt>
          <Txt>Without it FocusMonster can't see your time. Turn it back on to keep your streak counting.</Txt>
          <Button title="Turn on usage access" onPress={openUsageAccessSettings} />
        </Card>
      )}
      <Progress data={data} />
      <GateCard data={data} />
      <ShortVideoCard data={data} />
      <WhyCard data={data} />
      <TopThree data={data} />
      <FocusCard data={data} />
      <HabitsCard data={data} />
      <ChallengeCard data={data} />
      <Week data={data} />
      <ReflectionCard data={data} />
      <Apps data={data} />
    </Screen>
  );
}

function Progress({ data }: { data: TodayData }) {
  const { wastedMin, targetMin, lastWeekMin, avg7Min, streak, reclaimedMin } = data;
  const left = targetMin - wastedMin;
  const compare = (label: string, other: number | null) => {
    if (other === null) return null;
    const diff = Math.round(wastedMin - other);
    return (
      <Txt variant="caption" muted>
        {diff <= 0 ? '▼' : '▲'} {formatMinutes(Math.abs(diff))} {diff <= 0 ? 'less' : 'more'} than {label}
      </Txt>
    );
  };
  return (
    <Card style={{ alignItems: 'center', gap: space.md }}>
      <Ring progress={targetMin ? wastedMin / targetMin : 0}>
        <Txt variant="hero">{formatMinutes(wastedMin)}</Txt>
        <Txt muted>of {formatMinutes(targetMin)}</Txt>
      </Ring>
      <Txt variant="heading" style={{ textAlign: 'center' }}>
        {left >= 0 ? `${formatMinutes(left)} left today` : `${formatMinutes(-left)} over. Tomorrow's target holds, so you lose nothing but a day.`}
      </Txt>
      <View style={{ alignItems: 'center' }}>
        {compare('this time last week', lastWeekMin)}
        {compare('your 7-day average', avg7Min)}
      </View>
      <View style={{ flexDirection: 'row', gap: space.xl }}>
        <Stat icon="flame-outline" value={`${streak.current}`} label="day streak" />
        <Stat icon="snow-outline" value={`${streak.freezes}`} label={streak.freezes === 1 ? 'freeze' : 'freezes'} />
        <Stat icon="time-outline" value={formatMinutes(reclaimedMin)} label="won back" />
      </View>
    </Card>
  );
}

/** Offer the gate, finish its setup, or show what it did today. */
function GateCard({ data }: { data: TodayData }) {
  const { wanted, serviceOn, today } = data.gate;
  if (!wanted) {
    return (
      <Card>
        <Txt variant="heading">Add a pause before wasted apps</Txt>
        <Txt muted>Opening one shows a short wait and asks why. The pause gets longer as today's budget runs out.</Txt>
        <Button title="Turn on the mindful gate" kind="secondary" onPress={() => setGateWanted(true).then(changed)} />
      </Card>
    );
  }
  if (!serviceOn) return <GateSetup />;
  if (!today.shown) return null;
  const top = today.reasons[0];
  return (
    <Card>
      <Txt variant="heading">Mindful gate today</Txt>
      <Txt>
        Paused you {today.shown} {today.shown === 1 ? 'time' : 'times'}. You turned back {today.turnedBack}.
      </Txt>
      {top ? (
        <Txt muted>
          Most common reason: {REASON_LABELS[top.reason].toLowerCase()} ({top.count}).
        </Txt>
      ) : null}
    </Card>
  );
}

/** The count the user asked for from the start: Reels and Shorts watched today. */
function ShortVideoCard({ data }: { data: TodayData }) {
  if (!data.shortVideo.length) return null;
  return (
    <Card>
      <Txt variant="heading">Short videos today</Txt>
      {data.shortVideo.map((l) => (
        <View key={l.label} style={{ gap: 2 }}>
          <Row style={{ justifyContent: 'space-between', minHeight: 0 }}>
            <Txt>{l.label}</Txt>
            <Txt variant="label">
              {l.count} · {formatMinutes(l.minutes)}
            </Txt>
          </Row>
          {l.yesterday !== null ? (
            <Txt variant="caption" muted>
              {l.count <= l.yesterday ? `▼ ${l.yesterday - l.count} fewer` : `▲ ${l.count - l.yesterday} more`} than yesterday ({l.yesterday})
            </Txt>
          ) : null}
          {l.blocked > 0 ? (
            <Txt variant="caption" muted>
              Blocked {l.blocked} {l.blocked === 1 ? 'time' : 'times'}
            </Txt>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

function Stat({ icon, value, label }: { icon: 'flame-outline' | 'snow-outline' | 'time-outline'; value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Txt variant="heading">{value}</Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}

/** The user's own reason for starting, kept in front of them. Rotates daily when there are several goals. */
function WhyCard({ data }: { data: TodayData }) {
  const withWhy = data.goals.filter((g) => g.why);
  if (!withWhy.length) return null;
  const goal = withWhy[Math.floor(startOf(data.day).getTime() / 86400000) % withWhy.length];
  return (
    <Card tone="primary">
      <Txt variant="caption" muted>
        WHY YOU STARTED · {goal.title.toUpperCase()}
      </Txt>
      <Txt variant="heading">“{goal.why}”</Txt>
    </Card>
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
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading">Today's Top 3</Txt>
        <Txt variant="label" muted>
          {done}/{todays.length || 3} done
        </Txt>
      </Row>
      {todays.map((t) => (
        <Row key={t.id} onPress={() => act(setTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done'))}>
          <Ionicons name={t.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={t.status === 'done' ? colors.good : colors.textMuted} />
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
        <View style={{ gap: space.sm, paddingTop: space.sm }}>
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
  );
}

function Week({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const recent = data.days.slice(-7);
  if (!recent.length) return null;
  return (
    <Card>
      <Txt variant="heading">Last {recent.length === 1 ? 'day' : `${recent.length} days`}</Txt>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {recent.map((d) => (
          <View key={d.day} style={{ alignItems: 'center', gap: space.xs }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: d.hit ? colors.goodSoft : colors.overSoft }}>
              <Ionicons name={d.hit ? 'checkmark' : 'remove'} size={18} color={d.hit ? colors.good : colors.over} />
            </View>
            <Txt variant="caption" muted>
              {startOf(d.day).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </Txt>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Apps({ data }: { data: TodayData }) {
  const { colors } = useTheme();
  const wasted = data.apps.filter((a) => a.tag === 'wasted').slice(0, 5);
  if (!wasted.length) return null;
  const max = wasted[0].minutes;
  return (
    <Card>
      <Txt variant="heading">Where today's time went</Txt>
      {wasted.map((a) => (
        <View key={a.packageName} style={{ gap: space.xs }}>
          <Row style={{ justifyContent: 'space-between', minHeight: 0 }}>
            <Txt numberOfLines={1} style={{ flex: 1 }}>
              {a.label}
            </Txt>
            <Txt variant="label">{formatMinutes(a.minutes)}</Txt>
          </Row>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track }}>
            <View style={{ height: 6, borderRadius: 3, width: `${(a.minutes / max) * 100}%`, backgroundColor: colors.over }} />
          </View>
        </View>
      ))}
    </Card>
  );
}
