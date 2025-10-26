package chat

import (
"context"
"fmt"
"strings"
)

// ChatRepository defines database operations for chat
type ChatRepository interface {
CreateConversation(ctx context.Context, userID, noteID, title string) (*Conversation, error)
GetConversation(ctx context.Context, userID, conversationID string) (*Conversation, error)
ListConversations(ctx context.Context, userID string, limit, offset int) ([]Conversation, int, error)
UpdateConversationTitle(ctx context.Context, userID, conversationID, title string) error
DeleteConversation(ctx context.Context, userID, conversationID string) error
CreateMessage(ctx context.Context, conversationID, role, content string) (*Message, error)
GetMessages(ctx context.Context, conversationID string, limit int) ([]Message, error)
}

// NoteRepository interface for getting note content
type NoteRepository interface {
FindByID(ctx context.Context, userID, noteID string) (*Note, error)
}

// Note represents a simplified note structure
type Note struct {
ID        string
UserID    string
Title     string
ContentMd string
}

// Service handles chat business logic for single-note conversations
type Service struct {
chatRepo     ChatRepository
noteRepo     NoteRepository
openaiClient *OpenAIClient
}

func NewService(
chatRepo ChatRepository,
noteRepo NoteRepository,
openaiClient *OpenAIClient,
) *Service {
return &Service{
chatRepo:     chatRepo,
noteRepo:     noteRepo,
openaiClient: openaiClient,
}
}

// CreateConversation creates a new conversation for a specific note
func (s *Service) CreateConversation(ctx context.Context, userID, noteID, title string) (*Conversation, error) {
// Validate note exists and belongs to user
_, err := s.noteRepo.FindByID(ctx, userID, noteID)
if err != nil {
return nil, fmt.Errorf("note not found or access denied: %w", err)
}

if title == "" {
title = "Chat about note"
}

return s.chatRepo.CreateConversation(ctx, userID, noteID, title)
}

// GetConversation gets a conversation with messages
func (s *Service) GetConversation(ctx context.Context, userID, conversationID string) (*ConversationResponse, error) {
conv, err := s.chatRepo.GetConversation(ctx, userID, conversationID)
if err != nil {
return nil, err
}

messages, err := s.chatRepo.GetMessages(ctx, conversationID, 100)
if err != nil {
return nil, err
}

return &ConversationResponse{
Conversation: *conv,
Messages:     messages,
}, nil
}

// ListConversations lists user's conversations
func (s *Service) ListConversations(ctx context.Context, userID string, page, perPage int) (*ListConversationsResponse, error) {
if perPage <= 0 || perPage > 50 {
perPage = 20
}
if page < 1 {
page = 1
}

offset := (page - 1) * perPage

conversations, total, err := s.chatRepo.ListConversations(ctx, userID, perPage, offset)
if err != nil {
return nil, err
}

return &ListConversationsResponse{
Conversations: conversations,
Total:         total,
}, nil
}

// DeleteConversation deletes a conversation
func (s *Service) DeleteConversation(ctx context.Context, userID, conversationID string) error {
return s.chatRepo.DeleteConversation(ctx, userID, conversationID)
}

// SendMessage sends a message about the note (single-note conversation)
func (s *Service) SendMessage(ctx context.Context, userID, conversationID, message string) (string, error) {
// 1. Get conversation and verify it belongs to user
conv, err := s.chatRepo.GetConversation(ctx, userID, conversationID)
if err != nil {
return "", err
}

// 2. Get the note content
note, err := s.noteRepo.FindByID(ctx, userID, conv.NoteID)
if err != nil {
return "", fmt.Errorf("failed to get note: %w", err)
}

// 3. Save user message
_, err = s.chatRepo.CreateMessage(ctx, conversationID, "user", message)
if err != nil {
return "", fmt.Errorf("failed to save user message: %w", err)
}

// 4. Build prompt with note content and enforce topic constraint
systemPrompt := `You are a helpful assistant that ONLY answers questions about the specific note provided below.

STRICT RULES:
1. You can ONLY discuss topics that are directly related to the note content
2. If the user asks about anything NOT in the note, politely decline and remind them you can only discuss this specific note
3. ALWAYS respond in the SAME LANGUAGE the user uses in their question
4. Use the note content to provide detailed, helpful answers
5. If information is not in the note, clearly state that

THE NOTE:
Title: ` + note.Title + `

Content:
` + note.ContentMd

userPrompt := message

messages := []OpenAIMessage{
{Role: "system", Content: systemPrompt},
{Role: "user", Content: userPrompt},
}

// 5. Call GPT-5 nano
response, err := s.openaiClient.ChatCompletion(ctx, messages)
if err != nil {
return "", fmt.Errorf("failed to get AI response: %w", err)
}

if len(response.Choices) == 0 {
return "", fmt.Errorf("no response from AI")
}

aiResponse := response.Choices[0].Message.Content

// 6. Save assistant message
_, err = s.chatRepo.CreateMessage(ctx, conversationID, "assistant", aiResponse)
if err != nil {
return "", fmt.Errorf("failed to save assistant message: %w", err)
}

return aiResponse, nil
}

// SendMessageStream sends a message with streaming response
func (s *Service) SendMessageStream(ctx context.Context, userID, conversationID, message string, callback func(string) error) error {
// 1. Get conversation
conv, err := s.chatRepo.GetConversation(ctx, userID, conversationID)
if err != nil {
return err
}

// 2. Get note content
note, err := s.noteRepo.FindByID(ctx, userID, conv.NoteID)
if err != nil {
return fmt.Errorf("failed to get note: %w", err)
}

// 3. Save user message
_, err = s.chatRepo.CreateMessage(ctx, conversationID, "user", message)
if err != nil {
return fmt.Errorf("failed to save user message: %w", err)
}

// 4. Build prompt
systemPrompt := `You are a helpful assistant that ONLY answers questions about the specific note provided below.

STRICT RULES:
1. You can ONLY discuss topics that are directly related to the note content
2. If the user asks about anything NOT in the note, politely decline and remind them you can only discuss this specific note
3. ALWAYS respond in the SAME LANGUAGE the user uses in their question
4. Use the note content to provide detailed, helpful answers
5. If information is not in the note, clearly state that

THE NOTE:
Title: ` + note.Title + `

Content:
` + note.ContentMd

userPrompt := message

messages := []OpenAIMessage{
{Role: "system", Content: systemPrompt},
{Role: "user", Content: userPrompt},
}

// 5. Stream response
var fullResponse strings.Builder
err = s.openaiClient.ChatCompletionStream(ctx, messages, func(chunk string) error {
fullResponse.WriteString(chunk)
return callback(chunk)
})

if err != nil {
return fmt.Errorf("failed to stream AI response: %w", err)
}

// 6. Save assistant message
_, err = s.chatRepo.CreateMessage(ctx, conversationID, "assistant", fullResponse.String())
if err != nil {
return fmt.Errorf("failed to save assistant message: %w", err)
}

return nil
}
