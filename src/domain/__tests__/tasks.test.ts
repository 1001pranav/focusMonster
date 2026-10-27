import { daysPerYear, reclaimedMinutes } from '../reclaimed';
import { leftOver, slotsLeft, type Task } from '../tasks';

const task = (day: string, status: Task['status']): Task => ({ id: day + status, title: 't', goalId: null, day, status, createdAt: 0 });

describe('tasks', () => {
  it('finds open tasks from earlier days', () => {
    const tasks = [task('2026-11-01', 'todo'), task('2026-11-01', 'done'), task('2026-11-02', 'todo')];
    expect(leftOver(tasks, '2026-11-02').map((t) => t.id)).toEqual(['2026-11-01todo']);
  });

  it('frees a slot when a task is dropped', () => {
    const tasks = [task('2026-11-02', 'todo'), task('2026-11-02', 'done'), task('2026-11-02', 'dropped')];
    expect(slotsLeft(tasks, '2026-11-02')).toBe(1);
  });
});

describe('reclaimed', () => {
  it('sums only the time under the baseline', () => {
    const days = [
      { day: 'a', wastedMin: 300, targetMin: 0, hit: true },
      { day: 'b', wastedMin: 400, targetMin: 0, hit: false },
    ];
    expect(reclaimedMinutes(days, 360)).toBe(60);
  });

  it('turns daily minutes into days a year', () => {
    expect(daysPerYear(600)).toBe(152);
  });
});
