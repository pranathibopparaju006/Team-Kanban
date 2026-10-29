@echo off
setlocal
cd /d "%~dp0.."
echo [1/4] Checking Node.js...
node -v >nul 2>&1 || (echo Node.js is required. Install Node.js LTS first.&pause&exit /b 1)
echo [2/4] Installing dependencies...
call npm install || (echo npm install failed.&pause&exit /b 1)
if not exist .env copy .env.example .env
echo [3/4] IMPORTANT: Import database/schema.sql and database/seed.sql into MySQL/XAMPP.
echo [4/4] Starting TeamKanban...
call npm start
