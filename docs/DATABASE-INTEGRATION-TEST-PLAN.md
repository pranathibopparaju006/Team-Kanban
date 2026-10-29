# Database Integration Tests

The MySQL-backed integration suite in `tests/mysql-task.integration.test.js` runs against a disposable MySQL 8 service in GitHub Actions.

Covered cases:
- A project member creates a task and the task row persists in MySQL.
- A non-member receives HTTP 403 when trying to create a task in that project; no task row is written.
- An invalid task title returns HTTP 400 without writing a row.

Workflow: [MySQL integration tests](../.github/workflows/mysql-integration.yml).

Remaining coverage gaps:
- Socket.IO project-room membership authorization.
- Task update and delete authorization against the database.
- Browser-based end-to-end testing of the full UI.

CI database credentials are only for the disposable workflow service. Never reuse them in production.
