package notes

import (
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

func (h *Handler) CreateNote(c echo.Context) error {
	userID := c.Get("user_id").(string)

	var req CreateNoteRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	note, err := h.service.CreateNote(c.Request().Context(), userID, req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, note)
}

func (h *Handler) GetNote(c echo.Context) error {
	userID := c.Get("user_id").(string)
	noteID := c.Param("id")

	note, err := h.service.GetNote(c.Request().Context(), userID, noteID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, note)
}

func (h *Handler) UpdateNote(c echo.Context) error {
	userID := c.Get("user_id").(string)
	noteID := c.Param("id")

	var req UpdateNoteRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	note, err := h.service.UpdateNote(c.Request().Context(), userID, noteID, req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, note)
}

func (h *Handler) DeleteNote(c echo.Context) error {
	userID := c.Get("user_id").(string)
	noteID := c.Param("id")

	if err := h.service.DeleteNote(c.Request().Context(), userID, noteID); err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) ListNotes(c echo.Context) error {
	userID := c.Get("user_id").(string)

	// Parse query parameters
	page, _ := strconv.Atoi(c.QueryParam("page"))
	perPage, _ := strconv.Atoi(c.QueryParam("per_page"))
	search := c.QueryParam("search")
	tags := c.QueryParams()["tags"]

	req := ListNotesRequest{
		Page:    page,
		PerPage: perPage,
		Search:  search,
		Tags:    tags,
	}

	response, err := h.service.ListNotes(c.Request().Context(), userID, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *Handler) ListTags(c echo.Context) error {
	userID := c.Get("user_id").(string)

	tags, err := h.service.ListAllTags(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"tags": tags,
	})
}

func (h *Handler) DeleteTag(c echo.Context) error {
	userID := c.Get("user_id").(string)
	tagID := c.Param("id")

	notesCount, err := h.service.DeleteTag(c.Request().Context(), userID, tagID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":       "Tag and associated notes deleted successfully",
		"notes_deleted": notesCount,
	})
}

func (h *Handler) GetStats(c echo.Context) error {
	userID := c.Get("user_id").(string)

	stats, err := h.service.GetStats(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, stats)
}

func (h *Handler) Search(c echo.Context) error {
	userID := c.Get("user_id").(string)

	var req SearchRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	// Set user ID from JWT context
	req.UserID = userID

	results, err := h.service.Search(c.Request().Context(), userID, req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, results)
}

func (h *Handler) GetVectorSpace(c echo.Context) error {
	userID := c.Get("user_id").(string)

	// Parse optional limit parameter
	limit := 1000
	if limitParam := c.QueryParam("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil {
			limit = parsedLimit
		}
	}

	response, err := h.service.GetVectorSpace(c.Request().Context(), userID, limit)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *Handler) GetBacklinks(c echo.Context) error {
	userID := c.Get("user_id").(string)
	noteID := c.Param("id")

	backlinks, err := h.service.GetBacklinks(c.Request().Context(), userID, noteID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, backlinks)
}

func (h *Handler) GetGraph(c echo.Context) error {
	userID := c.Get("user_id").(string)

	graph, err := h.service.GetGraph(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, graph)
}

// ShareNote toggles public sharing for a note
func (h *Handler) ShareNote(c echo.Context) error {
	userID := c.Get("user_id").(string)
	noteID := c.Param("id")

	var req ShareNoteRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	// Get base URL from request
	scheme := "http"
	if c.Request().TLS != nil || c.Request().Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	baseURL := scheme + "://" + c.Request().Host

	response, err := h.service.ShareNote(
		c.Request().Context(),
		userID,
		noteID,
		req.IsPublic,
		baseURL,
	)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

// GetPublicNote retrieves a public note by slug (no authentication required)
func (h *Handler) GetPublicNote(c echo.Context) error {
	slug := c.Param("slug")

	note, err := h.service.GetPublicNote(c.Request().Context(), slug)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "note not found or not public",
		})
	}

	return c.JSON(http.StatusOK, note)
}

// ============================================================
// Version History Handlers
// ============================================================

// ListVersions returns all versions for a note
func (h *Handler) ListVersions(c echo.Context) error {
	userID := c.Get("user_id").(string)
	noteID := c.Param("id")

	versions, err := h.service.ListVersions(c.Request().Context(), userID, noteID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, versions)
}

// GetVersionDiff returns the diff between two versions
func (h *Handler) GetVersionDiff(c echo.Context) error {
	userID := c.Get("user_id").(string)
	noteID := c.Param("id")
	v1Str := c.Param("v1")
	v2Str := c.Param("v2")

	v1, err := strconv.Atoi(v1Str)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid version number v1",
		})
	}

	v2, err := strconv.Atoi(v2Str)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid version number v2",
		})
	}

	diff, err := h.service.GetVersionDiff(c.Request().Context(), userID, noteID, v1, v2)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, diff)
}

// RestoreVersion restores a note to a previous version
func (h *Handler) RestoreVersion(c echo.Context) error {
	userID := c.Get("user_id").(string)
	noteID := c.Param("id")

	var req RestoreVersionRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	if req.VersionID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "version_id is required",
		})
	}

	note, err := h.service.RestoreVersion(c.Request().Context(), userID, noteID, req.VersionID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, note)
}
