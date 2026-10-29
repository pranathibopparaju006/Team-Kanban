# TeamKanban — Enterprise Workflow & Project Operations Platform

A major-project/internship-ready full-stack Kanban and project operations platform rebuilt from the original Project Workspace concept. The final architecture uses HTML5/CSS3/JavaScript, Node.js/Express REST APIs, Socket.IO for real-time events, MySQL 8, and a PHP integration layer for reports/activity/export.

## Core capabilities
- Authentication with JWT + bcrypt
- Role-based access control
- Projects and project membership
- Kanban workflow: To Do → In Progress → Review → Done
- Drag-and-drop status changes
- Task priorities, types, assignees and due dates
- Activity/audit log
- Comments and notifications schema/API
- Dashboard metrics and team workload
- Socket.IO real-time task updates
- PHP reporting/activity/CSV export APIs
- Prepared SQL statements and Helmet security headers
- Responsive UI

## Stack
Frontend: HTML5, CSS3, Vanilla JS, Fetch API
Backend: Node.js, Express.js, Socket.IO
Database: MySQL 8 / MariaDB
Integration: PHP 8+
Security: JWT, bcrypt, prepared statements, Helmet, CORS

## Windows + XAMPP setup
1. Install Node.js LTS and XAMPP (Apache + MySQL).
2. Start MySQL in XAMPP.
3. Open phpMyAdmin and import `database/schema.sql`, then `database/seed.sql`.
4. Copy `.env.example` to `.env` and set your MySQL password if needed.
5. Run `scripts/setup-windows.bat` once, or run `npm install` manually.
6. Run `scripts/start.bat`.
7. Open http://localhost:5000/login.html

Demo login:
Email: pranathi@teamkanban.local
Password: password

## PHP integration
Copy the `php` folder into XAMPP's htdocs, for example:
`C:\xampp\htdocs\teamkanban\php`

Then reports can be called from:
`http://localhost/teamkanban/php/api/reports.php?project_id=1`
`http://localhost/teamkanban/php/api/activity.php?project_id=1`
`http://localhost/teamkanban/php/api/export.php?project_id=1`

PHP reads the same MySQL database. For CLI/Apache environment variables, set DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD as appropriate.

## Architecture
Browser → Node/Express REST API → MySQL
Browser → Socket.IO → Node → project room events
Browser/Reports → PHP integration API → MySQL

## Important
The project is intentionally supplied as source code. A Windows `.exe` is not the correct deployment unit for a Node/PHP/MySQL web application. The included `.bat` launchers are the reliable local Windows entry points; if an installer/executable is required, package the Node service separately after configuring the target environment.
