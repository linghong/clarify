@echo off
set AI_LOCAL_DIR=%USERPROFILE%\ai-local-server
set REMOTE_REPO=https://github.com/linghong/smartchat-local.git
set REMOTE_VERSION_URL=https://raw.githubusercontent.com/linghong/smartchat-local/main/version.txt
set LOCAL_VERSION_FILE=%AI_LOCAL_DIR%\version.txt

REM 🟢 Check if the AI Local server already exists
if exist "%AI_LOCAL_DIR%" (
    echo 🔄 Checking for updates...
    

    REM 🟢 Fetch the latest version from GitHub
    for /f %%i in ('powershell -command "(New-Object System.Net.WebClient).DownloadString('%REMOTE_VERSION_URL%')"') do set REMOTE_VERSION=%%i
    
    REM 🟢 Read the local version
    if exist "%LOCAL_VERSION_FILE%" (
        set /p LOCAL_VERSION=<"%LOCAL_VERSION_FILE%"
    ) else (
        set LOCAL_VERSION=0.0.0
    )

    REM 🟢 Compare versions
    if not "%LOCAL_VERSION%"=="%REMOTE_VERSION%" (
        echo 🚀 New version available: %REMOTE_VERSION% (Current: %LOCAL_VERSION%)
        echo Updating AI Local server...
        cd "%AI_LOCAL_DIR%"
        git pull origin main
    ) else (
        echo ✅ AI Local server is up to date (Version: %LOCAL_VERSION%)
    )
) else (
    echo 📥 Cloning AI Local server...
    git clone "%REMOTE_REPO%" "%AI_LOCAL_DIR%"
    cd "%AI_LOCAL_DIR%"
)

REM Create virtual environment without activation
echo 🔨 Setting up Python virtual environment...
python -m venv venv

REM Install dependencies
echo 📦 Installing dependencies...
.\venv\Scripts\pip install -r requirements.txt --no-cache-dir

REM Kill any running server and restart
taskkill /F /IM python.exe /T >nul 2>nul
timeout /t 2 >nul

REM Start AI Local server
echo 🚀 Starting AI Local server...
start /b .\venv\Scripts\uvicorn server:app --host 127.0.0.1 --port 8000 --reload

echo ✅ AI Local server running at http://localhost:8000
pause
