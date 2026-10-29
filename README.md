# TeamKanban — Team Workflow & Project Management Platform

A full-stack web application for organizing projects, assigning tasks, and tracking work through a collaborative Kanban workflow.

## Screenshots

### Dashboard
![TeamKanban Dashboard](screenshots/dashboard.png)

### My Tasks
![My Tasks](screenshots/my-tasks.png)

### Kanban Board
![Kanban Board](screenshots/kanban-board.png)

### Recent Activity
![Recent Activity](screenshots/recent-activity.png)

## Features

- Project and task management with role-based access
- Kanban workflow: To Do, In Progress, Review, and Done
- Task priorities, descriptions, and due dates
- Task search, filtering, and personal task views
- Dashboard metrics and recent activity
- REST API backed by MySQL
- JWT-based authentication
- Socket.IO integration for real-time events
- Responsive HTML, CSS, and JavaScript interface
- Automated Node.js syntax checks through GitHub Actions

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL 8 |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Real-time events | Socket.IO |
| Security middleware | Helmet |
| Quality checks | Node.js `--check`, GitHub Actions |

## Architecture

```text
Browser UI (HTML/CSS/JavaScript)
            |
            v
    Express REST API
      |          |
      v          v
   MySQL     JWT / Roles
      |
      v
Project, task, user and activity data
```

## Run Locally

### Prerequisites

- Node.js 20 or a compatible supported version
- MySQL 8
- Git

### 1. Clone the repository

```bash
git clone https://github.com/pranathibopparaju006/Team-Kanban.git
cd Team-Kanban
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and set the values for your local database and authentication secret. Use a unique, strong JWT secret; do not commit `.env` or real credentials.

### 4. Start MySQL

Start your local MySQL 8 service and ensure the database and credentials match your `.env` configuration. If your setup uses a pre-created Docker database container, start that container instead.

### 5. Start the application

```bash
npm start
```

Open [http://localhost:5000](http://localhost:5000) if that is the port configured by your server.

### Run the automated checks

```bash
npm run check
```

This checks JavaScript syntax for the server, authentication middleware, API routes, and frontend script. It is not a substitute for database-backed integration or end-to-end tests.

## Project Structure

```text
Team-Kanban/
├── backend/
│   └── src/
│       ├── middleware/
│       ├── routes/
│       └── server.js
├── frontend/
│   ├── css/
│   ├── js/
│   ├── index.html
│   └── login.html
├── php/
│   └── api/
├── docs/
├── scripts/
├── screenshots/
├── .env.example
├── .github/workflows/
├── package.json
└── README.md
```

## Security Notes

- Keep environment files and credentials out of version control.
- Use a strong, unique JWT secret in production.
- API routes enforce authentication and role checks; project membership is checked for relevant task operations.
- Automated checks currently validate syntax. Run functional tests against a configured test database before production use.

## Future Improvements

- Add automated API integration tests with a disposable test database
- Add end-to-end tests for login, project membership, and task workflows
- Add deployment configuration and operational monitoring
- Improve accessibility and mobile usability

## Author

**B. Sai Krishna Pranathi**  
GitHub: [pranathibopparaju006](https://github.com/pranathibopparaju006)
