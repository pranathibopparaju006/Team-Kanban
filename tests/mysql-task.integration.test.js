const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
const { JWT_SECRET } = require('../backend/src/middleware/auth');

const PORT = 5274;
const BASE = `http://127.0.0.1:${PORT}/api/v1`;
let db;
let server;
let memberToken;
let outsiderToken;

async function waitForServer(child) {
  let output = '';
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 15000);
    child.stdout.on('data', chunk => {
      output += chunk.toString();
      if (output.includes('TeamKanban running')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on('data', chunk => { output += chunk.toString(); });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Server exited with ${code}: ${output}`));
    });
  });
}

async function api(pathname, token, body) {
  return fetch(BASE + pathname, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test.before(async () => {
  db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpass',
    database: process.env.DB_NAME || 'teamkanban_test',
  });

  await db.query('CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(190) NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(30) NOT NULL, is_active TINYINT NOT NULL DEFAULT 1) ENGINE=InnoDB');
  await db.query('CREATE TABLE projects (id INT PRIMARY KEY, owner_id INT NOT NULL, name VARCHAR(255) NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
  await db.query('CREATE TABLE project_members (project_id INT NOT NULL, user_id INT NOT NULL, PRIMARY KEY(project_id,user_id)) ENGINE=InnoDB');
  await db.query("CREATE TABLE tasks (id INT PRIMARY KEY AUTO_INCREMENT, project_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, type VARCHAR(30) NOT NULL DEFAULT 'task', status VARCHAR(30) NOT NULL DEFAULT 'todo', priority VARCHAR(30) NOT NULL DEFAULT 'medium', assignee_id INT NULL, reporter_id INT NOT NULL, due_date DATE NULL, estimate_hours DECIMAL(8,2) NULL, actual_hours DECIMAL(8,2) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB");
  await db.query('CREATE TABLE activity_logs (id INT PRIMARY KEY AUTO_INCREMENT, project_id INT NOT NULL, task_id INT NULL, user_id INT NULL, action VARCHAR(100) NOT NULL, message TEXT NOT NULL, metadata JSON NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
  await db.query('CREATE TABLE subtasks (id INT PRIMARY KEY AUTO_INCREMENT, task_id INT NOT NULL, is_done TINYINT NOT NULL DEFAULT 0) ENGINE=InnoDB');

  await db.execute('INSERT INTO users(id,name,email,password_hash,role) VALUES (1,?,?,?,?),(2,?,?,?,?)', [
    'CI Member', 'ci-member@example.test', 'unused', 'member',
    'CI Outsider', 'ci-outsider@example.test', 'unused', 'member',
  ]);
  await db.execute('INSERT INTO projects(id,owner_id,name) VALUES (101,1,?),(202,2,?)', ['Member project', 'Other project']);
  await db.execute('INSERT INTO project_members(project_id,user_id) VALUES (101,1),(202,2)');
  memberToken = jwt.sign({ id: 1, name: 'CI Member', email: 'ci-member@example.test', role: 'member' }, JWT_SECRET, { expiresIn: '5m' });
  outsiderToken = jwt.sign({ id: 2, name: 'CI Outsider', email: 'ci-outsider@example.test', role: 'member' }, JWT_SECRET, { expiresIn: '5m' });

  server = spawn(process.execPath, [path.join(__dirname, '../backend/src/server.js')], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', JWT_SECRET },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer(server);
});

test.after(async () => {
  if (server && server.exitCode === null) server.kill('SIGTERM');
  if (db) await db.end();
});

test('project member creates a task that persists in MySQL', async () => {
  const response = await api('/projects/101/tasks', memberToken, {
    title: 'CI integration task',
    description: 'Created by the automated integration suite',
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  const [rows] = await db.execute('SELECT title,project_id,reporter_id FROM tasks WHERE id=?', [result.id]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'CI integration task');
  assert.equal(rows[0].project_id, 101);
  assert.equal(rows[0].reporter_id, 1);
});

test('non-member cannot create a task in another project', async () => {
  const response = await api('/projects/101/tasks', outsiderToken, { title: 'Forbidden task' });
  assert.equal(response.status, 403);
  const [rows] = await db.execute('SELECT id FROM tasks WHERE title=?', ['Forbidden task']);
  assert.equal(rows.length, 0);
});

test('invalid task title is rejected before writing to MySQL', async () => {
  const response = await api('/projects/101/tasks', memberToken, { title: '   ' });
  assert.equal(response.status, 400);
  const [rows] = await db.execute('SELECT id FROM tasks WHERE title=?', ['   ']);
  assert.equal(rows.length, 0);
});


test('Socket.IO rejects project-room join for a non-member', async () => {
  const socket = io(`http://127.0.0.1:${PORT}`, {
    auth: { token: outsiderToken },
    transports: ['websocket'],
    reconnection: false,
    timeout: 3000,
  });
  try {
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    const denied = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Expected project:error event')), 3000);
      socket.once('project:error', payload => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });
    socket.emit('project:join', 101);
    const payload = await denied;
    assert.equal(payload.error, 'Project membership required');
  } finally {
    socket.close();
  }
});


