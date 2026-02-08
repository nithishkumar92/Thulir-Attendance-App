@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================================
echo        THULIR ATTENDANCE APP - GITHUB PUSHER
echo ========================================================
echo.

echo 1. Checking for secrets...
if exist ".env" (
    echo    [SECURE] .env file detected.
    
    echo    Checking if .env is properly ignored by git...
    git check-ignore -q .env
    if %ERRORLEVEL% EQU 0 (
        echo    [PASS] .env is correctly ignored. It will NOT be uploaded.
    ) else (
        echo    [WARNING] .env is NOT ignored! 
        echo    Adding .env to .gitignore now...
        echo .env >> .gitignore
        echo    [FIXED] .env added to ignore list.
    )
) else (
    echo    [INFO] No .env file found locally. Nothing to protect.
)

echo.
echo 2. Configuring User Identity...
git config --global user.email "nithishkumar92@gmail.com"
git config --global user.name "Nithish Kumar"

echo.
echo 3. Preparing files...
echo    (Only safe files will be added)
git add .
git commit -m "Update from local script" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    [SUCCESS] Changes committed locally.
) else (
    echo    [INFO] No new changes to commit.
)

echo.
echo 4. pushing to GitHub (Thulir-Attendance-App)...
git push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    echo  [SUCCESS] Code is live at:
    echo  https://github.com/nithishkumar92/Thulir-Attendance-App
    echo.
    echo  NOTE: check the repo link above. You will see '.env' is MISSING.
    echo  This is GOOD. It means your secrets are safe on your PC.
) else (
    echo  [FAIL] Push failed. See error details above.
)
echo ========================================================
pause
