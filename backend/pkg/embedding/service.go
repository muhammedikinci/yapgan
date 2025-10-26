package embedding

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"math"
	"regexp"
	"strings"
)

// Service handles text embedding generation
type Service struct {
	vectorSize int
}

// NewService creates a new embedding service
func NewService(vectorSize int) *Service {
	return &Service{
		vectorSize: vectorSize,
	}
}

// cleanText removes markdown, emojis, extra whitespace and newlines
func cleanText(text string) string {
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
	// This regex removes most emojis and emoticons
	emojiPattern := regexp.MustCompile(`[\x{1F600}-\x{1F64F}]|[\x{1F300}-\x{1F5FF}]|[\x{1F680}-\x{1F6FF}]|[\x{1F1E0}-\x{1F1FF}]|[\x{2600}-\x{26FF}]|[\x{2700}-\x{27BF}]|[\x{1F900}-\x{1F9FF}]|[\x{1FA70}-\x{1FAFF}]`)
	text = emojiPattern.ReplaceAllString(text, "")
	
	// Replace multiple newlines with single space
	text = regexp.MustCompile(`\n+`).ReplaceAllString(text, " ")
	
	// Replace multiple spaces with single space
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	
	// Remove leading/trailing whitespace
	text = strings.TrimSpace(text)
	
	return text
}

// Generate creates an embedding vector from text
// Simple bag-of-words with character n-grams for better semantic matching
// In production, use a real embedding model (sentence-transformers, OpenAI, etc.)
func (s *Service) Generate(text string) ([]float32, error) {
	if text == "" {
		return nil, fmt.Errorf("text cannot be empty")
	}

	// Clean the text
	cleanedText := cleanText(text)
	
	if cleanedText == "" {
		return nil, fmt.Errorf("text is empty after cleaning")
	}

	// Normalize text
	cleanedText = strings.ToLower(strings.TrimSpace(cleanedText))
	
	// Create a vector
	vector := make([]float32, s.vectorSize)
	
	// Split into words
	words := strings.Fields(cleanedText)
	
	// Process each word
	for _, word := range words {
		if len(word) < 2 {
			continue
		}
		
		// Hash the word to get a deterministic position in the vector
		hash := sha256.Sum256([]byte(word))
		seed := binary.BigEndian.Uint64(hash[:8])
		
		// Use multiple positions for each word (like a bloom filter)
		for i := 0; i < 5; i++ {
			pos := int((seed + uint64(i)*12345) % uint64(s.vectorSize))
			// Increment the value at this position
			vector[pos] += 1.0
		}
		
		// Also process character trigrams for partial matching
		if len(word) >= 3 {
			for i := 0; i <= len(word)-3; i++ {
				trigram := word[i : i+3]
				hash := sha256.Sum256([]byte(trigram))
				seed := binary.BigEndian.Uint64(hash[:8])
				
				for j := 0; j < 2; j++ {
					pos := int((seed + uint64(j)*54321) % uint64(s.vectorSize))
					vector[pos] += 0.3 // Trigrams have less weight than full words
				}
			}
		}
	}
	
	// Process bigrams for phrase matching
	for i := 0; i < len(words)-1; i++ {
		bigram := words[i] + "_" + words[i+1]
		hash := sha256.Sum256([]byte(bigram))
		seed := binary.BigEndian.Uint64(hash[:8])
		
		for j := 0; j < 3; j++ {
			pos := int((seed + uint64(j)*98765) % uint64(s.vectorSize))
			vector[pos] += 1.5 // Bigrams get extra weight for phrase matching
		}
	}

	// Normalize vector to unit length (for cosine similarity)
	magnitude := float32(0.0)
	for _, v := range vector {
		magnitude += v * v
	}
	magnitude = float32(math.Sqrt(float64(magnitude)))

	if magnitude > 0 {
		for i := range vector {
			vector[i] /= magnitude
		}
	}

	return vector, nil
}

// GenerateForNote creates an embedding from note title and content
func (s *Service) GenerateForNote(title, content string) ([]float32, error) {
	// Combine title and content with more weight on title
	// Title is repeated to give it more importance in the embedding
	combined := fmt.Sprintf("%s %s %s", title, title, content)
	return s.Generate(combined)
}
