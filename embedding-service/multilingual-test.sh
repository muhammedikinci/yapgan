#!/bin/bash

# Multilingual FastEmbed Test

echo "=== FastEmbed Multilingual Test ==="
echo ""

EMBEDDING_URL="http://localhost:8081"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "${YELLOW}1. Turkish (Türkçe)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python Öğrenme Notları",
    "content": "Python programlama dili öğrenmek için temel kavramları anlamak gerekir. Değişkenler, fonksiyonlar ve sınıflar önemlidir."
  }' | jq '{dimension: .dimension, first_3: .embedding[:3]}'
echo ""

echo "${YELLOW}2. English${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Hooks Guide",
    "content": "React Hooks are functions that let you use state and other React features without writing a class."
  }' | jq '{dimension: .dimension, first_3: .embedding[:3]}'
echo ""

echo "${YELLOW}3. Chinese (中文)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "机器学习基础",
    "content": "机器学习是人工智能的一个分支，它使计算机能够从数据中学习而无需明确编程。"
  }' | jq '{dimension: .dimension, first_3: .embedding[:3]}'
echo ""

echo "${YELLOW}4. Japanese (日本語)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "プログラミング入門",
    "content": "プログラミングは、コンピュータに指示を与えるためのコードを書くプロセスです。"
  }' | jq '{dimension: .dimension, first_3: .embedding[:3]}'
echo ""

echo "${YELLOW}5. Arabic (العربية)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "تعلم البرمجة",
    "content": "البرمجة هي عملية كتابة التعليمات التي يتبعها الكمبيوتر لأداء مهام محددة."
  }' | jq '{dimension: .dimension, first_3: .embedding[:3]}'
echo ""

echo "${YELLOW}6. Russian (Русский)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Основы программирования",
    "content": "Программирование - это процесс написания инструкций, которым следует компьютер для выполнения задач."
  }' | jq '{dimension: .dimension, first_3: .embedding[:3]}'
echo ""

echo "${YELLOW}7. Spanish (Español)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fundamentos de programación",
    "content": "La programación es el proceso de escribir instrucciones que la computadora sigue para realizar tareas."
  }' | jq '{dimension: .dimension, first_3: .embedding[:3]}'
echo ""

echo "${YELLOW}8. Mixed Languages (Karma - Türkçe + İngilizce)${NC}"
curl -s -X POST "$EMBEDDING_URL/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Hooks Kullanımı",
    "content": "React Hooks, functional components içinde state ve lifecycle kullanmamızı sağlar. useState ve useEffect en yaygın hooks'lardır."
  }' | jq '{dimension: .dimension, first_3: .embedding[:3]}'
echo ""

echo "${GREEN}All tests completed! ✅${NC}"
echo ""
echo "${YELLOW}Note: All embeddings have dimension 1024 ${NC}"
