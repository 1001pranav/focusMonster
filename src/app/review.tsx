import * as Sharing from 'expo-sharing';
import { useRef } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { usageByHour } from '../../modules/usage-stats';
import { wastedMinutes } from '@/domain/apps';
import { addDays, formatMinutes, startOf, today } from '@/domain/dates';
import { REASON_LABELS } from '@/domain/gate';
import { buildReview, hourLabel, type WeekReview } from '@/domain/review';
import { evaluate } from '@/domain/target';
import { loadDailyUsage, loadFocusSessions, loadGateEvents, loadHabitLogs, loadReflections, loadSettings, loadShortVideo, loadTags } from '@/db/repo';
import { useLoad } from '@/data/hooks';
import { wastedPackages } from '@/services/gate';
import { Button, Card, Row, Screen, Txt } from '@/ui/components';
import { space, useTheme } from '@/ui/theme';

/** The last seven finished days, against the seven before. */
export default function Review() {
  const shareRef = useRef<View>(null);
  const review = useLoad(async () => {
    const lastDay = addDays(today(), -1);
    const from = addDays(lastDay, -6);
    const fromMs = startOf(from).getTime();
    const toMs = startOf(today()).getTime();
    const [settings, tags, usage, shortVideo, sessions, habitLogs, gateEvents, reflections] = await Promise.all([
      loadSettings(),
      loadTags(),
      loadDailyUsage(addDays(from, -7)),
      loadShortVideo(from),
      loadFocusSessions(fromMs),
      loadHabitLogs(from),
      loadGateEvents(fromMs),
      loadReflections(from),
    ]);
    const wastedByDay = Object.fromEntries(Object.entries(usage).map(([d, u]) => [d, wastedMinutes(u, tags)]));
    const days = settings.plan ? evaluate(settings.plan, wastedByDay, today()).days : [];
    const byHour = await usageByHour(fromMs, toMs, wastedPackages(tags));
    return buildReview({ lastDay, days, shortVideo, sessions: sessions.filter((s) => s.startedAt < toMs), habitLogs, gateEvents: gateEvents.filter((e) => e.at < toMs), reflections, byHour, now: Date.now() });
  });
  if (!review) return <Screen>{null}</Screen>;

  const share = async () => {
    if (!shareRef.current) return;
    const uri = await captureRef(shareRef, { format: 'png', quality: 1 });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your week' });
  };

  return (
    <Screen>
      <Txt variant="title">Your week</Txt>
      <Txt muted>
        {review.from} to {review.to}
      </Txt>
      <View ref={shareRef} collapsable={false}>
        <ShareCard review={review} />
      </View>
      <Button title="Share this week" icon="share-outline" kind="secondary" onPress={() => share().catch((e) => console.warn(e))} />
      <Details review={review} />
    </Screen>
  );
}

/** The summary that's shared as an image: totals only, no app names or reflections. */
function ShareCard({ review }: { review: WeekReview }) {
  const { colors } = useTheme();
  const change = review.previousMin !== null && review.previousMin > 0 ? Math.round(((review.totalMin - review.previousMin) / review.previousMin) * 100) : null;
  return (
    <Card tone="primary" style={{ gap: space.md }}>
      <Txt variant="caption" muted>
        FOCUSMONSTER · MY WEEK
      </Txt>
      <Txt variant="hero">{formatMinutes(review.avgMin)}</Txt>
      <Txt muted>wasted a day on average</Txt>
      {change !== null ? (
        <Txt variant="heading" style={{ color: change <= 0 ? colors.good : colors.over }}>
          {change <= 0 ? `▼ ${-change}%` : `▲ ${change}%`} vs the week before
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Stat value={`${review.hitDays}/${review.finishedDays}`} label="days on target" />
        <Stat value={`${review.shortVideos}`} label="short videos" />
        <Stat value={formatMinutes(review.focusMin)} label="focused" />
      </View>
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt variant="heading">{value}</Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}

function Details({ review }: { review: WeekReview }) {
  const { colors } = useTheme();
  const maxShorts = Math.max(1, ...review.shortVideosByDay.map((d) => d.count));
  const topReason = review.gate.reasons[0];
  return (
    <>
      <Card>
        <Txt variant="heading">Patterns</Txt>
        {review.bestDay ? (
          <Txt>
            Best day: {startOf(review.bestDay.day).toLocaleDateString(undefined, { weekday: 'long' })}, {formatMinutes(review.bestDay.wastedMin)}.
          </Txt>
        ) : null}
        {review.worstHour ? (
          <Txt>
            Most scrolling: around {hourLabel(review.worstHour.hour)}, {formatMinutes(review.worstHour.minutes)} over the week. A bedtime or a focus session there would help most.
          </Txt>
        ) : null}
        {review.gate.shown > 0 ? (
          <Txt>
            The gate paused you {review.gate.shown} times and you turned back {review.gate.turnedBack}.{topReason ? ` Most common reason: ${REASON_LABELS[topReason.reason].toLowerCase()}.` : ''}
          </Txt>
        ) : null}
        {review.habitsDone > 0 ? <Txt>{review.habitsDone} habits done instead of scrolling.</Txt> : null}
      </Card>
      {review.shortVideos > 0 ? (
        <Card>
          <Txt variant="heading">Short videos per day</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 96 }}>
            {review.shortVideosByDay.map((d) => (
              <View key={d.day} style={{ alignItems: 'center', gap: space.xs, flex: 1 }}>
                <Txt variant="caption" muted>
                  {d.count || ''}
                </Txt>
                <View style={{ width: 18, height: Math.max(2, (d.count / maxShorts) * 64), borderRadius: 4, backgroundColor: colors.over }} />
                <Txt variant="caption" muted>
                  {startOf(d.day).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </Txt>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
      {review.reflections.length > 0 ? (
        <Card>
          <Txt variant="heading">What you did with the time</Txt>
          {review.reflections.map((r) => (
            <Row key={r.day} style={{ alignItems: 'flex-start' }}>
              <Txt variant="label" muted style={{ width: 40 }}>
                {startOf(r.day).toLocaleDateString(undefined, { weekday: 'short' })}
              </Txt>
              <Txt style={{ flex: 1 }}>{r.text}</Txt>
            </Row>
          ))}
        </Card>
      ) : null}
    </>
  );
}
