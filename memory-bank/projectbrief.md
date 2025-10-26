# Project Brief: Yapgan

## Overview

Yapgan is a SaaS knowledge management platform that allows users to capture, organize, and search content from anywhere on the web. It provides intelligent semantic search, AI-powered chat with notes, and version control for your knowledge base.

## Core Requirements

### Target Users

- Knowledge workers
- Researchers
- Software developers
- Students and learners
- Content creators

### Problem Statement

Valuable content and insights are scattered across the web. There's no easy way to capture, organize, and intelligently search this knowledge.

### Solution

- Browser extension for one-click content capture
- Semantic search with vector embeddings
- AI chat to query your notes
- Version control (Git-like history)
- Note linking and graph visualization
- Public note sharing

## Key Differentiators

- Universal capture (works on any website)
- One-click save from browser
- Semantic search (vector-based)
- AI chat with individual notes
- Version control (time travel)
- Graph visualization

## Technical Stack

- **Backend**: Go (Echo framework + JWT)
- **Database**: PostgreSQL (metadata), Qdrant (vector DB)
- **Web UI**: React + TypeScript + Vite
- **Browser Extension**: JavaScript (Manifest V3)
- **Auth**: JWT
- **Deployment**: Docker Compose
