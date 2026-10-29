# TeamKanban Final Architecture

## Layers
1. Presentation: responsive HTML/CSS/Vanilla JS.
2. Application API: Node.js + Express REST endpoints.
3. Real-time transport: Socket.IO project rooms.
4. Integration: PHP endpoints for reporting, activity and CSV export.
5. Persistence: MySQL relational database.

## Security
- Passwords are stored as bcrypt hashes.
- JWTs protect application API routes.
- SQL uses prepared statements.
- Output rendered into task cards is HTML-escaped.
- Helmet adds security response headers.
- Role middleware protects destructive task operations.

## Workflow
A task is created through POST /api/v1/projects/:id/tasks. Node validates input, persists it in MySQL, creates an activity record and returns JSON. Status updates use PATCH /api/v1/tasks/:id and broadcast a Socket.IO event to the project room.
