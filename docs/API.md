# API Quick Reference

Base: `/api/v1`

GET /health
POST /auth/login
GET /me
GET /projects
GET /projects/:id/tasks
POST /projects/:id/tasks
PATCH /tasks/:id
DELETE /tasks/:id (admin/manager/lead)
GET /projects/:id/activity
GET /projects/:id/analytics
GET /projects/:id/notifications
GET /projects/:id/comments
POST /tasks/:id/comments

All protected endpoints use `Authorization: Bearer <JWT>`.
