@echo off
setlocal
cd /d "%~dp0"

echo Configuring Git Identity...
git config --global user.email "nithishkumar92@gmail.com"
git config --global user.name "Nithish Kumar"

echo.
echo Initializing Git repository in %CD%...
git init

echo.
echo Creating initial commit...
git add .
git commit -m "Initial commit for Thulir Attendance App"

echo.
echo Setting up remote...
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/nithishkumar92/Thulir-Attendance-App.git

echo.
echo Pushing to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Success! Your code is live.
) else (
    echo.
    echo PUSH FAILED.
    echo.
    echo Common reasons:
    echo 1. No files were committed (check if 'git commit' succeeded above).
    echo 2. You are not logged in (credential manager should pop up).
    echo 3. The repository does not exist on GitHub yet.
)
pause
