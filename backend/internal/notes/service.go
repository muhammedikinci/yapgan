package notes

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/qdrant/go-client/qdrant"
)

// NoteRepository defines what the notes service needs from a note repository
// Interface is defined here by the consumer (Service), not by the implementation
type NoteRepository interface {
	Create(ctx context.Context, userID, title, contentMd string, sourceURL *string) (*Note, error)
	FindByID(ctx context.Context, userID, noteID string) (*Note, error)
	Update(
		ctx context.Context,
		userID, noteID string,
		title, contentMd *string,
		sourceURL *string,
	) (*Note, error)
	Delete(ctx context.Context, userID, noteID string) error
	List(
		ctx context.Context,
		userID string,
		page, perPage int,
		tagIDs []string,
		search string,
	) ([]Note, int, error)
	GetNoteTags(ctx context.Context, noteID string) ([]string, error)
	CountByUser(ctx context.Context, userID string) (int, error)
	// Public sharing methods
	TogglePublic(
		ctx context.Context,
		userID, noteID string,
		isPublic bool,
		publicSlug *string,
	) error
	FindByPublicSlug(ctx context.Context, slug string) (*Note, error)
	IncrementViewCount(ctx context.Context, noteID string) error
	IsSlugAvailable(ctx context.Context, slug string) (bool, error)
}

// TagRepository defines what the notes service needs from a tag repository
// Interface is defined here by the consumer (Service), not by the implementation
type TagRepository interface {
	FindOrCreateByName(ctx context.Context, userID, name string) (*Tag, error)
	FindByID(ctx context.Context, userID, tagID string) (*Tag, error)
	FindByIDs(ctx context.Context, userID string, tagIDs []string) ([]Tag, error)
	FindByNames(ctx context.Context, userID string, names []string) ([]Tag, error)
	AssignToNote(ctx context.Context, noteID, tagID string) error
	RemoveFromNote(ctx context.Context, noteID, tagID string) error
	SetNoteTags(ctx context.Context, noteID string, tagIDs []string) error
	ListAll(ctx context.Context, userID string) ([]Tag, error)
	CountAll(ctx context.Context, userID string) (int, error)
	Delete(ctx context.Context, userID, tagID string) ([]string, error) // Returns deleted note IDs
	GetNotesCountByTag(ctx context.Context, userID, tagID string) (int, error)
}

// VectorStore defines interface for vector storage operations
type VectorStore interface {
	UpsertPoint(
		ctx context.Context,
		id string,
		vector []float32,
		payload map[string]interface{},
	) error
	DeletePoint(ctx context.Context, id string) error
	SearchWithFilter(
		ctx context.Context,
		vector []float32,
		userID string,
		limit uint64,
	) ([]*qdrant.ScoredPoint, error)
	GetAllUserPoints(
		ctx context.Context,
		userID string,
		limit uint64,
	) ([]*qdrant.RetrievedPoint, error)
}

// EmbeddingService defines interface for generating embeddings
type EmbeddingService interface {
	Generate(text string) ([]float32, error)
	GenerateForNote(title, content string) ([]float32, error)
}

// LinkRepository defines interface for note linking operations
type LinkRepository interface {
	CreateLink(ctx context.Context, sourceNoteID, targetNoteID string) error
	DeleteLinksForNote(ctx context.Context, noteID string) error
	GetBacklinks(ctx context.Context, noteID string) ([]LinkedNote, error)
	GetOutlinks(ctx context.Context, noteID string) ([]LinkedNote, error)
	GetAllLinksForUser(ctx context.Context, userID string) ([]GraphNode, []GraphLink, error)
	FindNoteByTitle(ctx context.Context, userID, title string) (string, error)
}

type Service struct {
	noteRepo         NoteRepository
	tagRepo          TagRepository
	linkRepo         LinkRepository
	versionRepo      VersionRepository
	vectorStore      VectorStore
	embeddingService EmbeddingService
	defaultPageSize  int
	maxPageSize      int
}

func NewService(
	noteRepo NoteRepository,
	tagRepo TagRepository,
	linkRepo LinkRepository,
	versionRepo VersionRepository,
	vectorStore VectorStore,
	embeddingService EmbeddingService,
	defaultPageSize, maxPageSize int,
) *Service {
	return &Service{
		noteRepo:         noteRepo,
		tagRepo:          tagRepo,
		linkRepo:         linkRepo,
		versionRepo:      versionRepo,
		vectorStore:      vectorStore,
		embeddingService: embeddingService,
		defaultPageSize:  defaultPageSize,
		maxPageSize:      maxPageSize,
	}
}

