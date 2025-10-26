package embedding

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

// OpenAIService handles text embedding generation using OpenAI API
type OpenAIService struct {
	client     *openai.Client
	model      string
	vectorSize int
}

// NewOpenAIService creates a new OpenAI embedding service
func NewOpenAIService(apiKey, model string, vectorSize int) (*OpenAIService, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("OpenAI API key is required")
	}

	client := openai.NewClient(
		option.WithAPIKey(apiKey),
	)

	return &OpenAIService{
		client:     &client,
		model:      model,
		vectorSize: vectorSize,
	}, nil
}

// cleanText removes markdown, emojis, extra whitespace and newlines
func cleanTextOpenAI(text string) string {
	// Remove markdown headers (# ## ###)
	text = regexp.MustCompile(`#{1,6}\s+`).ReplaceAllString(text, "")

	// Remove markdown bold/italic (**text** or __text__ or *text* or _text_)
	text = regexp.MustCompile(`\*\*([^*]+)\*\*`).ReplaceAllString(text, "$1")
	text = regexp.MustCompile(`__([^_]+)__`).ReplaceAllString(text, "$1")
	text = regexp.MustCompile(`\*([^*]+)\*`).ReplaceAllString(text, "$1")
	text = regexp.MustCompile(`_([^_]+)_`).ReplaceAllString(text, "$1")

	// Remove markdown links [text](url)
	text = regexp.MustCompile(`\[([^\]]+)\]\([^\)]+\)`).ReplaceAllString(text, "$1")

	// Remove markdown images ![alt](url)
	text = regexp.MustCompile(`!\[([^\]]*)\]\([^\)]+\)`).ReplaceAllString(text, "")

	// Remove markdown code blocks (```code```)
	text = regexp.MustCompile("```[^`]*```").ReplaceAllString(text, "")

	// Remove inline code (`code`)
	text = regexp.MustCompile("`([^`]+)`").ReplaceAllString(text, "$1")

	// Remove markdown blockquotes (> text)
	text = regexp.MustCompile(`(?m)^>\s+`).ReplaceAllString(text, "")

	// Remove markdown lists (- item or * item or + item)
	text = regexp.MustCompile(`(?m)^[\-\*\+]\s+`).ReplaceAllString(text, "")

	// Remove numbered lists (1. item)
	text = regexp.MustCompile(`(?m)^\d+\.\s+`).ReplaceAllString(text, "")

	// Remove horizontal rules (--- or ***)
	text = regexp.MustCompile(`(?m)^[\-\*]{3,}$`).ReplaceAllString(text, "")

	// Remove emojis and special unicode characters
	emojiPattern := regexp.MustCompile(
		`[\x{1F600}-\x{1F64F}]|[\x{1F300}-\x{1F5FF}]|[\x{1F680}-\x{1F6FF}]|[\x{1F1E0}-\x{1F1FF}]|[\x{2600}-\x{26FF}]|[\x{2700}-\x{27BF}]|[\x{1F900}-\x{1F9FF}]|[\x{1FA70}-\x{1FAFF}]`,
	)
	text = emojiPattern.ReplaceAllString(text, "")

	// Replace multiple newlines with single space
	text = regexp.MustCompile(`\n+`).ReplaceAllString(text, " ")

	// Replace multiple spaces with single space
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")

	// Remove leading/trailing whitespace
	text = strings.TrimSpace(text)

	return text
}

// Generate creates an embedding vector from text using OpenAI API
func (s *OpenAIService) Generate(text string) ([]float32, error) {
	if text == "" {
		return nil, fmt.Errorf("text cannot be empty")
	}

	// Clean the text
	cleanedText := cleanTextOpenAI(text)

	if cleanedText == "" {
		return nil, fmt.Errorf("text is empty after cleaning")
	}

	// Call OpenAI API
	ctx := context.Background()
	resp, err := s.client.Embeddings.New(ctx, openai.EmbeddingNewParams{
		Input: openai.EmbeddingNewParamsInputUnion{
			OfArrayOfStrings: []string{cleanedText},
		},
		Model: openai.EmbeddingModelTextEmbedding3Small,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate embedding: %w", err)
	}

	// Check if we got a result
	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("no embedding returned from API")
	}

	// Convert []float64 to []float32
	embedding64 := resp.Data[0].Embedding
	embedding32 := make([]float32, len(embedding64))
	for i, v := range embedding64 {
		embedding32[i] = float32(v)
	}

	return embedding32, nil
}

// GenerateForNote creates an embedding from note title and content
func (s *OpenAIService) GenerateForNote(title, content string) ([]float32, error) {
	// Combine title and content with more weight on title
	// Title is repeated to give it more importance in the embedding
	combined := fmt.Sprintf("%s %s %s", title, title, content)
	return s.Generate(combined)
}
