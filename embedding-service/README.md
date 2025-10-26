# FastEmbed Embedding Service

Python microservice for generating text embeddings using FastEmbed.

## Features

- **Model**: intfloat/multilingual-e5-large
- **Dimension**: 1024
- **Framework**: Flask + Gunicorn
- **Free & Offline**: No API costs, runs locally

## API Endpoints

### POST /embed

Generate embedding from note title and content.

**Request:**

```json
{
  "title": "React Hooks Guide",
  "content": "React Hooks are functions that let you use state and other React features..."
}
```

**Response:**

```json
{
  "embedding": [0.123, -0.456, 0.789, ...],  // 1024 dimensions
  "dimension": 1024
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "model": "BAAI/bge-m3"
}
```

## Local Development

### Install dependencies:

```bash
cd embedding-service
pip install -r requirements.txt
```

### Run server:

```bash
python app.py
# Server runs on http://localhost:8081
```

### Test:

```bash
curl -X POST http://localhost:8081/embed \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "Hello world"}'
```

## Docker

### Build:

```bash
docker build -t yapgan-embedding .
```

### Run:

```bash
docker run -p 8081:8081 yapgan-embedding
```

## Environment Variables

- `MODEL_NAME`: Embedding model to use
- `PORT`: Server port (default: `8081`)

## Alternative Models

### For English only (faster, smaller):

```bash
MODEL_NAME=BAAI/bge-small-en-v1.5 python app.py
```

### For multilingual (recommended):

```bash
MODEL_NAME=BAAI/bge-m3 python app.py
```

## Performance

- **Startup time**: ~10-30 seconds (model download on first run)
- **Embedding generation**: ~20-50ms per note
- **Memory usage**: ~2GB RAM
- **CPU usage**: Low (optimized with ONNX)

## Production Notes

- Model is cached in `/root/.cache/fastembed` after first download
- Use gunicorn for production (already configured in Dockerfile)
- Health check enabled for Docker/Kubernetes
- Supports concurrent requests via multiple workers
