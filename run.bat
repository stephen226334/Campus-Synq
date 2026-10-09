@echo off
setlocal
title Campus Synq — Master Runner

echo ==============================================================
echo           CAMPUS SYNQ — SYSTEM LAUNCHER (PHASE 1)
echo ==============================================================
echo.
echo Starting Campus Synq Backend (Port 5000)...
echo Starting Campus Synq Frontend (Port 5173)...
echo.

node "%~dp0run.js"

pause
