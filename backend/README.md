# Yapgan Backend

Go-based backend API for Yapgan knowledge management platform.

## Tech Stack

- **Language**: Go 1.21+
- **Framework**: Echo v4
- **Database**: PostgreSQL 15+ (metadata, relations)
- **Vector DB**: Qdrant (semantic search)
- **Auth**: JWT
- **Configuration**: Viper (TOML-based)

## Project Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go              # Entry point
├── internal/
│   ├── auth/                    # Authentication & authorization
│   ├── chat/                    # AI chat functionality
│   ├── notes/                   # Notes CRUD & management
│   ├── usage/                   # Usage tracking
│   └── server/                  # HTTP server setup
├── config/
│   └── config.go                # Viper configuration loader
├── .conf/
│   ├── dev.toml                 # Development config
│   ├── prod.toml                # Production config (gitignored)
│   └── local.toml               # Local custom config (gitignored)
├── migrations/                  # SQL migration files
├── go.mod                       # Go module definition
└── go.sum                       # Dependency checksums
```

## Setup

### Prerequisites

- Go 1.21 or higher
- Docker & Docker Compose (for PostgreSQL & Qdrant)

### Environment Configuration

Configuration is managed via TOML files in `.conf/` directory.

```bash
# Development (uses .conf/dev.toml)
ENV=dev go run cmd/api/main.go

# Production (uses .conf/prod.toml)
ENV=prod go run cmd/api/main.go

# Custom local config (uses .conf/local.toml)
ENV=local go run cmd/api/main.go
```

### Running Locally

```bash
# 1. Start databases (from project root)
cd ..
docker-compose up -d

# 2. Run backend
cd backend
ENV=dev go run cmd/api/main.go

# 3. Build binary
go build -o bin/yapgan cmd/api/main.go
ENV=dev ./bin/yapgan
```

## API Endpoints

### Notes

- `POST /api/notes` - Create note
- `GET /api/notes` - List notes (pagination, search, filter)
- `GET /api/notes/:id` - Get single note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/share` - Toggle public sharing
- `GET /api/notes/:id/backlinks` - Get linked notes
- `GET /api/notes/:id/versions` - Get version history
- `GET /api/notes/:id/versions/:v1/diff/:v2` - Get diff
- `POST /api/notes/:id/restore` - Restore version

### Tags

- `GET /api/tags` - List all tags
- `DELETE /api/tags/:id` - Delete tag

### Search

- `POST /api/search` - Semantic search

### Graph

- `GET /api/graph` - Get note graph data

### Chat

- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/conversations/:id/messages` - Send message
- `GET /api/chat/conversations/:id/messages` - Get messages

### Stats

- `GET /api/stats` - Get user statistics

### Public

- `GET /public/:slug` - Get public note (no auth)

## Configuration

Example `.conf/dev.toml`:

```toml
[server]
port = "8080"

[database]
host = "localhost"
port = "5432"
user = "postgres"
password = "postgres"
name = "yapgan"
sslmode = "disable"

[jwt]
secret = "your-32-char-secret-here-min"
refresh_secret = "your-32-char-refresh-secret"
access_token_expiry = "15m"
refresh_token_expiry = "168h"

[cors]
allowed_origins = ["http://localhost:3000", "http://localhost:5173"]

[pagination]
default_page_size = 20
max_page_size = 100

[qdrant]
host = "localhost"
port = "6333"
collection_name = "notes"
vector_size = 384
```

## Architecture Patterns

### Consumer-Defined Interfaces

Interfaces are defined by the consumer (service), not by the implementation (repository).

Example:

```go
// service.go (consumer defines interface)
type NoteRepository interface {
    Create(ctx context.Context, note *Note) error
    FindByID(ctx context.Context, id string) (*Note, error)
}

// repository.go (implementation)
type PostgresNoteRepository struct {
    db *pgxpool.Pool
}
```

### Dependency Injection

Manual dependency injection in `cmd/api/main.go`:

```go
// Initialize repositories
noteRepo := notes.NewPostgresNoteRepository(db)
tagRepo := notes.NewPostgresTagRepository(db)

// Initialize services
noteService := notes.NewService(noteRepo, tagRepo, vectorStore)

// Initialize handlers
noteHandler := notes.NewHandler(noteService)
```

## Testing

```bash
# Run tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package
go test ./internal/notes/...
```

## Deployment

See main project README for Docker Compose deployment instructions.

## License

MIT
