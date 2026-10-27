@echo off
title TradeTrack App Launcher
echo ========================================================
echo        Starting TradeTrack Full-Stack Application
echo ========================================================
echo.
cd /d "%~dp0TradeTrack_Backend"
echo Starting Node.js backend server on http://localhost:5000 ...
start http://localhost:5000
node server.js
pause
