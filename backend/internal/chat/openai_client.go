package chat

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// OpenAIClient handles communication with OpenAI API (GPT-5 nano)
type OpenAIClient struct {
	apiKey  string
	baseURL string
	model   string
}

func NewOpenAIClient(apiKey string) *OpenAIClient {
	return &OpenAIClient{
		apiKey:  apiKey,
		baseURL: "https://api.openai.com/v1",
		model:   "gpt-5-nano", // GPT-5 nano model
	}
}

// ChatCompletion sends a chat completion request (non-streaming)
func (c *OpenAIClient) ChatCompletion(ctx context.Context, messages []OpenAIMessage) (*OpenAIResponse, error) {
	reqBody := OpenAIRequest{
		Model:               c.model,
		Messages:            messages,
		Temperature:         1.0,                // GPT-5 nano requires temperature=1
		MaxCompletionTokens: 1500,
		ReasoningEffort:     "low",              // GPT-5 nano: "low", "medium", "high" - low is fastest & cheapest
		Stream:              false,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/chat/completions", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI API error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var response OpenAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &response, nil
}

// ChatCompletionStream sends a chat completion request with streaming
func (c *OpenAIClient) ChatCompletionStream(ctx context.Context, messages []OpenAIMessage, callback func(string) error) error {
	reqBody := OpenAIRequest{
		Model:               c.model,
		Messages:            messages,
		Temperature:         1.0,                // GPT-5 nano requires temperature=1
		MaxCompletionTokens: 1500,
		ReasoningEffort:     "low",              // GPT-5 nano: "low" is fastest & cheapest
		Stream:              true,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/chat/completions", bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("OpenAI API error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	// Read SSE stream
	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("error reading stream: %w", err)
		}

		// SSE format: "data: {json}\n"
		lineStr := string(line)
		if !strings.HasPrefix(lineStr, "data: ") {
			continue
		}

		// Remove "data: " prefix
		dataStr := strings.TrimPrefix(lineStr, "data: ")
		dataStr = strings.TrimSpace(dataStr)

		// Check for [DONE] signal
		if dataStr == "[DONE]" {
			break
		}

		// Parse JSON chunk
		var chunk OpenAIStreamChunk
		if err := json.Unmarshal([]byte(dataStr), &chunk); err != nil {
			// Skip invalid JSON
			continue
		}

		// Extract content from delta
		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			if err := callback(chunk.Choices[0].Delta.Content); err != nil {
				return err
			}
		}
	}

	return nil
}
