# System Patterns: Yapgan

## Architecture Overview

### High-Level Components
```
Browser Extension → Backend API → Database (Postgres + Qdrant)
                         ↓
                    Web UI ← User
                         ↓
                 Obsidian Plugin → User's Vault
```

### Backend Architecture (Go + Echo)

#### Folder Structure
```
yapgan/
├── cmd/
│   └── api/
│       └── main.go           # Entry point
├── internal/
│   ├── server/              # HTTP server setup
│   └── [use-cases]/         # Business logic by use case
└── pkg/                     # Shared utilities
```

#### Design Decisions

**1. Use-Case Based Organization**
- Business logic organized by use case (auth, notes, search, tags)
- Each use case is self-contained
- Dependencies injected manually in main.go

**2. Interface Definition (Consumer-Defined Interfaces)**
- **CRITICAL RULE**: Interfaces are ALWAYS defined by the consumer, NOT by the implementation
- Example in auth use case:
  - `UserRepository` interface is in `service.go` (the Service is the consumer)
  - `PostgresUserRepository` struct is in `repository.go` (the implementation)
  - This avoids circular dependencies and makes dependencies clear
- Benefits:
  - Clear ownership: consumer defines what it needs
  - Easier testing: can mock the interface easily
  - Loose coupling: implementation can change without affecting consumer
  - No interface pollution: only methods actually needed are defined

**3. No Framework for DI**
- Manual dependency injection in main.go
- Explicit initialization
- Clear dependency graph

**4. No Cobra**
- Single binary, simple startup
- Configuration via environment variables
- Keep it minimal

## Key Technical Decisions

### 1. Echo Framework
- Lightweight, fast HTTP router
- Built-in middleware (CORS, Logger, Recover)
- Simple API for handlers
- Standard library compatible

### 2. Database Strategy
- **PostgreSQL**: Metadata, relations, full-text search (tsvector/BM25)
- **Qdrant**: Vector embeddings for semantic search
- Hybrid search combines both

### 3. Authentication
- JWT access + refresh tokens
- Token rotation on refresh
- User-scoped data isolation
- No third-party auth (initially)

### 4. Embedding Strategy
- Default: Open-source models (bge-small/e5-small)
- Optional: OpenAI embeddings (user-configurable)
- Batch processing with caching
- User can disable external API calls

## Data Model (Summary)

### Core Tables
```sql
users (id, email, password_hash, created_at, updated_at)
notes (id, user_id, title, content_md, source_url, created_at, updated_at)
tags (id, name)
note_tags (note_id, tag_id)
embeddings (id, note_id, vector_ref, dim, model, created_at)
```

### Relationships
- User → Notes (1:N)
- Notes → Tags (N:N via note_tags)
- Notes → Embeddings (1:1)

## Component Relationships

### HTTP Layer (Echo Server)
- Routes mapped to handlers
- Middleware: CORS, Logger, Recover, JWT auth
- Request validation
- Response formatting

### Use Case Layer
- Auth: register, login, refresh, logout
- Notes: create, read, update, delete, list
- Search: lexical, semantic, hybrid
- Tags: auto-generate, assign, filter

### Repository Layer
- PostgreSQL repositories per entity
- Qdrant repository for vectors
- Transaction support where needed

### Worker Layer (Background Jobs)
- Summary/tag generation (cron)
- Embedding generation (async queue)
- Clustering/2D projection (batch)
- Duplicate detection (hash-based)

## Critical Implementation Paths

### 1. Capture Flow (Browser Extension → Backend)
```
Extension (content highlighted) → User fills form (title, tags)
  → POST /api/notes
  → Validate & save to notes table
  → Queue embedding generation
  → Queue tag suggestion
  → Return note_id
```

### 2. Search Flow
```
User → POST /api/search
  → Parallel: Postgres full-text + Qdrant semantic
  → Merge results with hybrid scoring
  → Apply tag filters
  → Return ranked results
```

### 3. Sync Flow (Obsidian)
```
Plugin → GET /api/notes?since=<last_sync>
  → Filter by updated_at > last_sync
  → Convert to Markdown with frontmatter
  → Write to vault
  → Update last_sync timestamp
```

## Security Patterns

### Authentication
- bcrypt for password hashing
- JWT with HS256 (access: 15min, refresh: 7 days)
- Refresh token rotation
- Token revocation on logout

### Authorization
- All queries scoped by user_id
- Row-level security via application logic
- No shared data between users

