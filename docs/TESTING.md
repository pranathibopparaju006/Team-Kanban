# Verification Checklist

| ID | Test | Expected |
|---|---|---|
| TK-001 | Login with valid credentials | JWT returned |
| TK-002 | Login with invalid password | 401 |
| TK-003 | GET projects | Project list returned |
| TK-004 | Create task with empty title | 400 |
| TK-005 | Create task | Row persisted in MySQL |
| TK-006 | Drag task to another lane | PATCH succeeds + board refreshes |
| TK-007 | Task update | Socket event emitted |
| TK-008 | Delete task as member | 403 |
| TK-009 | PHP report | JSON summary returned |
| TK-010 | PHP export | CSV download |
| TK-011 | XSS-like task title | Escaped in browser |
| TK-012 | SQL injection input | Treated as parameter data |
