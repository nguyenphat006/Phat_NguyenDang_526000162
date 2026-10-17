@echo off
rem Bam dup file nay de chay website tren may (can Node.js hoac Python).
cd /d "%~dp0"
start "" http://localhost:8000
where node >nul 2>nul
if %errorlevel%==0 (
  node tools/serve.mjs
) else (
  python -m http.server 8000
)
pause
