package chat

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresChatRepository struct {
	db *pgxpool.Pool
}

func NewPostgresChatRepository(db *pgxpool.Pool) *PostgresChatRepository {
	return &PostgresChatRepository{db: db}
}

// Conversation operations

func (r *PostgresChatRepository) CreateConversation(ctx context.Context, userID, noteID, title string) (*Conversation, error) {
	conv := &Conversation{
		ID:        uuid.New().String(),
		UserID:    userID,
		NoteID:    noteID,
		Title:     title,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	query := `
		INSERT INTO chat_conversations (id, user_id, note_id, title, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, note_id, title, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query, conv.ID, conv.UserID, conv.NoteID, conv.Title, conv.CreatedAt, conv.UpdatedAt).Scan(
		&conv.ID, &conv.UserID, &conv.NoteID, &conv.Title, &conv.CreatedAt, &conv.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	return conv, nil
}

func (r *PostgresChatRepository) GetConversation(ctx context.Context, userID, conversationID string) (*Conversation, error) {
	conv := &Conversation{}

	query := `
		SELECT id, user_id, note_id, title, created_at, updated_at
		FROM chat_conversations
		WHERE id = $1 AND user_id = $2
	`

	err := r.db.QueryRow(ctx, query, conversationID, userID).Scan(
		&conv.ID, &conv.UserID, &conv.NoteID, &conv.Title, &conv.CreatedAt, &conv.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("conversation not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}

	return conv, nil
}

func (r *PostgresChatRepository) ListConversations(ctx context.Context, userID string, limit, offset int) ([]Conversation, int, error) {
	// Count total
	var total int
	countQuery := `SELECT COUNT(*) FROM chat_conversations WHERE user_id = $1`
	err := r.db.QueryRow(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count conversations: %w", err)
	}

	// Get conversations (only those with note_id - filter out old ones)
	query := `
		SELECT id, user_id, note_id, title, created_at, updated_at
		FROM chat_conversations
		WHERE user_id = $1 AND note_id IS NOT NULL
		ORDER BY updated_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list conversations: %w", err)
	}
	defer rows.Close()

	conversations := []Conversation{}
	for rows.Next() {
		var conv Conversation
		err := rows.Scan(&conv.ID, &conv.UserID, &conv.NoteID, &conv.Title, &conv.CreatedAt, &conv.UpdatedAt)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan conversation: %w", err)
		}
		conversations = append(conversations, conv)
	}

	return conversations, total, nil
}

func (r *PostgresChatRepository) UpdateConversationTitle(ctx context.Context, userID, conversationID, title string) error {
	query := `
		UPDATE chat_conversations
		SET title = $1, updated_at = $2
		WHERE id = $3 AND user_id = $4
	`

	result, err := r.db.Exec(ctx, query, title, time.Now(), conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to update conversation: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("conversation not found")
	}

	return nil
}

func (r *PostgresChatRepository) DeleteConversation(ctx context.Context, userID, conversationID string) error {
	query := `DELETE FROM chat_conversations WHERE id = $1 AND user_id = $2`

	result, err := r.db.Exec(ctx, query, conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete conversation: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("conversation not found")
	}

	return nil
}

// Message operations

func (r *PostgresChatRepository) CreateMessage(ctx context.Context, conversationID, role, content string) (*Message, error) {
	msg := &Message{
		ID:             uuid.New().String(),
		ConversationID: conversationID,
		Role:           role,
		Content:        content,
		CreatedAt:      time.Now(),
	}

	query := `
		INSERT INTO chat_messages (id, conversation_id, role, content, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, conversation_id, role, content, created_at
	`

	err := r.db.QueryRow(ctx, query, msg.ID, msg.ConversationID, msg.Role, msg.Content, msg.CreatedAt).Scan(
		&msg.ID, &msg.ConversationID, &msg.Role, &msg.Content, &msg.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	return msg, nil
}

func (r *PostgresChatRepository) GetMessages(ctx context.Context, conversationID string, limit int) ([]Message, error) {
	query := `
		SELECT id, conversation_id, role, content, created_at
		FROM chat_messages
		WHERE conversation_id = $1
		ORDER BY created_at ASC
		LIMIT $2
	`

	rows, err := r.db.Query(ctx, query, conversationID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}
	defer rows.Close()

	messages := []Message{}
	for rows.Next() {
		var msg Message
		err := rows.Scan(&msg.ID, &msg.ConversationID, &msg.Role, &msg.Content, &msg.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		messages = append(messages, msg)
	}

	return messages, nil
}
