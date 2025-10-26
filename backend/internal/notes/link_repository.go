package notes

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresLinkRepository struct {
	db *pgxpool.Pool
}

func NewPostgresLinkRepository(db *pgxpool.Pool) *PostgresLinkRepository {
	return &PostgresLinkRepository{db: db}
}

// CreateLink creates a link between two notes
func (r *PostgresLinkRepository) CreateLink(ctx context.Context, sourceNoteID, targetNoteID string) error {
	linkID := uuid.New().String()
	query := `
		INSERT INTO note_links (id, source_note_id, target_note_id, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (source_note_id, target_note_id) DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, linkID, sourceNoteID, targetNoteID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to create link: %w", err)
	}
	return nil
}

// DeleteLinksForNote deletes all links where the note is the source
func (r *PostgresLinkRepository) DeleteLinksForNote(ctx context.Context, noteID string) error {
	query := `DELETE FROM note_links WHERE source_note_id = $1`
	_, err := r.db.Exec(ctx, query, noteID)
	if err != nil {
		return fmt.Errorf("failed to delete links: %w", err)
	}
	return nil
}

// GetBacklinks returns all notes that link TO this note
func (r *PostgresLinkRepository) GetBacklinks(ctx context.Context, noteID string) ([]LinkedNote, error) {
	query := `
		SELECT n.id, n.title
		FROM notes n
		INNER JOIN note_links nl ON n.id = nl.source_note_id
		WHERE nl.target_note_id = $1
		ORDER BY n.title
	`
	rows, err := r.db.Query(ctx, query, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get backlinks: %w", err)
	}
	defer rows.Close()

	var backlinks []LinkedNote
	for rows.Next() {
		var note LinkedNote
		if err := rows.Scan(&note.ID, &note.Title); err != nil {
			return nil, fmt.Errorf("failed to scan backlink: %w", err)
		}
		backlinks = append(backlinks, note)
	}

	return backlinks, nil
}

// GetOutlinks returns all notes that this note links TO
func (r *PostgresLinkRepository) GetOutlinks(ctx context.Context, noteID string) ([]LinkedNote, error) {
	query := `
		SELECT n.id, n.title
		FROM notes n
		INNER JOIN note_links nl ON n.id = nl.target_note_id
		WHERE nl.source_note_id = $1
		ORDER BY n.title
	`
	rows, err := r.db.Query(ctx, query, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get outlinks: %w", err)
	}
	defer rows.Close()

	var outlinks []LinkedNote
	for rows.Next() {
		var note LinkedNote
		if err := rows.Scan(&note.ID, &note.Title); err != nil {
			return nil, fmt.Errorf("failed to scan outlink: %w", err)
		}
		outlinks = append(outlinks, note)
	}

	return outlinks, nil
}

// GetAllLinksForUser returns all links for a user's notes (for graph view)
func (r *PostgresLinkRepository) GetAllLinksForUser(ctx context.Context, userID string) ([]GraphNode, []GraphLink, error) {
	// Get all notes for this user
	notesQuery := `
		SELECT id, title
		FROM notes
		WHERE user_id = $1
		ORDER BY title
	`
	rows, err := r.db.Query(ctx, notesQuery, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get notes: %w", err)
	}
	defer rows.Close()

	nodes := []GraphNode{}
	for rows.Next() {
		var node GraphNode
		if err := rows.Scan(&node.ID, &node.Title); err != nil {
			return nil, nil, fmt.Errorf("failed to scan node: %w", err)
		}
		node.Group = 1 // Default group
		nodes = append(nodes, node)
	}

	// Get all links between these notes
	linksQuery := `
		SELECT DISTINCT nl.source_note_id, nl.target_note_id
		FROM note_links nl
		INNER JOIN notes n1 ON nl.source_note_id = n1.id
		INNER JOIN notes n2 ON nl.target_note_id = n2.id
		WHERE n1.user_id = $1 AND n2.user_id = $1
	`
	linkRows, err := r.db.Query(ctx, linksQuery, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get links: %w", err)
	}
	defer linkRows.Close()

	links := []GraphLink{}
	for linkRows.Next() {
		var link GraphLink
		if err := linkRows.Scan(&link.Source, &link.Target); err != nil {
			return nil, nil, fmt.Errorf("failed to scan link: %w", err)
		}
		links = append(links, link)
	}

	return nodes, links, nil
}

// FindNoteByTitle finds a note by title for a specific user (case-insensitive)
func (r *PostgresLinkRepository) FindNoteByTitle(ctx context.Context, userID, title string) (string, error) {
	var noteID string
	query := `
		SELECT id FROM notes
		WHERE user_id = $1 AND LOWER(title) = LOWER($2)
		LIMIT 1
	`
	err := r.db.QueryRow(ctx, query, userID, title).Scan(&noteID)
	if err != nil {
		return "", fmt.Errorf("note not found: %w", err)
	}
	return noteID, nil
}
