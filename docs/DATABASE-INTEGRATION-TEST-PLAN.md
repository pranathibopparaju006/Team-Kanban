# Database Integration Test Plan

The current automated suite checks authentication and Socket.IO handshake behavior. The following MySQL-backed cases should be added before calling project/task workflows verified:

- A project member can create a task and the row persists.
- A non-member receives HTTP 403 when creating a task in that project.
- Invalid task titles return HTTP 400 and do not create rows.
- A user cannot join a Socket.IO project room without membership.
- Task update and deletion authorization are tested with separate member accounts.

Use a disposable MySQL 8 service in CI. Keep test credentials limited to the ephemeral CI service; never use production credentials. These cases are planned coverage until the tests are implemented and a workflow run passes.
