#!/bin/bash

# Test FastEmbed Embedding Service

echo "=== FastEmbed Service Test ==="
echo ""

EMBEDDING_URL="http://localhost:8081"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${YELLOW}1. Health Check${NC}"
curl -s "$EMBEDDING_URL/health" | jq .
echo ""
echo ""

echo "${YELLOW}2. Generate Embedding (English)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Hooks Guide",
    "content": "React Hooks are functions that let you use state and other React features without writing a class."
  }' | jq '{dimension: .dimension, first_5_values: .embedding[:5]}'
echo ""
echo ""

echo "${YELLOW}3. Generate Embedding (Turkish)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python Öğrenme Notları",
    "content": "Python programlama dili öğrenmek için temel kavramları anlamak gerekir. Değişkenler, fonksiyonlar ve sınıflar önemlidir."
  }' | jq '{dimension: .dimension, first_5_values: .embedding[:5]}'
echo ""
echo ""

echo "${YELLOW}4. Error Test (Empty Content)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "",
    "content": ""
  }' | jq .
echo ""
echo ""

echo "${GREEN}Test completed!${NC}"
