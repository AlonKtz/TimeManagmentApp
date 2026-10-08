import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSelectQuery, validateBody, validateConflictColumns, validateDeleteList } from '../src/lib/restQuery.js';

const userId = '7db980ab-74d2-4e52-8f3a-129a91e7bcd2';

test('builds safe typed PostgREST filters and encodes them as URL parameters', () => {
  const query = buildSelectQuery('time_entries', {
    select: 'user_id,date,hours,note,mode',
    user_id: { in: [userId] },
    date: [{ gte: '2026-10-01' }, { lte: '2026-10-08' }],
    order: 'date.desc,created_at.desc',
  });
  const params = new URLSearchParams(query);
  assert.equal(params.get('user_id'), `in.(${userId})`);
  assert.deepEqual(params.getAll('date'), ['gte.2026-10-01', 'lte.2026-10-08']);
  assert.equal(params.get('order'), 'date.desc,created_at.desc');
});

test('rejects SQL/PostgREST injection through table, column, selection, or order', () => {
  assert.throws(() => buildSelectQuery('time_entries;drop table profiles', {}), /Unsupported table/);
  assert.throws(() => buildSelectQuery('profiles', { 'id) or (1=1': { eq: userId } }), /Unsupported column/);
  assert.throws(() => buildSelectQuery('profiles', { select: 'id,secret' }), /Unsupported column/);
  assert.throws(() => buildSelectQuery('profiles', { order: 'id.desc;drop table profiles' }), /Invalid order/);
});

test('rejects malformed identifiers and filters before sending requests', () => {
  assert.throws(() => buildSelectQuery('profiles', { id: { eq: `${userId},or(id.eq.${userId})` } }), /UUID/);
  assert.throws(() => buildSelectQuery('time_entries', { user_id: { in: [userId, 'x) or 1=1--'] } }), /UUID/);
  assert.throws(() => buildSelectQuery('time_entries', { date: { gte: '2026-01-01&or=1.eq.1' } }), /date/);
  assert.throws(() => buildSelectQuery('profiles', { role: { eq: 'admin' } }), /Filters are not allowed/);
});

test('constrains write columns and upsert conflict targets', () => {
  assert.doesNotThrow(() => validateBody('profiles', { role: 'admin' }));
  assert.throws(() => validateBody('profiles', { role: 'admin', 'id) or (true': userId }), /body column/);
  assert.equal(validateConflictColumns('time_entries', 'id'), 'id');
  assert.throws(() => validateConflictColumns('time_entries', 'id),select=*'), /conflict column/);
});

test('delete-in protects ID and date list filters', () => {
  assert.equal(validateDeleteList('time_entries', 'id', [userId]), `in.(${userId})`);
  assert.equal(validateDeleteList('day_overrides', 'date', ['2026-10-08']), 'in.(2026-10-08)');
  assert.equal(buildSelectQuery('time_entries', { id: { eq: 'e_1791450220123_ab123' } }), 'id=eq.e_1791450220123_ab123');
  assert.equal(buildSelectQuery('time_entries', { id: { eq: 'dayoff_2026-10-08_7db980' } }), 'id=eq.dayoff_2026-10-08_7db980');
  assert.throws(() => validateDeleteList('day_overrides', 'date', ['2026-10-08),or(true,true']), /date/);
  assert.throws(() => buildSelectQuery('time_entries', { id: { eq: 'x) or id.eq.anything' } }), /entry ID/);
});
