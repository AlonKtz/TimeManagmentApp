import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorkdayEntries } from '../src/utils/workedHours.js';

const day = [
  { id: 'office-am', hours: 3, start: '09:00', end: '12:00', location: 'office', note: '' },
  { id: 'home-pm', hours: 4, start: '13:00', end: '17:00', location: 'home', note: '' },
  { id: 'home-manual', hours: 0.5, start: null, end: null, location: 'home', note: 'תיקון ידני' },
  { id: 'sick_qa', hours: 8, start: null, end: null, location: 'office', note: 'יום מחלה' },
  { id: 'dayoff_qa', hours: 9, start: null, end: null, location: 'home', note: 'יום חופש' },
  { id: 'miluim_qa', hours: 9, start: null, end: null, location: 'office', note: 'מילואים' },
  { id: 'other-location', hours: 10, start: '08:00', end: '18:00', location: 'client', note: '' },
];

test('counts only recorded office/home work hours and sums split sessions', () => {
  const result = summarizeWorkdayEntries(day);

  assert.equal(result.decimal, 7.5);
  assert.equal(result.start, '9:00');
  assert.equal(result.end, '17:00');
  assert.match(result.note, /יום מחלה/);
  assert.match(result.note, /יום חופש/);
  assert.match(result.note, /מילואים/);
});

test('leave-only entries keep their note but add no worked time', () => {
  const result = summarizeWorkdayEntries([
    { id: 'sick_qa', hours: 8, start: null, end: null, location: 'office', note: 'יום מחלה' },
  ]);

  assert.equal(result.decimal, 0);
  assert.equal(result.start, '');
  assert.equal(result.end, '');
  assert.equal(result.note, 'יום מחלה');
});

test('unrecognized locations are not counted as office/home work', () => {
  const result = summarizeWorkdayEntries([
    { id: 'client', hours: 6, start: '09:00', end: '15:00', location: 'client', note: '' },
  ]);

  assert.equal(result.decimal, 0);
  assert.equal(result.start, '');
  assert.equal(result.end, '');
});