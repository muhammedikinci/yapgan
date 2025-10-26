package chat

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// CreateConversation creates a new conversation for a note
func (h *Handler) CreateConversation(c echo.Context) error {
	userID := c.Get("user_id").(string)

	var req CreateConversationRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	// Validate note_id is provided
	if req.NoteID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "note_id is required",
		})
	}

	conv, err := h.service.CreateConversation(c.Request().Context(), userID, req.NoteID, req.Title)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, conv)
}

// GetConversation gets a conversation with messages
func (h *Handler) GetConversation(c echo.Context) error {
	userID := c.Get("user_id").(string)
	conversationID := c.Param("id")

	result, err := h.service.GetConversation(c.Request().Context(), userID, conversationID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, result)
}

// ListConversations lists user's conversations
func (h *Handler) ListConversations(c echo.Context) error {
	userID := c.Get("user_id").(string)

	page, _ := strconv.Atoi(c.QueryParam("page"))
	perPage, _ := strconv.Atoi(c.QueryParam("per_page"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}

	result, err := h.service.ListConversations(c.Request().Context(), userID, page, perPage)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, result)
}

// DeleteConversation deletes a conversation
func (h *Handler) DeleteConversation(c echo.Context) error {
	userID := c.Get("user_id").(string)
	conversationID := c.Param("id")

	err := h.service.DeleteConversation(c.Request().Context(), userID, conversationID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "conversation deleted",
	})
}

// SendMessage sends a message (non-streaming)
func (h *Handler) SendMessage(c echo.Context) error {
	userID := c.Get("user_id").(string)
	conversationID := c.Param("id")

	var req SendMessageRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	if req.Message == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "message is required",
		})
	}

	// Get conversation to check note_id
	_, err := h.service.GetConversation(c.Request().Context(), userID, conversationID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "conversation not found",
		})
	}

	response, err := h.service.SendMessage(
		c.Request().Context(),
		userID,
		conversationID,
		req.Message,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"response": response,
	})
}

// SendMessageStream sends a message with SSE streaming
func (h *Handler) SendMessageStream(c echo.Context) error {
	userID := c.Get("user_id").(string)
	conversationID := c.Param("id")

	var req SendMessageRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	if req.Message == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "message is required",
		})
	}

	// Set headers for SSE
	c.Response().Header().Set(echo.HeaderContentType, "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().WriteHeader(http.StatusOK)

	// Flush immediately
	if f, ok := c.Response().Writer.(http.Flusher); ok {
		f.Flush()
	}

	// Stream callback
	callback := func(chunk string) error {
		// SSE format: data: {json}\n\n
		data := fmt.Sprintf("data: {\"content\":\"%s\"}\n\n", escapeJSON(chunk))
		if _, err := c.Response().Write([]byte(data)); err != nil {
			return err
		}

		// Flush after each chunk
		if f, ok := c.Response().Writer.(http.Flusher); ok {
			f.Flush()
		}

		return nil
	}

	// Send message with streaming
	err := h.service.SendMessageStream(
		c.Request().Context(),
		userID,
		conversationID,
		req.Message,
		callback,
	)
	if err != nil {
		// Send error as SSE
		errorData := fmt.Sprintf("data: {\"error\":\"%s\"}\n\n", escapeJSON(err.Error()))
		c.Response().Write([]byte(errorData))
		if f, ok := c.Response().Writer.(http.Flusher); ok {
			f.Flush()
		}
		return nil
	}

	// Send done signal
	doneData := "data: {\"done\":true}\n\n"
	c.Response().Write([]byte(doneData))

	if f, ok := c.Response().Writer.(http.Flusher); ok {
		f.Flush()
	}

	return nil
}

// escapeJSON escapes quotes and newlines for JSON strings
func escapeJSON(s string) string {
	s = escapeString(s, '"', '\\', '"')
	s = escapeString(s, '\n', '\\', 'n')
	s = escapeString(s, '\r', '\\', 'r')
	return s
}

func escapeString(s string, char rune, escape rune, replacement rune) string {
	result := ""
	for _, c := range s {
		if c == char {
			result += string(escape) + string(replacement)
		} else {
			result += string(c)
		}
	}
	return result
}
