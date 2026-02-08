@echo off
setlocal

echo Checking Git configuration...
git config user.email >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Git user.email not set.
    set /p EMAIL="Enter your email for Git: "
    set /p NAME="Enter your name for Git: "
    git config --global user.email "%EMAIL%"
    git config --global user.name "%NAME%"
)

echo.
echo Initializing Git repository...
git init
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to initialize git repository. Is git installed?
    pause
    exit /b
)

echo Adding files...
git add .

echo Committing...
git commit -m "Initial commit for Thulir Attendance App"

echo.
echo ----------------------------------------------------------------
echo Repository initialized and committed locally.
echo.
echo To push to GitHub, run these commands manually:
echo.
echo 1. Create a repository named 'Thulir-Attendance-App' on GitHub.
echo 2. Run:
echo    git branch -M main
echo    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/Thulir-Attendance-App.git
echo    git push -u origin main
echo ----------------------------------------------------------------

pause
