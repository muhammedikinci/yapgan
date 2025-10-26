package notes

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresNoteRepository struct {
	db *pgxpool.Pool
}

func NewPostgresNoteRepository(db *pgxpool.Pool) *PostgresNoteRepository {
	return &PostgresNoteRepository{db: db}
}

func (r *PostgresNoteRepository) Create(ctx context.Context, userID, title, contentMd string, sourceURL *string) (*Note, error) {
	note := &Note{
		ID:        uuid.New().String(),
		UserID:    userID,
		Title:     title,
		ContentMd: contentMd,
		SourceURL: sourceURL,
		IsPublic:  false,
		ViewCount: 0,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	query := `
		INSERT INTO notes (id, user_id, title, content_md, source_url, is_public, view_count, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, title, content_md, source_url, is_public, public_slug, view_count, shared_at, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		note.ID, note.UserID, note.Title, note.ContentMd, note.SourceURL, note.IsPublic, note.ViewCount, note.CreatedAt, note.UpdatedAt,
	).Scan(&note.ID, &note.UserID, &note.Title, &note.ContentMd, &note.SourceURL, &note.IsPublic, &note.PublicSlug, &note.ViewCount, &note.SharedAt, &note.CreatedAt, &note.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create note: %w", err)
	}

	return note, nil
}

func (r *PostgresNoteRepository) FindByID(ctx context.Context, userID, noteID string) (*Note, error) {
	note := &Note{}

	query := `
		SELECT id, user_id, title, content_md, source_url, is_public, public_slug, 
		       view_count, shared_at, created_at, updated_at
		FROM notes
		WHERE id = $1 AND user_id = $2
	`

	err := r.db.QueryRow(ctx, query, noteID, userID).Scan(
		&note.ID, &note.UserID, &note.Title, &note.ContentMd, &note.SourceURL,
		&note.IsPublic, &note.PublicSlug, &note.ViewCount, &note.SharedAt,
		&note.CreatedAt, &note.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("note not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find note: %w", err)
	}

	return note, nil
}

func (r *PostgresNoteRepository) Update(ctx context.Context, userID, noteID string, title, contentMd *string, sourceURL *string) (*Note, error) {
	// Build dynamic update query
	updates := []string{}
	args := []interface{}{noteID, userID}
	argPos := 3

	if title != nil {
		updates = append(updates, fmt.Sprintf("title = $%d", argPos))
		args = append(args, *title)
		argPos++
	}

	if contentMd != nil {
		updates = append(updates, fmt.Sprintf("content_md = $%d", argPos))
		args = append(args, *contentMd)
		argPos++
	}

	if sourceURL != nil {
		updates = append(updates, fmt.Sprintf("source_url = $%d", argPos))
		args = append(args, *sourceURL)
		argPos++
	}

	if len(updates) == 0 {
		return r.FindByID(ctx, userID, noteID)
	}

	updates = append(updates, fmt.Sprintf("updated_at = $%d", argPos))
	args = append(args, time.Now())

	query := fmt.Sprintf(`
		UPDATE notes
		SET %s
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, title, content_md, source_url, is_public, public_slug, 
		          view_count, shared_at, created_at, updated_at
	`, strings.Join(updates, ", "))

	note := &Note{}
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&note.ID, &note.UserID, &note.Title, &note.ContentMd, &note.SourceURL,
		&note.IsPublic, &note.PublicSlug, &note.ViewCount, &note.SharedAt,
		&note.CreatedAt, &note.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("note not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to update note: %w", err)
	}

	return note, nil
}

func (r *PostgresNoteRepository) Delete(ctx context.Context, userID, noteID string) error {
	query := `DELETE FROM notes WHERE id = $1 AND user_id = $2`

	result, err := r.db.Exec(ctx, query, noteID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete note: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("note not found")
	}

	return nil
}

func (r *PostgresNoteRepository) List(ctx context.Context, userID string, page, perPage int, tagIDs []string, search string) ([]Note, int, error) {
	offset := (page - 1) * perPage

	// Build query with filters
	whereConditions := []string{"n.user_id = $1"}
	args := []interface{}{userID}
	argPos := 2

	// Add tag filter if provided
	if len(tagIDs) > 0 {
		whereConditions = append(whereConditions, fmt.Sprintf(`
			n.id IN (
				SELECT note_id FROM note_tags WHERE tag_id = ANY($%d)
			)
		`, argPos))
		args = append(args, tagIDs)
		argPos++
	}

	// Add search filter if provided
	if search != "" {
		whereConditions = append(whereConditions, fmt.Sprintf(`
			to_tsvector('english', n.title || ' ' || n.content_md) @@ plainto_tsquery('english', $%d)
		`, argPos))
		args = append(args, search)
		argPos++
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM notes n WHERE %s`, whereClause)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count notes: %w", err)
	}

	// Get notes
	args = append(args, perPage, offset)
	query := fmt.Sprintf(`
		SELECT id, user_id, title, content_md, source_url, is_public, public_slug, 
		       view_count, shared_at, created_at, updated_at
		FROM notes n
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argPos, argPos+1)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list notes: %w", err)
	}
	defer rows.Close()

	notes := []Note{}
	for rows.Next() {
		var note Note
		err := rows.Scan(&note.ID, &note.UserID, &note.Title, &note.ContentMd, &note.SourceURL,
			&note.IsPublic, &note.PublicSlug, &note.ViewCount, &note.SharedAt,
			&note.CreatedAt, &note.UpdatedAt)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan note: %w", err)
		}
		notes = append(notes, note)
	}

	return notes, total, nil
}

func (r *PostgresNoteRepository) GetNoteTags(ctx context.Context, noteID string) ([]string, error) {
	query := `
		SELECT t.name
		FROM tags t
		INNER JOIN note_tags nt ON t.id = nt.tag_id
		WHERE nt.note_id = $1
		ORDER BY t.name
	`

	rows, err := r.db.Query(ctx, query, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get note tags: %w", err)
	}
	defer rows.Close()

	tags := []string{}
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, fmt.Errorf("failed to scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (r *PostgresNoteRepository) CountByUser(ctx context.Context, userID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM notes WHERE user_id = $1`
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count notes: %w", err)
	}
	return count, nil
}

