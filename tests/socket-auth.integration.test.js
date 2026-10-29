const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
const { JWT_SECRET } = require('../backend/src/middleware/auth');

const PORT = 5273;
const URL = `http://127.0.0.1:${PORT}`;
let server;
let serverOutput = '';

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start. Output: ${serverOutput}`)), 10000);
    child.stdout.on('data', chunk => {
      serverOutput += chunk.toString();
      if (serverOutput.includes('TeamKanban running')) { clearTimeout(timeout); resolve(); }
    });
    child.stderr.on('data', chunk => { serverOutput += chunk.toString(); });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Server exited early (${code}). Output: ${serverOutput}`));
    });
  });
}

function connectWithAuth(auth) {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { auth, timeout: 2500, reconnection: false, transports: ['websocket'] });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', error => { socket.close(); reject(error); });
    setTimeout(() => { socket.close(); reject(new Error('Socket handshake timed out')); }, 3500).unref();
  });
}

test.before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, '../backend/src/server.js')], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', JWT_SECRET },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer(server);
});

test.after(() => {
  if (server && server.exitCode === null) server.kill('SIGTERM');
});

test('Socket.IO rejects a connection without a token', async () => {
  await assert.rejects(connectWithAuth({}), /Authentication required/);
});

test('Socket.IO rejects an invalid token', async () => {
  await assert.rejects(connectWithAuth({ token: 'not-a-jwt' }), /Invalid or expired token/);
});

test('Socket.IO accepts a valid signed session token', async () => {
  const token = jwt.sign({ id: 7, role: 'member' }, JWT_SECRET, { expiresIn: '1m' });
  const socket = await connectWithAuth({ token });
  assert.equal(socket.connected, true);
  socket.close();
});
