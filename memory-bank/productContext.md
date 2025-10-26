# Product Context: Yapgan

## Why This Project Exists

Power users, researchers, and developers constantly encounter valuable content across the web - AI conversations, articles, documentation, research papers - but this knowledge is scattered and hard to retrieve later. There's no easy way to capture, organize, and search this information effectively.

## How It Should Work

### User Experience Flow

#### 1. Capture (The Simplest Part)

- User encounters valuable content anywhere on the web
- Highlights the text
- Clicks browser extension icon
- Extension popup appears:
  - **Content**: Pre-filled with highlighted text (editable)
  - **Title**: User enters a descriptive title
  - **Tags**: User adds tags (optional, comma-separated)
  - **Source URL**: Auto-captured from current page
- Clicks "Save" button
- Note saved to Yapgan instantly

**No provider-specific logic. No JSON parsing. Just: highlight → title → tags → save.**

#### 2. Organize

- Web UI shows all captured notes
- Full-text and semantic search
- Filter by tags
- Auto-generated tags and summaries (background process)
- Topic clustering and visualization (2D space map)

#### 3. Sync

- Obsidian plugin syncs notes as markdown files
- Frontmatter includes metadata (id, source_url, created_at, tags)
- Tags become wikilinks [[tag/tagname]]
- Read-only sync (initially)

#### 4. Learn

- Mark important notes for spaced repetition
- Create Q/A cards from notes
- Compatible with Obsidian SR format

## User Experience Goals

### Effortless Capture

- One-click extension activation
- Highlighted text auto-fills content
- Simple form: title + content + tags
- No manual formatting needed
- Works on ANY website

### Universal Coverage

- AI chat platforms (ChatGPT, Claude, Perplexity, Gemini)
- Documentation sites
- Blog articles
- Research papers
- Stack Overflow answers
- Reddit discussions
- Twitter threads
- Literally anything on the web

### Fast Discovery

- Sub-300ms search response
- Hybrid search (keyword + semantic)
- Tag filtering
- Visual clustering for exploration

### Seamless Integration

- Native markdown format
- Compatible with existing workflows
- Self-hosted option for privacy
- Source URL linking for reference

### Privacy First

- Data stays on user's infrastructure
- No external API calls by default
- Clear control over LLM integrations
- Optional OpenAI features can be disabled

## Success Criteria

- Users capture notes effortlessly while browsing
- Users save time by quickly finding past notes
- Users report reduced context switching
- Users integrate captured content into their knowledge management workflow
- 60%+ weekly active users among pilots
- NPS ≥ 30

## Use Cases

### Example 1: AI Conversation

User asks Claude for code review feedback, gets valuable insights:

1. Highlights the important part of Claude's response
2. Clicks extension
3. Enters title: "Code review best practices - Claude"
4. Adds tags: "programming, code-review, best-practices"
5. Saves
   → Later searchable, synced to Obsidian

### Example 2: Documentation

User finds solution in Next.js docs:

1. Highlights the solution
2. Clicks extension
3. Enters title: "Next.js dynamic routes setup"
4. Adds tags: "nextjs, routing, tutorial"
5. Saves
   → Personal documentation library

### Example 3: Research

User reads interesting paper insight:

1. Highlights key finding
2. Clicks extension
3. Enters title: "Attention mechanism improvements"
4. Adds tags: "ml, transformers, research"
5. Saves
   → Research notes organized and searchable
