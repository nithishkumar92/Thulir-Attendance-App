@echo off
cd /d "%~dp0"
echo Starting Eternal Ride ERP...
echo.

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error installing dependencies. Please check your internet connection or Node.js installation.
        pause
        exit /b %errorlevel%
    )
)

echo.
echo Starting Development Server...
echo.
echo Access the app at the Local or Network URL shown below.
echo Press Ctrl+C to stop the server.
echo.

call npm run dev -- --host

pause
