import { focusedMinutes, focusedToday, running, statusOf, weeklyFocusByGoal, type FocusSession } from '../focus';
import { doneOn, suggestionsFor } from '../habits';
import type { Task } from '../tasks';

const MIN = 60000;
const start = new Date(2026, 10, 2, 9, 0).getTime();
const session = (over: Partial<FocusSession> = {}): FocusSession => ({ id: 's', taskId: null, goalId: null, startedAt: start, plannedEnd: start + 25 * MIN, endedAt: null, ...over });

describe('focus sessions', () => {
  it('runs, then is done', () => {
    expect(statusOf(session(), start + MIN)).toBe('running');
    expect(statusOf(session(), start + 25 * MIN)).toBe('done');
  });

  it('is abandoned when ended early', () => {
    expect(statusOf(session({ endedAt: start + 10 * MIN }), start + 11 * MIN)).toBe('abandoned');
  });

  it('counts the minutes actually spent', () => {
    expect(focusedMinutes(session(), start + 10 * MIN)).toBe(10);
    expect(focusedMinutes(session(), start + 60 * MIN)).toBe(25);
    expect(focusedMinutes(session({ endedAt: start + 7 * MIN }), start + 60 * MIN)).toBe(7);
  });

  it('finds the running session', () => {
    expect(running([session({ id: 'a', endedAt: start }), session({ id: 'b' })], start + MIN)?.id).toBe('b');
    expect(running([session()], start + 30 * MIN)).toBeNull();
  });

  it('adds focus time to goals, through the task when the session has none', () => {
    const tasks: Task[] = [{ id: 't', title: 't', goalId: 'g2', day: '2026-11-02', status: 'todo', createdAt: 0 }];
    const sessions = [session({ goalId: 'g1' }), session({ id: 'b', taskId: 't' }), session({ id: 'old', goalId: 'g1', startedAt: start - 10 * 24 * 60 * MIN, plannedEnd: start - 10 * 24 * 60 * MIN + 25 * MIN })];
    expect(weeklyFocusByGoal(sessions, tasks, '2026-11-02', start + 60 * MIN)).toEqual({ g1: 25, g2: 25 });
  });

  it('totals today', () => {
    expect(focusedToday([session(), session({ id: 'b', endedAt: start + 5 * MIN })], '2026-11-02', start + 60 * MIN)).toBe(30);
  });
});

describe('habits', () => {
  it('knows what was done on a day', () => {
    expect(doneOn([{ habitId: 'h', day: '2026-11-02' }], 'h', '2026-11-02')).toBe(true);
    expect(doneOn([{ habitId: 'h', day: '2026-11-01' }], 'h', '2026-11-02')).toBe(false);
  });

  it('suggests only habits the user doesn’t have', () => {
    expect(suggestionsFor([{ id: '1', title: 'read 10 pages', createdAt: 0 }])).not.toContain('Read 10 pages');
  });
});
