import test from 'node:test';
import assert from 'node:assert/strict';
import { submitSignup, validateSignupInput } from '../src/lib/signup.js';

const good = { email: ' User@Example.com ', password: 'secret1', name: '  גילת טל  ' };

test('signup rejects missing fields and whitespace-only names', () => {
  for (const input of [{}, { ...good, email: '' }, { ...good, password: '' }, { ...good, name: '   ' }]) {
    assert.ok(validateSignupInput(input).error);
  }
});

test('signup normalizes email and name while preserving legitimate punctuation and Unicode', () => {
  assert.deepEqual(validateSignupInput(good).value, {
    email: 'user@example.com', password: 'secret1', name: 'גילת טל',
  });
  assert.equal(validateSignupInput({ ...good, name: "O’Neil-Smith" }).value.name, "O’Neil-Smith");
  assert.equal(validateSignupInput({ ...good, name: 'José Núñez' }).value.name, 'José Núñez');
});

test('signup rejects invalid, oversized, or control-character names', () => {
  assert.match(validateSignupInput({ ...good, name: 'x'.repeat(81) }).error, /80/);
  assert.match(validateSignupInput({ ...good, name: 'Gil\nTal' }).error, /תווי בקרה/);
});

test('signup rejects malformed or oversized email addresses', () => {
  for (const email of ['missing-at.example.com', 'a@@example.com', 'a b@example.com', `${'a'.repeat(245)}@example.com`]) {
    assert.ok(validateSignupInput({ ...good, email }).error);
  }
});

test('signup rejects passwords outside the supported length range', () => {
  assert.match(validateSignupInput({ ...good, password: '12345' }).error, /6 תווים/);
  assert.match(validateSignupInput({ ...good, password: 'x'.repeat(73) }).error, /72/);
});

test('invalid local input never reaches the auth endpoint', async () => {
  let called = false;
  const result = await submitSignup({ ...good, email: 'bad', signUp: async () => { called = true; } });
  assert.ok(result.error);
  assert.equal(called, false);
});

test('signup maps duplicate account errors into a useful message', async () => {
  const result = await submitSignup({ ...good, signUp: async () => ({ error: { code: 'user_already_exists' } }) });
  assert.match(result.error, /כבר רשומה/);
});

test('signup handles provider validation and rate-limit errors', async () => {
  const badEmail = await submitSignup({ ...good, signUp: async () => ({ error: { message: 'Invalid email address' } }) });
  const limited = await submitSignup({ ...good, signUp: async () => ({ status: 429, msg: 'Too many requests' }) });
  assert.match(badEmail.error, /כתובת האימייל אינה תקינה/);
  assert.match(limited.error, /יותר מדי בקשות/);
});

test('signup reports a backend rejection without exposing provider details or claiming an email was sent', async () => {
  const result = await submitSignup({ ...good, signUp: async () => ({ error: { message: 'Database unavailable' } }) });
  assert.match(result.error, /שגיאת שרת/);
  assert.doesNotMatch(result.error, /Database unavailable/);
  assert.doesNotMatch(result.error, /מייל|דואר/);
});

test('signup handles network failure and missing session responses', async () => {
  const offline = await submitSignup({ ...good, signUp: async () => { throw new Error('offline'); } });
  const noSession = await submitSignup({ ...good, signUp: async () => ({ user: { id: 'abc' } }) });
  assert.match(offline.error, /שרת כרגע/);
  assert.match(noSession.error, /לא הושלמה/);
});

test('successful signup returns the normalized session for the auth hook', async () => {
  const session = { access_token: 'token', user: { id: 'user-id' } };
  const result = await submitSignup({ ...good, signUp: async (email, _password, name) => {
    assert.equal(email, 'user@example.com');
    assert.equal(name, 'גילת טל');
    return session;
  } });
  assert.deepEqual(result.session, session);
});
