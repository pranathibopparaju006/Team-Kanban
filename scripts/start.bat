@echo off
cd /d "%~dp0.."
if not exist node_modules (echo Run setup-windows.bat first.&pause&exit /b 1)
call npm start