test('project member can update a task and changes persist in MySQL', async () => {
  const created = await api('/projects/101/tasks', memberToken, { title: 'Task to update' });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  const response = await fetch(`${BASE}/tasks/${createdBody.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done', title: 'Updated task title' }),
  });
  assert.equal(response.status, 200);
  const [rows] = await db.execute('SELECT title,status FROM tasks WHERE id=?', [createdBody.id]);
  assert.equal(rows[0].title, 'Updated task title');
  assert.equal(rows[0].status, 'done');
});

test('non-member cannot update another project task', async () => {
  const created = await api('/projects/101/tasks', memberToken, { title: 'Protected task' });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  const response = await fetch(`${BASE}/tasks/${createdBody.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${outsiderToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  });
  assert.equal(response.status, 403);
  const [rows] = await db.execute('SELECT status FROM tasks WHERE id=?', [createdBody.id]);
  assert.equal(rows[0].status, 'todo');
});


test('member role cannot delete a task', async () => {
  const created = await api('/projects/101/tasks', memberToken, { title: 'Protected delete task' });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  const response = await fetch(`${BASE}/tasks/${createdBody.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  assert.equal(response.status, 403);
  const [rows] = await db.execute('SELECT id FROM tasks WHERE id=?', [createdBody.id]);
  assert.equal(rows.length, 1);
});

test('invalid task status and priority are rejected without database writes', async () => {
  for (const [title, body] of [
    ['Invalid status task', { title: 'Invalid status task', status: 'completed' }],
    ['Invalid priority task', { title: 'Invalid priority task', priority: 'urgent' }],
  ]) {
    const response = await api('/projects/101/tasks', memberToken, body);
    assert.equal(response.status, 400);
    const [rows] = await db.execute('SELECT id FROM tasks WHERE title=?', [title]);
    assert.equal(rows.length, 0);
  }
});

test('task cannot be assigned to a user outside the project', async () => {
  const response = await api('/projects/101/tasks', memberToken, {
    title: 'Invalid assignee task',
    assignee_id: 2,
  });
  assert.equal(response.status, 400);
  const [rows] = await db.execute('SELECT id FROM tasks WHERE title=?', ['Invalid assignee task']);
  assert.equal(rows.length, 0);
});

test('task title longer than 255 characters is rejected without database writes', async () => {
  const title = 'x'.repeat(256);
  const response = await api('/projects/101/tasks', memberToken, { title });
  assert.equal(response.status, 400);
  const [rows] = await db.execute('SELECT id FROM tasks WHERE title=?', [title]);
  assert.equal(rows.length, 0);
});


test("invalid task status update is rejected without changing the task", async () => {
  const created = await api("/projects/101/tasks", memberToken, { title: "Status validation task" });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  const response = await fetch(`${BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${memberToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "" }),
  });
  assert.equal(response.status, 400);
  const [rows] = await db.execute("SELECT status FROM tasks WHERE id=?", [id]);
  assert.equal(rows[0].status, "todo");
});

test("invalid task priority update is rejected without changing the task", async () => {
  const created = await api("/projects/101/tasks", memberToken, { title: "Priority validation task" });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  const response = await fetch(`${BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${memberToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ priority: "" }),
  });
  assert.equal(response.status, 400);
  const [rows] = await db.execute("SELECT priority FROM tasks WHERE id=?", [id]);
  assert.equal(rows[0].priority, "medium");
});

test('comment endpoint rejects invalid task ids before querying MySQL', async () => {
  const response = await api('/tasks/not-a-number/comments', memberToken, { body: 'A valid comment' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid task id' });
});

test('comment endpoint rejects non-text bodies without a server error', async () => {
  const response = await api('/tasks/1/comments', memberToken, { body: 123 });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Comment body must be text' });
});

test('comment endpoint rejects oversized comments before querying MySQL', async () => {
  const response = await api('/tasks/1/comments', memberToken, { body: 'x'.repeat(5001) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Comment must be 5000 characters or fewer' });
});

