# Tech Context: Yapgan

## Technologies Used

### Backend

- **Language**: Go 1.21+
- **Framework**: Echo v4 (github.com/labstack/echo/v4)
- **HTTP Router**: Echo's built-in router
- **Middleware**: Echo middleware (CORS, Logger, Recover)

### Databases

- **PostgreSQL 15+**: Primary database for metadata, relations
- **Qdrant**: Vector database for embeddings (will be added)

### Frontend (Planned)

- **Web UI**: SvelteKit or Next.js
- **Obsidian Plugin**: TypeScript
- **Browser Extension**: JavaScript (Chrome/Brave compatible)

### Libraries & Dependencies

```
github.com/labstack/echo/v4 - Web framework
github.com/labstack/gommon - Echo utilities
github.com/jackc/pgx/v5 - PostgreSQL driver
github.com/golang-jwt/jwt/v5 - JWT handling
github.com/google/uuid - UUID generation
github.com/spf13/viper - Configuration management
golang.org/x/crypto - Password hashing (bcrypt)
golang.org/x/net - Networking
```

## Development Setup

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 15+ (to be set up)
- Qdrant (to be set up)
- Docker & Docker Compose (for deployment)

### Environment Variables

**Configuration is now managed via TOML files (Viper)**

Use the `ENV` variable to select which config to load:

```bash
# Development (uses .conf/dev.toml)
ENV=dev go run cmd/api/main.go

# Production (uses .conf/prod.toml)
ENV=prod go run cmd/api/main.go

# Custom local config (uses .conf/local.toml)
ENV=local go run cmd/api/main.go
```

**TOML Configuration Structure:**

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
secret = "min-32-chars-required"
refresh_secret = "min-32-chars-required"
access_token_expiry = "15m"
refresh_token_expiry = "168h"

[cors]
allowed_origins = ["http://localhost:3000", "http://localhost:5173"]

[pagination]
default_page_size = 20
max_page_size = 100
```

### Running Locally

```bash
# Start database
docker-compose up -d

# Development mode (default config)
ENV=dev go run cmd/api/main.go

# With custom config
cp .conf/dev.toml .conf/local.toml
# Edit local.toml
ENV=local go run cmd/api/main.go

# Build and run
go build -o bin/yapgan cmd/api/main.go
ENV=dev ./bin/yapgan
```

### Project Structure

```
yapgan/
├── cmd/
│   └── api/
│       └── main.go              # Entry point, dependency injection
├── config/
│   └── config.go                # Viper configuration loader
├── .conf/
│   ├── dev.toml                 # Development config
│   ├── prod.toml                # Production config (gitignored)
│   └── local.toml               # Local custom config (gitignored)
├── internal/
│   ├── auth/                    # Auth use case
│   ├── notes/                   # Notes use case
│   └── server/
│       └── server.go            # Echo server setup
├── pkg/
│   └── database/                # Database utilities
│       └── postgres.go          # Connection pool
├── migrations/                  # SQL migration files
├── go.mod                       # Go module definition
├── go.sum                       # Dependency checksums
├── docker-compose.yml           # Docker setup
├── .gitignore                   # Git ignore (includes .conf/prod.toml)
├── AGENTS.md                    # Cline memory bank guide
├── features.md                  # Product spec
└── memory-bank/                 # Project memory
    ├── projectbrief.md
    ├── productContext.md
    ├── systemPatterns.md
    ├── techContext.md (this file)
    ├── activeContext.md
    └── progress.md
```

## Technical Constraints

### Performance

- Search response time < 300ms (p95)
- Support 1000+ notes per user
- Handle concurrent note captures

### Scalability

- Stateless API (horizontal scaling)
- Database connection pooling
- Background job queue

### Security

- JWT-based authentication
- Password hashing with bcrypt
- User data isolation
- TLS in production
- CORS protection

### Privacy

- Self-hostable
- No data leaves user infrastructure by default
- Optional external API calls (clearly documented)
- Open source (MIT/Apache-2.0)

## Tool Usage Patterns

### No Third-Party Tools (As Specified)

- No Cobra for CLI
- No DI frameworks (manual injection)
- No ORM initially (may use sqlx later if needed)
- No scaffolding tools

### Development Workflow

1. Write code in internal/ (use-case based)
2. Update config in .conf/dev.toml if needed
3. Manual dependency injection in cmd/api/main.go
4. Test with `ENV=dev go run cmd/api/main.go`
5. Use curl or Postman for API testing

### Deployment

- Docker Compose for all services
- Single docker-compose.yml
- TOML-based configuration (environment-specific)
- Health checks on all services
- No secrets in code (all in .conf/ files)

## Dependencies to Add (Future)

### Database Drivers

- ✅ `github.com/jackc/pgx/v5` - PostgreSQL driver (INSTALLED)
- Qdrant Go client (for vector search)

### Security

- ✅ `github.com/golang-jwt/jwt/v5` - JWT handling (INSTALLED)
- ✅ `golang.org/x/crypto/bcrypt` - Password hashing (INSTALLED)

### Configuration

- ✅ `github.com/spf13/viper` - Configuration management (INSTALLED)

### Utilities

- `github.com/go-playground/validator/v10` - Request validation (optional)

### Background Jobs (Future)

- Custom worker implementation or simple channel-based queue
- Cron scheduler for periodic tasks

## Code Style Preferences

### General

- Use standard Go formatting (gofmt)
- Meaningful variable names
- Keep functions small and focused
- Error handling at every level

### Architecture

- Use-case driven structure in internal/
- **Consumer-defined interfaces**: Interface is defined in the file that uses it, not in the implementation file
  - Example: `UserRepository` interface lives in `service.go`, not `repository.go`
  - Implementation (`PostgresUserRepository`) lives in `repository.go`
- Repository pattern for data access
- Handler → Use Case → Repository flow

### Testing (To be added)

- Unit tests for use cases
- Integration tests for repositories
- E2E tests for critical flows
