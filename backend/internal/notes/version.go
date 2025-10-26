package notes

import "time"

// NoteVersion represents a historical version of a note
type NoteVersion struct {
	ID            string    `json:"id"`
	NoteID        string    `json:"note_id"`
	VersionNumber int       `json:"version_number"`
	Title         string    `json:"title"`
	ContentMd     string    `json:"content_md"`
	SourceURL     *string   `json:"source_url,omitempty"`
	Tags          []string  `json:"tags"`
	ChangeSummary *string   `json:"change_summary,omitempty"` // Nullable
	CharsAdded    int       `json:"chars_added"`
	CharsRemoved  int       `json:"chars_removed"`
	CreatedBy     string    `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
}

// VersionDiff represents changes between two versions
type VersionDiff struct {
	OldVersion   *NoteVersion `json:"old_version"`
	NewVersion   *NoteVersion `json:"new_version"`
	TitleChanged bool         `json:"title_changed"`
	ContentDiff  []DiffLine   `json:"content_diff"`
	TagsAdded    []string     `json:"tags_added"`
	TagsRemoved  []string     `json:"tags_removed"`
}

// DiffLine represents a single line in a diff
type DiffLine struct {
	Type    string `json:"type"` // "added", "removed", "unchanged"
	Content string `json:"content"`
	LineNum int    `json:"line_num"`
}

// ListVersionsResponse is the response for listing versions
type ListVersionsResponse struct {
	Versions       []NoteVersion `json:"versions"`
	Total          int           `json:"total"`
	CurrentVersion int           `json:"current_version"`
}

// RestoreVersionRequest is the request to restore a version
type RestoreVersionRequest struct {
	VersionID string `json:"version_id"`
}
