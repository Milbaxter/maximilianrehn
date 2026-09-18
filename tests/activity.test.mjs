import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvents, getWorkbench } from '../activity.mjs';

const event = (id, at, overrides = {}) => ({ id, public: true, type: 'PushEvent', created_at: at, repo: { name: 'Milbaxter/example' }, ...overrides });

test('only includes unique public work on owned projects, sorted by date', () => {
  const first = event('1', '2026-09-17T12:00:00Z');
  const result = normalizeEvents([
    first, first, event('2', '2026-09-18T12:00:00Z'),
    event('3', first.created_at, { public: false }),
    event('4', first.created_at, { type: 'WatchEvent' }),
    event('5', first.created_at, { repo: { name: 'someone/other' } }),
    event('6', first.created_at, { repo: { name: 'Milbaxter/Milbaxter' } }),
    event('7', 'invalid'),
  ]);
  assert.deepEqual(result.map(item => item.id), ['2', '1']);
});

test('projects fade, move to the back, disappear, and return with new activity', () => {
  const events = normalizeEvents([event('1', '2026-09-01T12:00:00Z')]);
  const fresh = getWorkbench(events, new Date('2026-09-02T12:00:00Z'))[0];
  const older = getWorkbench(events, new Date('2026-09-15T12:00:00Z'))[0];
  const fading = getWorkbench(events, new Date('2026-09-29T12:00:00Z'))[0];
  assert.equal(fresh.past, false);
  assert.equal(fresh.opacity, 1);
  assert.equal(older.past, true);
  assert.ok(older.opacity < fresh.opacity);
  assert.ok(fading.opacity < older.opacity);
  assert.deepEqual(getWorkbench(events, new Date('2026-10-01T12:00:00Z')), []);
  const revived = normalizeEvents([event('2', '2026-10-01T11:00:00Z'), event('1', '2026-09-01T12:00:00Z')]);
  assert.equal(getWorkbench(revived, new Date('2026-10-01T12:00:00Z'))[0].opacity, 1);
});

test('keeps only six projects at the front and ignores future activity', () => {
  const events = normalizeEvents(Array.from({ length: 8 }, (_, index) =>
    event(String(index), `2026-09-${18 - index}T10:00:00Z`, { repo: { name: `Milbaxter/project-${index}` } })
  ));
  events.push({ repo: 'Milbaxter/future', at: '2027-01-01T00:00:00Z' });
  const projects = getWorkbench(events, new Date('2026-09-18T12:00:00Z'));
  assert.equal(projects.length, 8);
  assert.equal(projects.filter(project => !project.past).length, 6);
  assert.equal(projects[0].name, 'Milbaxter/project-0');
});
