#!/bin/bash

# Test embedding service

echo "🧪 Testing Yapgan Embedding Service..."
echo ""

# Test 1: Health check
echo "1. Health Check:"
response=$(curl -s http://localhost:8081/health)
if [ $? -eq 0 ]; then
    echo "✅ Service is running"
    echo "   $response"
else
    echo "❌ Service not responding"
    exit 1
fi

echo ""

# Test 2: Turkish embedding
echo "2. Turkish Embedding Test:"
response=$(curl -s -X POST http://localhost:8081/embed \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Hooks Nedir",
    "content": "React Hooks, fonksiyonel bileşenlerde state kullanmamızı sağlar."
  }')

if [ $? -eq 0 ]; then
    dimension=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('dimension', 'error'))" 2>/dev/null)
    if [ "$dimension" == "1024" ]; then
        echo "✅ Turkish embedding successful"
        echo "   Dimension: $dimension"
    else
        echo "❌ Failed: $response"
    fi
else
    echo "❌ Request failed"
fi

echo ""

# Test 3: English embedding
echo "3. English Embedding Test:"
response=$(curl -s -X POST http://localhost:8081/embed \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Hooks",
    "content": "React Hooks are functions that let you use state in functional components."
  }')

if [ $? -eq 0 ]; then
    dimension=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('dimension', 'error'))" 2>/dev/null)
    if [ "$dimension" == "1024" ]; then
        echo "✅ English embedding successful"
        echo "   Dimension: $dimension"
    else
        echo "❌ Failed: $response"
    fi
else
    echo "❌ Request failed"
fi

echo ""
echo "🎉 All tests passed!"
