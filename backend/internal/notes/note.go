package notes

import "time"

type Note struct {
	ID         string     `json:"id"`
	UserID     string     `json:"user_id"`
	Title      string     `json:"title"`
	ContentMd  string     `json:"content_md"`
	SourceURL  *string    `json:"source_url,omitempty"`
	IsPublic   bool       `json:"is_public"`
	PublicSlug *string    `json:"public_slug,omitempty"`
	ViewCount  int        `json:"view_count"`
	SharedAt   *time.Time `json:"shared_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	Tags       []string   `json:"tags,omitempty"`
}

type Tag struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateNoteRequest struct {
	Title     string   `json:"title"`
	ContentMd string   `json:"content_md"`
	SourceURL *string  `json:"source_url,omitempty"`
	Tags      []string `json:"tags,omitempty"`
}

type UpdateNoteRequest struct {
	Title     *string  `json:"title,omitempty"`
	ContentMd *string  `json:"content_md,omitempty"`
	SourceURL *string  `json:"source_url,omitempty"`
	Tags      []string `json:"tags,omitempty"`
}

type ListNotesRequest struct {
	Page    int      `json:"page"`
	PerPage int      `json:"per_page"`
	Tags    []string `json:"tags,omitempty"`
	Search  string   `json:"search,omitempty"`
}

type ListNotesResponse struct {
	Notes      []Note `json:"notes"`
	Total      int    `json:"total"`
	Page       int    `json:"page"`
	PerPage    int    `json:"per_page"`
	TotalPages int    `json:"total_pages"`
}

type StatsResponse struct {
	NotesCount int `json:"notes_count"`
	TagsCount  int `json:"tags_count"`
}

type SearchRequest struct {
	Query  string `json:"query"`
	Limit  int    `json:"limit,omitempty"`
	UserID string `json:"-"` // Set from JWT, not from request body
}

type SearchResult struct {
	NoteID string  `json:"note_id"`
	Title  string  `json:"title"`
	Score  float32 `json:"score"`
}

type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Query   string         `json:"query"`
}

type VectorPoint struct {
	NoteID    string    `json:"note_id"`
	Title     string    `json:"title"`
	Vector    []float32 `json:"vector"`
	Tags      []string  `json:"tags,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type VectorSpaceResponse struct {
	Points []VectorPoint `json:"points"`
	Total  int           `json:"total"`
}

type NoteLink struct {
	ID           string    `json:"id"`
	SourceNoteID string    `json:"source_note_id"`
	TargetNoteID string    `json:"target_note_id"`
	CreatedAt    time.Time `json:"created_at"`
}

type LinkedNote struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type BacklinksResponse struct {
	Backlinks []LinkedNote `json:"backlinks"` // Notes that link to this note
	Outlinks  []LinkedNote `json:"outlinks"`  // Notes that this note links to
}

type GraphNode struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Group int    `json:"group"` // For coloring by tag/category
}

type GraphLink struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

type GraphResponse struct {
	Nodes []GraphNode `json:"nodes"`
	Links []GraphLink `json:"links"`
}

type ShareNoteRequest struct {
	IsPublic bool `json:"is_public"`
}

type ShareNoteResponse struct {
	IsPublic   bool    `json:"is_public"`
	PublicSlug *string `json:"public_slug,omitempty"`
	PublicURL  *string `json:"public_url,omitempty"`
}

type PublicNoteResponse struct {
	ID        string     `json:"id"`
	Title     string     `json:"title"`
	ContentMd string     `json:"content_md"`
	SourceURL *string    `json:"source_url,omitempty"`
	Tags      []string   `json:"tags,omitempty"`
	ViewCount int        `json:"view_count"`
	SharedAt  *time.Time `json:"shared_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}