### Privacy
- Self-hosted by default
- Optional external APIs (explicitly enabled)
- TLS in production
- CORS whitelist
- Audit fields (created_at, updated_at)

## Performance Patterns

### Database
- Indexes on user_id, created_at, updated_at
- Full-text index on content (tsvector)
- Connection pooling

### Caching
- Embedding cache (avoid regeneration)
- Summary cache
- Tag cache

### Async Processing
- Background workers for heavy tasks
- Queue system for embeddings
- Batch processing where possible

### Frontend Architecture (React + TypeScript)

#### Folder Structure
```
web-app/
├── src/
│   ├── components/          # Reusable components
│   │   └── Sidebar.tsx
│   ├── pages/              # Page components (routes)
│   │   ├── Login.tsx       # Authentication
│   │   ├── Dashboard.tsx   # Home page
│   │   ├── Notes.tsx       # Notes list
│   │   └── NoteDetail.tsx  # Note view
│   ├── services/           # API integration layer
│   │   └── api.ts          # API client + TypeScript interfaces
│   ├── App.tsx             # Root component with routing
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
└── .env                    # Environment variables
```

#### Design Decisions

**1. Component Organization**
- Pages: Top-level route components (1 per route)
- Components: Reusable UI elements (Sidebar, etc.)
- Services: API integration separated from UI

**2. State Management**
- useState for component-local state
- No Redux/Zustand (not needed for current scope)
- API state: loading, data, error pattern
- JWT token in localStorage (managed by API service)

**3. Type Safety**
- TypeScript interfaces for all API responses
- Note interface matches backend Note struct
- Tag interface for filter objects
- NotesResponse for pagination metadata

**4. API Integration Pattern**
- Single API service class (apiService)
- Centralized token management
- Automatic Bearer token inclusion
- 401 auto-logout and redirect
- Type-safe request/response

**5. Routing**
- React Router v6
- Protected routes with ProtectedRoute component
- Auto-redirect to /login if no token
- Routes: /login, /, /notes, /notes/:id

**6. Styling**
- Tailwind CSS via CDN (quick setup)
- Dark mode via Tailwind classes
- Inter font family (Google Fonts)
- Responsive design (mobile-first)

#### Key Patterns

**API Service Pattern**
```typescript
// src/services/api.ts
class ApiService {
  private token: string | null = null;
  
  setToken(token: string) { ... }
  getToken(): string | null { ... }
  
  private async request<T>(endpoint, options): Promise<T> {
    // Auto-include token
    // Handle 401 errors
    // Type-safe responses
  }
  
  // Domain methods
  async login(email, password) { ... }
  async getNotes(params) { ... }
  async getNote(id) { ... }
}

export const apiService = new ApiService();
```

**Protected Route Pattern**
```typescript
// App.tsx
const ProtectedRoute = ({ children }) => {
  const token = apiService.getToken();
  return token ? <>{children}</> : <Navigate to="/login" />;
};

<Route path="/" element={
  <ProtectedRoute><Dashboard /></ProtectedRoute>
} />
```

**API State Pattern** (used in all pages)
```typescript
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadData();
}, [dependencies]);

const loadData = async () => {
  try {
    setLoading(true);
    const response = await apiService.getData();
    setData(response.data);
    setError(null);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

#### Backend-Frontend Contract

**Tag Format Handling**
- Backend returns TWO different tag formats:
  1. GET /api/tags → Tag objects: `[{id, name, created_at}]`
  2. Note.tags → String array: `["javascript", "react"]`
- Frontend handles both:
  - allTags state: `Tag[]` for filter buttons
  - note.tags: `string[]` for note cards

**Response Format**
```typescript
// GET /api/notes
{
  notes: Note[],
  total: number,        // total count
  page: number,         // current page
  per_page: number,     // items per page
  total_pages: number   // total pages
}

// Note structure
{
  id: string,
  title: string,
  content_md: string,
  source_url?: string,
  tags?: string[],      // string array!
  created_at: string,
  updated_at: string
}
```

#### Environment Configuration
```bash
# .env
VITE_API_URL=http://localhost:8080
```

#### Known Issues & Solutions

**1. Tag Rendering**
- Issue: Backend returns mixed formats
- Solution: Use Tag[] for filters, string[] for note tags
- Pattern: Filter sidebar uses tag.name, note cards use tag directly

**2. Pagination Metadata**
- Issue: Initially expected nested meta object
- Solution: Flat response structure (total, page, per_page, total_pages)

**3. React Keys**
- Issue: Using index as key causes errors
- Solution: Always use unique ID (note.id, tag.id, or composite keys)