func (s *Service) CreateNote(
	ctx context.Context,
	userID string,
	req CreateNoteRequest,
) (*Note, error) {
	// Validate input
	if req.Title == "" {
		return nil, fmt.Errorf("title is required")
	}

	if req.ContentMd == "" {
		return nil, fmt.Errorf("content is required")
	}

	req.Tags = uniqueStrings(req.Tags)

	// Create note
	note, err := s.noteRepo.Create(ctx, userID, req.Title, req.ContentMd, req.SourceURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create note: %w", err)
	}

	// Handle tags if provided
	if len(req.Tags) > 0 {
		tagIDs, err := s.ensureTagsExist(ctx, userID, req.Tags)
		if err != nil {
			return nil, fmt.Errorf("failed to process tags: %w", err)
		}

		if err := s.tagRepo.SetNoteTags(ctx, note.ID, tagIDs); err != nil {
			return nil, fmt.Errorf("failed to assign tags: %w", err)
		}

		note.Tags = req.Tags
	}

	// Extract and create note links from [[note-title]] syntax
	if err := s.processNoteLinks(ctx, userID, note.ID, req.ContentMd); err != nil {
		// Log error but don't fail note creation
		fmt.Printf("Warning: failed to process note links: %v\n", err)
	}

	// Generate embedding and store in Qdrant (async, don't fail note creation if this fails)
	go func() {
		if err := s.indexNote(context.Background(), note); err != nil {
			// Log error but don't fail the note creation
			fmt.Printf("Warning: failed to index note %s in vector store: %v\n", note.ID, err)
		}
	}()

	return note, nil
}

func uniqueStrings(input []string) []string {
	seen := make(map[string]struct{})
	result := make([]string, 0, len(input))

	for _, v := range input {
		if _, exists := seen[v]; !exists {
			seen[v] = struct{}{}
			result = append(result, v)
		}
	}

	return result
}

// indexNote generates embedding and stores it in Qdrant
func (s *Service) indexNote(ctx context.Context, note *Note) error {
	// Generate embedding
	vector, err := s.embeddingService.GenerateForNote(note.Title, note.ContentMd)
	if err != nil {
		return fmt.Errorf("failed to generate embedding: %w", err)
	}

	// Prepare payload with note metadata (including content for GPT context)
	payload := map[string]interface{}{
		"note_id": note.ID,
		"user_id": note.UserID,
		"title":   note.Title,
		"content": note.ContentMd, // Store full content for GPT context
	}

	// Store in vector database
	if err := s.vectorStore.UpsertPoint(ctx, note.ID, vector, payload); err != nil {
		return fmt.Errorf("failed to store vector: %w", err)
	}

	return nil
}

func (s *Service) GetNote(ctx context.Context, userID, noteID string) (*Note, error) {
	note, err := s.noteRepo.FindByID(ctx, userID, noteID)
	if err != nil {
		return nil, err
	}

	// Get tags
	tags, err := s.noteRepo.GetNoteTags(ctx, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get note tags: %w", err)
	}

	note.Tags = tags
	return note, nil
}

func (s *Service) UpdateNote(
	ctx context.Context,
	userID, noteID string,
	req UpdateNoteRequest,
) (*Note, error) {
	// Update note fields
	note, err := s.noteRepo.Update(ctx, userID, noteID, req.Title, req.ContentMd, req.SourceURL)
	if err != nil {
		return nil, err
	}

	// Update tags if provided
	if req.Tags != nil {
		tagIDs, err := s.ensureTagsExist(ctx, userID, req.Tags)
		if err != nil {
			return nil, fmt.Errorf("failed to process tags: %w", err)
		}

		if err := s.tagRepo.SetNoteTags(ctx, note.ID, tagIDs); err != nil {
			return nil, fmt.Errorf("failed to update tags: %w", err)
		}

		note.Tags = req.Tags
	} else {
		// Get existing tags
		tags, err := s.noteRepo.GetNoteTags(ctx, noteID)
		if err != nil {
			return nil, fmt.Errorf("failed to get note tags: %w", err)
		}
		note.Tags = tags
	}

	// Update note links if content changed
	if req.ContentMd != nil {
		if err := s.processNoteLinks(ctx, userID, note.ID, *req.ContentMd); err != nil {
			fmt.Printf("Warning: failed to process note links: %v\n", err)
		}
	}

	// Re-index note in Qdrant (async)
	go func() {
		if err := s.indexNote(context.Background(), note); err != nil {
			fmt.Printf("Warning: failed to re-index note %s in vector store: %v\n", note.ID, err)
		}
	}()

	return note, nil
}

