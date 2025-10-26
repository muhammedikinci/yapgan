package notes

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// VersionRepository defines the interface for version storage operations
type VersionRepository interface {
	ListVersions(ctx context.Context, noteID string) ([]NoteVersion, error)
	GetVersion(ctx context.Context, versionID string) (*NoteVersion, error)
	GetVersionByNumber(ctx context.Context, noteID string, versionNumber int) (*NoteVersion, error)
	GetLatestVersionNumber(ctx context.Context, noteID string) (int, error)
}

// PostgresVersionRepository implements VersionRepository using PostgreSQL
type PostgresVersionRepository struct {
	db *pgxpool.Pool
}

// NewPostgresVersionRepository creates a new PostgreSQL version repository
func NewPostgresVersionRepository(db *pgxpool.Pool) *PostgresVersionRepository {
	return &PostgresVersionRepository{db: db}
}

// ListVersions returns all versions for a note, ordered by version number descending
func (r *PostgresVersionRepository) ListVersions(ctx context.Context, noteID string) ([]NoteVersion, error) {
	query := `
		SELECT id, note_id, version_number, title, content_md, source_url, 
		       tags, change_summary, chars_added, chars_removed, created_by, created_at
		FROM note_versions
		WHERE note_id = $1
		ORDER BY version_number DESC
	`

	rows, err := r.db.Query(ctx, query, noteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []NoteVersion
	for rows.Next() {
		var v NoteVersion
		err := rows.Scan(
			&v.ID, &v.NoteID, &v.VersionNumber, &v.Title, &v.ContentMd,
			&v.SourceURL, &v.Tags, &v.ChangeSummary, &v.CharsAdded,
			&v.CharsRemoved, &v.CreatedBy, &v.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}

	return versions, rows.Err()
}

// GetVersion returns a specific version by ID
func (r *PostgresVersionRepository) GetVersion(ctx context.Context, versionID string) (*NoteVersion, error) {
	query := `
		SELECT id, note_id, version_number, title, content_md, source_url, 
		       tags, change_summary, chars_added, chars_removed, created_by, created_at
		FROM note_versions
		WHERE id = $1
	`

	var v NoteVersion
	err := r.db.QueryRow(ctx, query, versionID).Scan(
		&v.ID, &v.NoteID, &v.VersionNumber, &v.Title, &v.ContentMd,
		&v.SourceURL, &v.Tags, &v.ChangeSummary, &v.CharsAdded,
		&v.CharsRemoved, &v.CreatedBy, &v.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &v, nil
}

// GetVersionByNumber returns a specific version by note ID and version number
func (r *PostgresVersionRepository) GetVersionByNumber(ctx context.Context, noteID string, versionNumber int) (*NoteVersion, error) {
	query := `
		SELECT id, note_id, version_number, title, content_md, source_url, 
		       tags, change_summary, chars_added, chars_removed, created_by, created_at
		FROM note_versions
		WHERE note_id = $1 AND version_number = $2
	`

	var v NoteVersion
	err := r.db.QueryRow(ctx, query, noteID, versionNumber).Scan(
		&v.ID, &v.NoteID, &v.VersionNumber, &v.Title, &v.ContentMd,
		&v.SourceURL, &v.Tags, &v.ChangeSummary, &v.CharsAdded,
		&v.CharsRemoved, &v.CreatedBy, &v.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &v, nil
}

// GetLatestVersionNumber returns the latest version number for a note
func (r *PostgresVersionRepository) GetLatestVersionNumber(ctx context.Context, noteID string) (int, error) {
	query := `
		SELECT COALESCE(MAX(version_number), 0)
		FROM note_versions
		WHERE note_id = $1
	`

	var versionNumber int
	err := r.db.QueryRow(ctx, query, noteID).Scan(&versionNumber)
	if err != nil {
		return 0, err
	}

	return versionNumber, nil
}
