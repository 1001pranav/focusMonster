import { gateWhy, nextTask, summarize, type GateEvent } from '../gate';
import type { Goal, Task } from '../tasks';

const event = (choice: GateEvent['choice'], reason: GateEvent['reason']): GateEvent => ({ at: 0, packageName: 'p', reason, choice, waitSec: 5 });

describe('summarize', () => {
  it('counts turning back, including walking away', () => {
    const s = summarize([event('closed', 'bored'), event('left', null), event('continued', 'specific')]);
    expect(s.shown).toBe(3);
    expect(s.turnedBack).toBe(2);
  });

  it('ranks reasons by count', () => {
    const s = summarize([event('closed', 'bored'), event('continued', 'tired'), event('continued', 'bored')]);
    expect(s.reasons).toEqual([
      { reason: 'bored', count: 2 },
      { reason: 'tired', count: 1 },
    ]);
  });
});

const goal = (id: string, why: string): Goal => ({ id, title: id, why, archived: false, createdAt: 0 });
const task = (id: string, day: string, status: Task['status'], goalId: string | null = null): Task => ({ id, title: id, goalId, day, status, createdAt: 0 });

describe('nextTask', () => {
  it('picks today’s first open task', () => {
    const tasks = [task('a', '2026-11-01', 'todo'), task('b', '2026-11-02', 'done'), task('c', '2026-11-02', 'todo')];
    expect(nextTask(tasks, '2026-11-02')?.id).toBe('c');
  });

  it('is null when today is done', () => {
    expect(nextTask([task('b', '2026-11-02', 'done')], '2026-11-02')).toBeNull();
  });
});

describe('gateWhy', () => {
  const goals = [goal('fit', 'Play with my kids without getting tired'), goal('code', 'Ship my own app')];

  it('prefers the next task’s goal', () => {
    expect(gateWhy(goals, task('t', 'd', 'todo', 'code'))).toBe('Ship my own app');
  });

  it('falls back to the first goal with a why', () => {
    expect(gateWhy(goals, null)).toBe('Play with my kids without getting tired');
    expect(gateWhy([goal('x', '')], null)).toBeNull();
  });
});
