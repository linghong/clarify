#!/bin/bash
AI_LOCAL_DIR="$HOME/ai-local-server"
REMOTE_REPO="https://github.com/linghong/smartchat-local.git"
REMOTE_VERSION_URL="https://raw.githubusercontent.com/linghong/smarchat-local/main/version.txt"
LOCAL_VERSION_FILE="$PYTHON_SERVER_DIR/version.txt"

# 🟢 Check if the Python server already exists
if [ -d "$AI_LOCAL_DIR" ]; then
    echo "🔄 Local AI server already exists. Checking for updates..."
    
    # Fetch the remote version
    REMOTE_VERSION=$(curl -s $REMOTE_VERSION_URL)
    
    # Read the local version
    if [ -f "$LOCAL_VERSION_FILE" ]; then
        LOCAL_VERSION=$(cat $LOCAL_VERSION_FILE)
    else
        LOCAL_VERSION="0.0.0"
    fi

    # Compare versions
    if [ "$LOCAL_VERSION" != "$REMOTE_VERSION" ]; then
        echo "🚀 New version available: $REMOTE_VERSION (Current: $LOCAL_VERSION)"
        echo "Updating AI Local server..."
        cd "$AI_LOCAL_DIR"
        git pull origin main
    else
        echo "✅ AI Local server is up to date (Version: $LOCAL_VERSION)"
    fi
else
    echo "📥 Cloning the AI Local server..."
    git clone "$REMOTE_REPO" "$AI_LOCAL_DIR"  
    cd "$AI_LOCAL_DIR"
fi

# Create virtual environment without activation
echo "🔨 Setting up Python virtual environment..."
python3 -m venv venv

echo "📦 Installing dependencies..."
./venv/bin/pip install -r requirements.txt --no-cache-dir

# Restart the Python server if it's already running
if pgrep -f "uvicorn server:app" > /dev/null; then
    echo "🔄 Restarting Python server..."
    pkill -f "uvicorn server:app"
    sleep 2 #wait for the process to fully stop
fi

echo "🚀 Starting the AI Local server..."
nohup ./venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000 --reload > server.log 2>&1 &

echo "✅ Setup complete! The AI Local server is running at http://localhost:8000"