func (s *Service) DeleteNote(ctx context.Context, userID, noteID string) error {
	// Delete from database
	if err := s.noteRepo.Delete(ctx, userID, noteID); err != nil {
		return err
	}

	// Delete from vector store (async, don't fail if this fails)
	go func() {
		if err := s.vectorStore.DeletePoint(context.Background(), noteID); err != nil {
			fmt.Printf("Warning: failed to delete note %s from vector store: %v\n", noteID, err)
		}
	}()

	return nil
}

func (s *Service) ListNotes(
	ctx context.Context,
	userID string,
	req ListNotesRequest,
) (*ListNotesResponse, error) {
	// Validate pagination
	if req.Page < 1 {
		req.Page = 1
	}

	if req.PerPage < 1 {
		req.PerPage = s.defaultPageSize
	}

	if req.PerPage > s.maxPageSize {
		req.PerPage = s.maxPageSize
	}

	// Get tag IDs if tag filter is provided
	var tagIDs []string
	if len(req.Tags) > 0 {
		tags, err := s.tagRepo.FindByNames(ctx, userID, req.Tags)
		if err != nil {
			return nil, fmt.Errorf("failed to find tags: %w", err)
		}

		tagIDs = make([]string, len(tags))
		for i, tag := range tags {
			tagIDs[i] = tag.ID
		}
	}

	// Get notes
	notes, total, err := s.noteRepo.List(ctx, userID, req.Page, req.PerPage, tagIDs, req.Search)
	if err != nil {
		return nil, err
	}

	// Get tags for each note
	for i := range notes {
		tags, err := s.noteRepo.GetNoteTags(ctx, notes[i].ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get note tags: %w", err)
		}
		notes[i].Tags = tags
	}

	totalPages := int(math.Ceil(float64(total) / float64(req.PerPage)))

	return &ListNotesResponse{
		Notes:      notes,
		Total:      total,
		Page:       req.Page,
		PerPage:    req.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (s *Service) ListAllTags(ctx context.Context, userID string) ([]Tag, error) {
	return s.tagRepo.ListAll(ctx, userID)
}

func (s *Service) DeleteTag(ctx context.Context, userID, tagID string) (int, error) {
	// First verify the tag exists and belongs to the user
	_, err := s.tagRepo.FindByID(ctx, userID, tagID)
	if err != nil {
		return 0, err
	}

	// Get count of notes that will be deleted
	notesCount, err := s.tagRepo.GetNotesCountByTag(ctx, userID, tagID)
	if err != nil {
		return 0, fmt.Errorf("failed to count notes: %w", err)
	}

	// Delete the tag (and associated notes), returns deleted note IDs
	deletedNoteIDs, err := s.tagRepo.Delete(ctx, userID, tagID)
	if err != nil {
		return 0, fmt.Errorf("failed to delete tag: %w", err)
	}

	// Delete notes from Qdrant (async, don't fail if this fails)
	if len(deletedNoteIDs) > 0 {
		go func() {
			for _, noteID := range deletedNoteIDs {
				if err := s.vectorStore.DeletePoint(context.Background(), noteID); err != nil {
					fmt.Printf(
						"Warning: failed to delete note %s from vector store: %v\n",
						noteID,
						err,
					)
				}
			}
		}()
	}

	return notesCount, nil
}

func (s *Service) GetStats(ctx context.Context, userID string) (*StatsResponse, error) {
	notesCount, err := s.noteRepo.CountByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count notes: %w", err)
	}

	tagsCount, err := s.tagRepo.CountAll(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count tags: %w", err)
	}

	return &StatsResponse{
		NotesCount: notesCount,
		TagsCount:  tagsCount,
	}, nil
}

func (s *Service) Search(
	ctx context.Context,
	userID string,
	req SearchRequest,
) (*SearchResponse, error) {
	// Validate request
	if req.Query == "" {
		return nil, fmt.Errorf("query is required")
	}

	// Validate query length (min 2, max 50 characters)
	queryLen := len(strings.TrimSpace(req.Query))
	if queryLen < 2 {
		return nil, fmt.Errorf("query must be at least 2 characters long")
	}
	if queryLen > 50 {
		return nil, fmt.Errorf("query must be at most 50 characters long")
	}

	// Set default limit
	if req.Limit <= 0 {
		req.Limit = 10
	}
	if req.Limit > 50 {
		req.Limit = 50
	}

	// Generate embedding for search query
	vector, err := s.embeddingService.Generate(req.Query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	// Search in Qdrant with user filter
	results, err := s.vectorStore.SearchWithFilter(ctx, vector, userID, uint64(req.Limit))
	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	// Convert results to SearchResult slice
	searchResults := []SearchResult{}

	for _, point := range results {
		if point == nil {
			continue
		}

		result := SearchResult{
			Score: point.Score,
		}

		// Extract note_id and title from payload
		if point.Payload != nil {
			if noteIDVal, ok := point.Payload["note_id"]; ok && noteIDVal != nil {
				if noteIDVal.GetStringValue() != "" {
					result.NoteID = noteIDVal.GetStringValue()
				}
			}
			if titleVal, ok := point.Payload["title"]; ok && titleVal != nil {
				if titleVal.GetStringValue() != "" {
					result.Title = titleVal.GetStringValue()
				}
			}
		}

		searchResults = append(searchResults, result)
	}

	return &SearchResponse{
		Results: searchResults,
		Query:   req.Query,
	}, nil
}

func (s *Service) GetVectorSpace(
	ctx context.Context,
	userID string,
	limit int,
) (*VectorSpaceResponse, error) {
	// Set default and max limit
	if limit <= 0 {
		limit = 1000
	}
	if limit > 10000 {
		limit = 10000
	}

	// Get all user points from Qdrant with vectors
	points, err := s.vectorStore.GetAllUserPoints(ctx, userID, uint64(limit))
	if err != nil {
		return nil, fmt.Errorf("failed to get user points: %w", err)
	}

	vectorPoints := make([]VectorPoint, 0, len(points))

	for _, point := range points {
		if point == nil || point.Vectors == nil {
			continue
		}

		vp := VectorPoint{}

		// Extract vector data
		if vectorData := point.Vectors.GetVector(); vectorData != nil {
			vp.Vector = vectorData.Data
		}

		// Extract payload data
		if point.Payload != nil {
			if noteIDVal, ok := point.Payload["note_id"]; ok && noteIDVal != nil {
				vp.NoteID = noteIDVal.GetStringValue()
			}
			if titleVal, ok := point.Payload["title"]; ok && titleVal != nil {
				vp.Title = titleVal.GetStringValue()
			}
			if createdAtVal, ok := point.Payload["created_at"]; ok && createdAtVal != nil {
				vp.CreatedAt = time.Time{}
			}
		}

		// Get note details including tags
		if vp.NoteID != "" {
			tags, err := s.noteRepo.GetNoteTags(ctx, vp.NoteID)
			if err == nil {
				vp.Tags = tags
			}
		}

		vectorPoints = append(vectorPoints, vp)
	}

	return &VectorSpaceResponse{
		Points: vectorPoints,
		Total:  len(vectorPoints),
	}, nil
}

// ensureTagsExist creates tags if they don't exist and returns their IDs
func (s *Service) ensureTagsExist(
	ctx context.Context,
	userID string,
	tagNames []string,
) ([]string, error) {
	tagIDs := make([]string, 0, len(tagNames))

	for _, name := range tagNames {
		tag, err := s.tagRepo.FindOrCreateByName(ctx, userID, name)
		if err != nil {
			return nil, err
		}
		tagIDs = append(tagIDs, tag.ID)
	}

	return tagIDs, nil
}

// processNoteLinks extracts [[note-title]] links and creates link records
func (s *Service) processNoteLinks(ctx context.Context, userID, noteID, content string) error {
	// Delete existing links for this note
	if err := s.linkRepo.DeleteLinksForNote(ctx, noteID); err != nil {
		return err
	}

	// Extract linked note titles from content
	linkedTitles := ExtractNoteLinks(content)
	if len(linkedTitles) == 0 {
		return nil
	}

	// Find and create links for each referenced note
	for _, title := range linkedTitles {
		targetNoteID, err := s.linkRepo.FindNoteByTitle(ctx, userID, title)
		if err != nil {
			// Note doesn't exist yet, skip it (link will be created when note is created)
			continue
		}

		// Create the link
		if err := s.linkRepo.CreateLink(ctx, noteID, targetNoteID); err != nil {
			return err
		}
	}

	return nil
}

// GetBacklinks returns notes that link to and from this note
func (s *Service) GetBacklinks(
	ctx context.Context,
	userID, noteID string,
) (*BacklinksResponse, error) {
	// Verify note belongs to user
	_, err := s.noteRepo.FindByID(ctx, userID, noteID)
	if err != nil {
		return nil, err
	}

	backlinks, err := s.linkRepo.GetBacklinks(ctx, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get backlinks: %w", err)
	}

	outlinks, err := s.linkRepo.GetOutlinks(ctx, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get outlinks: %w", err)
	}

	return &BacklinksResponse{
		Backlinks: backlinks,
		Outlinks:  outlinks,
	}, nil
}

// GetGraph returns all notes and their connections for graph visualization
func (s *Service) GetGraph(ctx context.Context, userID string) (*GraphResponse, error) {
	nodes, links, err := s.linkRepo.GetAllLinksForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get graph data: %w", err)
	}

	return &GraphResponse{
		Nodes: nodes,
		Links: links,
	}, nil
}

// ShareNote toggles the public status of a note
func (s *Service) ShareNote(
	ctx context.Context,
	userID, noteID string,
	isPublic bool,
	baseURL string,
) (*ShareNoteResponse, error) {
	// Verify note belongs to user
	note, err := s.noteRepo.FindByID(ctx, userID, noteID)
	if err != nil {
		return nil, err
	}

	var publicSlug *string
	if isPublic {
		// Generate slug from title if sharing
		slug := generateSlug(note.Title, noteID)

		// Check if slug is available
		available, err := s.noteRepo.IsSlugAvailable(ctx, slug)
		if err != nil {
			return nil, fmt.Errorf("failed to check slug availability: %w", err)
		}

		// If not available, add a suffix
		if !available {
			slug = fmt.Sprintf("%s-%s", slug, noteID[:8])
		}

		publicSlug = &slug
	}

	// Update public status
	err = s.noteRepo.TogglePublic(ctx, userID, noteID, isPublic, publicSlug)
	if err != nil {
		return nil, err
	}

	// Build response
	response := &ShareNoteResponse{
		IsPublic:   isPublic,
		PublicSlug: publicSlug,
	}

	if isPublic && publicSlug != nil {
		publicURL := fmt.Sprintf("%s/public/%s", baseURL, *publicSlug)
		response.PublicURL = &publicURL
	}

	return response, nil
}

// GetPublicNote retrieves a public note by slug and increments view count
func (s *Service) GetPublicNote(ctx context.Context, slug string) (*PublicNoteResponse, error) {
	// Find public note
	note, err := s.noteRepo.FindByPublicSlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	// Get tags
	tags, err := s.noteRepo.GetNoteTags(ctx, note.ID)
	if err != nil {
		// Log error but don't fail
		tags = []string{}
	}

	// Increment view count asynchronously (don't block the response)
	go func() {
		if err := s.noteRepo.IncrementViewCount(context.Background(), note.ID); err != nil {
			// Log error (in production, use proper logger)
			fmt.Printf("failed to increment view count: %v\n", err)
		}
	}()

	return &PublicNoteResponse{
		ID:        note.ID,
		Title:     note.Title,
		ContentMd: note.ContentMd,
		SourceURL: note.SourceURL,
		Tags:      tags,
		ViewCount: note.ViewCount,
		SharedAt:  note.SharedAt,
		CreatedAt: note.CreatedAt,
	}, nil
}

// ============================================================
// Version History Methods
// ============================================================

// ListVersions returns all versions for a note
func (s *Service) ListVersions(
	ctx context.Context,
	userID, noteID string,
) (*ListVersionsResponse, error) {
	// Verify note belongs to user
	_, err := s.noteRepo.FindByID(ctx, userID, noteID)
	if err != nil {
		return nil, fmt.Errorf("note not found or access denied: %w", err)
	}

	// Get all versions
	versions, err := s.versionRepo.ListVersions(ctx, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list versions: %w", err)
	}

	// Get current version number (highest version number)
	currentVersion := 0
	if len(versions) > 0 {
		currentVersion = versions[0].VersionNumber
	}

	return &ListVersionsResponse{
		Versions:       versions,
		Total:          len(versions),
		CurrentVersion: currentVersion,
	}, nil
}

// GetVersionDiff calculates the difference between two versions
func (s *Service) GetVersionDiff(
	ctx context.Context,
	userID, noteID string,
	oldVersionNum, newVersionNum int,
) (*VersionDiff, error) {
	// Verify note belongs to user
	_, err := s.noteRepo.FindByID(ctx, userID, noteID)
	if err != nil {
		return nil, fmt.Errorf("note not found or access denied: %w", err)
	}

	// Get both versions
	oldVersion, err := s.versionRepo.GetVersionByNumber(ctx, noteID, oldVersionNum)
	if err != nil {
		return nil, fmt.Errorf("old version not found: %w", err)
	}

	newVersion, err := s.versionRepo.GetVersionByNumber(ctx, noteID, newVersionNum)
	if err != nil {
		return nil, fmt.Errorf("new version not found: %w", err)
	}

	// Check if title changed
	titleChanged := oldVersion.Title != newVersion.Title

	// Generate content diff
	contentDiff := GenerateContentDiff(oldVersion.ContentMd, newVersion.ContentMd)

	// Calculate tag differences
	tagsAdded, tagsRemoved := CalculateTagDiff(oldVersion.Tags, newVersion.Tags)

	return &VersionDiff{
		OldVersion:   oldVersion,
		NewVersion:   newVersion,
		TitleChanged: titleChanged,
		ContentDiff:  contentDiff,
		TagsAdded:    tagsAdded,
		TagsRemoved:  tagsRemoved,
	}, nil
}

// RestoreVersion restores a note to a previous version
func (s *Service) RestoreVersion(
	ctx context.Context,
	userID, noteID, versionID string,
) (*Note, error) {
	// Verify note belongs to user
	_, err := s.noteRepo.FindByID(ctx, userID, noteID)
	if err != nil {
		return nil, fmt.Errorf("note not found or access denied: %w", err)
	}

	// Get the version to restore
	version, err := s.versionRepo.GetVersion(ctx, versionID)
	if err != nil {
		return nil, fmt.Errorf("version not found: %w", err)
	}

	// Verify the version belongs to the same note
	if version.NoteID != noteID {
		return nil, fmt.Errorf("version does not belong to this note")
	}

	// Update the note to match the old version
	// This will automatically create a new version via the database trigger
	note, err := s.noteRepo.Update(
		ctx,
		userID,
		noteID,
		&version.Title,
		&version.ContentMd,
		version.SourceURL,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to restore version: %w", err)
	}

	// Update tags to match the old version
	if len(version.Tags) > 0 {
		tagObjects, err := s.tagRepo.FindByNames(ctx, userID, version.Tags)
		if err == nil && len(tagObjects) > 0 {
			tagIDs := make([]string, len(tagObjects))
			for i, tag := range tagObjects {
				tagIDs[i] = tag.ID
			}
			_ = s.tagRepo.SetNoteTags(ctx, noteID, tagIDs)
		}
	} else {
		// Clear all tags if version had no tags
		_ = s.tagRepo.SetNoteTags(ctx, noteID, []string{})
	}

	// Re-index in vector store
	go func() {
		indexCtx := context.Background()
		_ = s.indexNote(indexCtx, note)
	}()

	// Process note links
	go func() {
		linkCtx := context.Background()
		_ = s.processNoteLinks(linkCtx, userID, noteID, version.ContentMd)
	}()

	// Reload note with tags
	freshNote, err := s.noteRepo.FindByID(ctx, userID, noteID)
	if err != nil {
		return note, nil // Return the note we have
	}

	tags, err := s.noteRepo.GetNoteTags(ctx, noteID)
	if err == nil {
		freshNote.Tags = tags
	}

	return freshNote, nil
}

// Helper functions

// generateSlug creates a URL-friendly slug from a title
func generateSlug(title, noteID string) string {
	// Convert to lowercase
	slug := strings.ToLower(title)

	// Replace spaces with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")

	// Remove special characters (keep only alphanumeric, hyphens, and underscores)
	reg := regexp.MustCompile("[^a-z0-9-_]+")
	slug = reg.ReplaceAllString(slug, "")

	// Remove multiple consecutive hyphens
	reg = regexp.MustCompile("-+")
	slug = reg.ReplaceAllString(slug, "-")

	// Trim hyphens from start and end
	slug = strings.Trim(slug, "-")

	// Limit length to 100 characters
	if len(slug) > 100 {
		slug = slug[:100]
	}

	// If slug is empty after all this, use note ID
	if slug == "" {
		slug = noteID[:8]
	}

	return slug
}
