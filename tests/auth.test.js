const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { auth, roles, JWT_SECRET } = require('../backend/src/middleware/auth');

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('auth rejects a missing bearer token', () => {
  const res = makeResponse();
  let called = false;
  auth({ headers: {} }, res, () => { called = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
});

test('auth rejects an invalid bearer token', () => {
  const res = makeResponse();
  let called = false;
  auth({ headers: { authorization: 'Bearer invalid-token' } }, res, () => { called = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
});

test('auth attaches the verified token payload', () => {
  const token = jwt.sign({ id: 7, role: 'manager' }, JWT_SECRET, { expiresIn: '1m' });
  const req = { headers: { authorization: 'Bearer ' + token } };
  const res = makeResponse();
  let called = false;
  auth(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.user.id, 7);
  assert.equal(req.user.role, 'manager');
});

test('roles rejects a role outside the allowlist', () => {
  const res = makeResponse();
  let called = false;
  roles('admin', 'manager')({ user: { role: 'member' } }, res, () => { called = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(called, false);
});

test('roles allows a permitted role', () => {
  const res = makeResponse();
  let called = false;
  roles('admin', 'manager')({ user: { role: 'manager' } }, res, () => { called = true; });
  assert.equal(called, true);
});
