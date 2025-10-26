package embedding

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// FastEmbedService handles text embedding generation using FastEmbed Python service
type FastEmbedService struct {
	client   *http.Client
	endpoint string
}

// NewFastEmbedService creates a new FastEmbed service client
func NewFastEmbedService(endpoint string) *FastEmbedService {
	return &FastEmbedService{
		endpoint: endpoint,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// FastEmbedRequest represents the request to FastEmbed service
type FastEmbedRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// FastEmbedResponse represents the response from FastEmbed service
type FastEmbedResponse struct {
	Embedding []float32 `json:"embedding"`
	Dimension int       `json:"dimension"`
}

// Generate creates an embedding vector from text using FastEmbed service
func (s *FastEmbedService) Generate(text string) ([]float32, error) {
	// For standalone text, use it as content
	return s.GenerateForNote("", text)
}

// GenerateForNote creates an embedding from note title and content
func (s *FastEmbedService) GenerateForNote(title, content string) ([]float32, error) {
	if title == "" && content == "" {
		return nil, fmt.Errorf("both title and content are empty")
	}

	// Prepare request
	reqBody := FastEmbedRequest{
		Title:   title,
		Content: content,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make HTTP request
	resp, err := s.client.Post(
		s.endpoint+"/embed",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to call embedding service: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		var errResp struct {
			Error string `json:"error"`
		}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return nil, fmt.Errorf("embedding service error (status %d): %s", resp.StatusCode, errResp.Error)
	}

	// Parse response
	var result FastEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(result.Embedding) == 0 {
		return nil, fmt.Errorf("received empty embedding from service")
	}

	return result.Embedding, nil
}
