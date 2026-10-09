# Campus Synq — PowerShell Project Runner
Write-Host "==============================================================" -ForegroundColor Magenta
Write-Host "           CAMPUS SYNQ — SYSTEM LAUNCHER (PHASE 1)            " -ForegroundColor Magenta
Write-Host "==============================================================" -ForegroundColor Magenta
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$ScriptDir\run.js"
