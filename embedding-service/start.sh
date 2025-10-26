#!/bin/bash

# Embedding Service Starter Script
# Run with: ./start.sh

cd "$(dirname "$0")"

echo "🚀 Starting Yapgan Embedding Service..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export MODEL_NAME=intfloat/multilingual-e5-large
export PORT=8081

echo "📦 Model: $MODEL_NAME"
echo "🔌 Port: $PORT"
echo ""
echo "⏳ Loading model (this may take 10-60s on first run)..."
echo "   Model will be downloaded to: ~/.cache/fastembed/"
echo ""

# Start the Flask app
python app.py
