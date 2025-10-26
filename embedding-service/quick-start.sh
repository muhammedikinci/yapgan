#!/bin/bash

# Yapgan Embedding Service - Quick Start
# Bu script embedding service'i hızlıca başlatır

clear

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🚀 Yapgan Embedding Service Quick Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if already running
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Embedding service zaten çalışıyor!"
    echo ""
    echo "📊 Durum:"
    curl -s http://localhost:8081/health | python3 -m json.tool
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Komutlar:"
    echo "  • Durdur: pkill -f 'python.*app.py'"
    echo "  • Test:   ./test-local.sh"
    echo ""
    exit 0
fi

echo "📦 Kurulum kontrol ediliyor..."

# Check venv
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment bulunamadı!"
    echo ""
    echo "Kurulum için:"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

echo "✅ Virtual environment mevcut"

# Check if model is cached
if [ -d "$HOME/.cache/fastembed" ]; then
    echo "✅ Model cache mevcut (hızlı başlatılacak)"
    START_TIME="~10 saniye"
else
    echo "⚠️  Model ilk kez indirilecek (~2.24GB)"
    echo "   İndirme süresi: 5-10 dakika"
    START_TIME="5-10 dakika"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Model: intfloat/multilingual-e5-large (1024d)"
echo "🔌 Port:  8081"
echo "⏱️  Başlatma: $START_TIME"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Devam etmek için Enter'a basın (Ctrl+C ile iptal)..."

echo ""
echo "🚀 Servis başlatılıyor..."
echo ""

# Start service
./start.sh