// TogglePublic toggles the public status of a note
func (r *PostgresNoteRepository) TogglePublic(ctx context.Context, userID, noteID string, isPublic bool, publicSlug *string) error {
	var query string
	var args []interface{}

	if isPublic {
		now := time.Now()
		query = `
			UPDATE notes 
			SET is_public = $1, public_slug = $2, shared_at = $3, updated_at = $4
			WHERE id = $5 AND user_id = $6
		`
		args = []interface{}{isPublic, publicSlug, now, now, noteID, userID}
	} else {
		query = `
			UPDATE notes 
			SET is_public = $1, public_slug = NULL, shared_at = NULL, updated_at = $2
			WHERE id = $3 AND user_id = $4
		`
		args = []interface{}{isPublic, time.Now(), noteID, userID}
	}

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to toggle public status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("note not found")
	}

	return nil
}

// FindByPublicSlug finds a public note by its slug (no user authentication required)
func (r *PostgresNoteRepository) FindByPublicSlug(ctx context.Context, slug string) (*Note, error) {
	note := &Note{}

	query := `
		SELECT id, user_id, title, content_md, source_url, is_public, public_slug, 
		       view_count, shared_at, created_at, updated_at
		FROM notes
		WHERE public_slug = $1 AND is_public = TRUE
	`

	err := r.db.QueryRow(ctx, query, slug).Scan(
		&note.ID, &note.UserID, &note.Title, &note.ContentMd, &note.SourceURL,
		&note.IsPublic, &note.PublicSlug, &note.ViewCount, &note.SharedAt,
		&note.CreatedAt, &note.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("public note not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to find public note: %w", err)
	}

	return note, nil
}

// IncrementViewCount increments the view count for a public note
func (r *PostgresNoteRepository) IncrementViewCount(ctx context.Context, noteID string) error {
	query := `
		UPDATE notes 
		SET view_count = view_count + 1 
		WHERE id = $1 AND is_public = TRUE
	`

	_, err := r.db.Exec(ctx, query, noteID)
	if err != nil {
		return fmt.Errorf("failed to increment view count: %w", err)
	}

	return nil
}

// IsSlugAvailable checks if a slug is available
func (r *PostgresNoteRepository) IsSlugAvailable(ctx context.Context, slug string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM notes WHERE public_slug = $1`
	err := r.db.QueryRow(ctx, query, slug).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check slug availability: %w", err)
	}
	return count == 0, nil
}
