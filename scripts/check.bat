@echo off
cd /d "%~dp0.."
call npm run check
if %errorlevel% neq 0 (echo Syntax check failed.&pause&exit /b 1)
echo Syntax checks passed.
pause
