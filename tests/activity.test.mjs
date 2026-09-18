import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvents, summarize, countsLabel } from '../activity.mjs';

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

test('uses UTC calendar days, excludes old and future activity, and counts pushes as pushes', () => {
  const events = normalizeEvents([
    event('1', '2026-09-12T00:00:00Z'),
    event('2', '2026-09-11T23:59:59Z'),
    event('3', '2026-09-18T10:00:00Z'),
    event('4', '2026-09-18T23:00:00Z'),
  ]);
  const result = summarize(events, 7, new Date('2026-09-18T12:00:00Z'));
  assert.equal(result.events.length, 2);
  assert.equal(result.daily.length, 7);
  assert.equal(result.daily[0].count, 1);
  assert.equal(result.daily[6].count, 1);
  assert.equal(result.projects[0].latest, '2026-09-18T10:00:00Z');
  assert.equal(countsLabel(result.events), '2 pushes');
});

test('an empty window stays empty, and a larger window includes older projects', () => {
  const events = normalizeEvents([event('1', '2026-09-01T12:00:00Z')]);
  const now = new Date('2026-09-18T12:00:00Z');
  assert.equal(summarize(events, 7, now).projects.length, 0);
  assert.equal(summarize(events, 30, now).projects.length, 1);
});
