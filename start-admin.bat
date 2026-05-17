@echo off
:: Auto-elevate to admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell start -verb runas "%~0" 2>&1
    exit /b
)

cd /d "%~dp0"
echo [Clean] Removing dist...
rmdir /s /q dist 2>nul
echo [Build] Building production...
call npx vite build >nul 2>&1
call npx tsc -p tsconfig.electron.json >nul 2>&1
echo [Build] Done.
echo [Launch] Starting Electron (admin)...
node node_modules\electron\cli.js .
