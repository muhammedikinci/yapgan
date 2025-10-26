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

type PostgresTagRepository struct {
	db *pgxpool.Pool
}

func NewPostgresTagRepository(db *pgxpool.Pool) *PostgresTagRepository {
	return &PostgresTagRepository{db: db}
}

func (r *PostgresTagRepository) FindOrCreateByName(ctx context.Context, userID, name string) (*Tag, error) {
	// Normalize tag name (lowercase, trim)
	normalizedName := strings.ToLower(strings.TrimSpace(name))
	if normalizedName == "" {
		return nil, fmt.Errorf("tag name cannot be empty")
	}

	// Try to find existing tag for this user
	tag := &Tag{}
	query := `SELECT id, user_id, name, created_at FROM tags WHERE user_id = $1 AND name = $2`
	err := r.db.QueryRow(ctx, query, userID, normalizedName).Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.CreatedAt)

	if err == nil {
		return tag, nil
	}

	if err != pgx.ErrNoRows {
		return nil, fmt.Errorf("failed to find tag: %w", err)
	}

	// Tag doesn't exist for this user, create it
	tag = &Tag{
		ID:        uuid.New().String(),
		UserID:    userID,
		Name:      normalizedName,
		CreatedAt: time.Now(),
	}

	insertQuery := `
		INSERT INTO tags (id, user_id, name, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, name, created_at
	`

	err = r.db.QueryRow(ctx, insertQuery, tag.ID, tag.UserID, tag.Name, tag.CreatedAt).Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create tag: %w", err)
	}

	return tag, nil
}

func (r *PostgresTagRepository) FindByIDs(ctx context.Context, userID string, tagIDs []string) ([]Tag, error) {
	if len(tagIDs) == 0 {
		return []Tag{}, nil
	}

	query := `SELECT id, user_id, name, created_at FROM tags WHERE user_id = $1 AND id = ANY($2)`
	rows, err := r.db.Query(ctx, query, userID, tagIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to find tags: %w", err)
	}
	defer rows.Close()

	tags := []Tag{}
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (r *PostgresTagRepository) FindByNames(ctx context.Context, userID string, names []string) ([]Tag, error) {
	if len(names) == 0 {
		return []Tag{}, nil
	}

	// Normalize names
	normalizedNames := make([]string, len(names))
	for i, name := range names {
		normalizedNames[i] = strings.ToLower(strings.TrimSpace(name))
	}

	query := `SELECT id, user_id, name, created_at FROM tags WHERE user_id = $1 AND name = ANY($2)`
	rows, err := r.db.Query(ctx, query, userID, normalizedNames)
	if err != nil {
		return nil, fmt.Errorf("failed to find tags: %w", err)
	}
	defer rows.Close()

	tags := []Tag{}
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (r *PostgresTagRepository) AssignToNote(ctx context.Context, noteID, tagID string) error {
	query := `
		INSERT INTO note_tags (note_id, tag_id, created_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (note_id, tag_id) DO NOTHING
	`

	_, err := r.db.Exec(ctx, query, noteID, tagID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to assign tag to note: %w", err)
	}

	return nil
}

func (r *PostgresTagRepository) RemoveFromNote(ctx context.Context, noteID, tagID string) error {
	query := `DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2`

	_, err := r.db.Exec(ctx, query, noteID, tagID)
	if err != nil {
		return fmt.Errorf("failed to remove tag from note: %w", err)
	}

	return nil
}

func (r *PostgresTagRepository) SetNoteTags(ctx context.Context, noteID string, tagIDs []string) error {
	// Start transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Remove all existing tags
	_, err = tx.Exec(ctx, `DELETE FROM note_tags WHERE note_id = $1`, noteID)
	if err != nil {
		return fmt.Errorf("failed to remove existing tags: %w", err)
	}

	// Add new tags
	if len(tagIDs) > 0 {
		for _, tagID := range tagIDs {
			_, err = tx.Exec(ctx, `
				INSERT INTO note_tags (note_id, tag_id, created_at)
				VALUES ($1, $2, $3)
			`, noteID, tagID, time.Now())
			if err != nil {
				return fmt.Errorf("failed to assign tag: %w", err)
			}
		}
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *PostgresTagRepository) ListAll(ctx context.Context, userID string) ([]Tag, error) {
	query := `SELECT id, user_id, name, created_at FROM tags WHERE user_id = $1 ORDER BY name`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list tags: %w", err)
	}
	defer rows.Close()

	tags := []Tag{}
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (r *PostgresTagRepository) CountAll(ctx context.Context, userID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM tags WHERE user_id = $1`
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count tags: %w", err)
	}
	return count, nil
}

func (r *PostgresTagRepository) FindByID(ctx context.Context, userID, tagID string) (*Tag, error) {
	tag := &Tag{}
	query := `SELECT id, user_id, name, created_at FROM tags WHERE user_id = $1 AND id = $2`
	err := r.db.QueryRow(ctx, query, userID, tagID).Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.CreatedAt)
	
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("tag not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find tag: %w", err)
	}
	
	return tag, nil
}

func (r *PostgresTagRepository) GetNotesCountByTag(ctx context.Context, userID, tagID string) (int, error) {
	var count int
	query := `
		SELECT COUNT(DISTINCT n.id)
		FROM notes n
		INNER JOIN note_tags nt ON n.id = nt.note_id
		WHERE n.user_id = $1 AND nt.tag_id = $2
	`
	err := r.db.QueryRow(ctx, query, userID, tagID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count notes: %w", err)
	}
	return count, nil
}

func (r *PostgresTagRepository) Delete(ctx context.Context, userID, tagID string) ([]string, error) {
	// Start transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// First, get all notes that have this tag
	noteIDsQuery := `
		SELECT DISTINCT n.id
		FROM notes n
		INNER JOIN note_tags nt ON n.id = nt.note_id
		WHERE n.user_id = $1 AND nt.tag_id = $2
	`
	rows, err := tx.Query(ctx, noteIDsQuery, userID, tagID)
	if err != nil {
		return nil, fmt.Errorf("failed to get notes with tag: %w", err)
	}
	
	noteIDs := []string{}
	for rows.Next() {
		var noteID string
		if err := rows.Scan(&noteID); err != nil {
			rows.Close()
			return nil, fmt.Errorf("failed to scan note ID: %w", err)
		}
		noteIDs = append(noteIDs, noteID)
	}
	rows.Close()

	// Delete all notes with this tag (CASCADE will handle note_tags)
	if len(noteIDs) > 0 {
		deleteNotesQuery := `DELETE FROM notes WHERE id = ANY($1) AND user_id = $2`
		_, err = tx.Exec(ctx, deleteNotesQuery, noteIDs, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to delete notes: %w", err)
		}
	}

	// Delete the tag
	deleteTagQuery := `DELETE FROM tags WHERE id = $1 AND user_id = $2`
	result, err := tx.Exec(ctx, deleteTagQuery, tagID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete tag: %w", err)
	}

	if result.RowsAffected() == 0 {
		return nil, fmt.Errorf("tag not found or access denied")
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return noteIDs, nil
}
