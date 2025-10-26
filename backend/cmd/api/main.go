package main

import (
	"context"
	"log"
	"os"

	"github.com/muhammedikinci/yapgan/config"
	"github.com/muhammedikinci/yapgan/internal/auth"
	"github.com/muhammedikinci/yapgan/internal/chat"
	"github.com/muhammedikinci/yapgan/internal/notes"
	"github.com/muhammedikinci/yapgan/internal/server"
	"github.com/muhammedikinci/yapgan/pkg/database"
	"github.com/muhammedikinci/yapgan/pkg/embedding"
	"github.com/muhammedikinci/yapgan/pkg/qdrant"
)

// chatNoteRepository adapts notes.NoteRepository to chat.NoteRepository
type chatNoteRepository struct {
	noteRepo notes.NoteRepository
}

func (r *chatNoteRepository) FindByID(
	ctx context.Context,
	userID, noteID string,
) (*chat.Note, error) {
	note, err := r.noteRepo.FindByID(ctx, userID, noteID)
	if err != nil {
		return nil, err
	}

	return &chat.Note{
		ID:        note.ID,
		UserID:    note.UserID,
		Title:     note.Title,
		ContentMd: note.ContentMd,
	}, nil
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	// Get environment (default: dev)
	env := os.Getenv("ENV")
	if env == "" {
		env = "dev"
	}

	// Load configuration
	cfg, err := config.Load(env)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("Loaded configuration for environment: %s", env)

	// Connect to database
	db, err := database.NewPostgresPool(cfg.GetDatabaseDSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Successfully connected to database")

	// Initialize Qdrant client
	qdrantClient, err := qdrant.NewClient(
		cfg.Qdrant.Host,
		cfg.Qdrant.Port,
		cfg.Qdrant.CollectionName,
		cfg.Qdrant.VectorSize,
	)
	if err != nil {
		log.Fatalf("Failed to connect to Qdrant: %v", err)
	}
	defer qdrantClient.Close()

	log.Printf("Successfully connected to Qdrant at %s:%d", cfg.Qdrant.Host, cfg.Qdrant.Port)

	// Initialize embedding service
	var embeddingService notes.EmbeddingService

	// Choose embedding provider based on config
	switch cfg.Embedding.Provider {
	case "fastembed":
		// Use FastEmbed service (Python microservice)
		fastEmbedService := embedding.NewFastEmbedService(cfg.Embedding.Endpoint)
		embeddingService = fastEmbedService
		log.Printf(
			"Initialized FastEmbed service at %s (vector size: %d)",
			cfg.Embedding.Endpoint,
			cfg.Qdrant.VectorSize,
		)

	case "openai":
		// Use OpenAI embedding service
		if !cfg.OpenAI.Enabled || cfg.OpenAI.APIKey == "" {
			log.Fatal("OpenAI provider selected but API key is missing or disabled")
		}
		openaiService, err := embedding.NewOpenAIService(
			cfg.OpenAI.APIKey,
			cfg.OpenAI.Model,
			cfg.Qdrant.VectorSize,
		)
		if err != nil {
			log.Fatalf("Failed to initialize OpenAI embedding service: %v", err)
		}
		embeddingService = openaiService
		log.Printf(
			"Initialized OpenAI embedding service (model: %s, vector size: %d)",
			cfg.OpenAI.Model,
			cfg.Qdrant.VectorSize,
		)

	default:
		// Use local hash-based embedding service (fallback)
		embeddingService = embedding.NewService(cfg.Qdrant.VectorSize)
		log.Printf(
			"Initialized local hash-based embedding service (fallback) with vector size %d",
			cfg.Qdrant.VectorSize,
		)
	}

	// Initialize auth components
	userRepo := auth.NewPostgresUserRepository(db)
	authService := auth.NewService(
		userRepo,
		cfg.JWT.Secret,
		cfg.JWT.RefreshSecret,
		cfg.JWT.AccessTokenExpiry,
		cfg.JWT.RefreshTokenExpiry,
	)
	authHandler := auth.NewHandler(authService)

	// Initialize notes components
	noteRepo := notes.NewPostgresNoteRepository(db)
	tagRepo := notes.NewPostgresTagRepository(db)
	linkRepo := notes.NewPostgresLinkRepository(db)
	versionRepo := notes.NewPostgresVersionRepository(db)
	notesService := notes.NewService(
		noteRepo,
		tagRepo,
		linkRepo,
		versionRepo,
		qdrantClient,
		embeddingService,
		cfg.Pagination.DefaultPageSize,
		cfg.Pagination.MaxPageSize,
	)

	notesHandler := notes.NewHandler(notesService)

	// Initialize chat components
	chatRepo := chat.NewPostgresChatRepository(db)
	openaiClient := chat.NewOpenAIClient(cfg.OpenAI.APIKey)

	// Create note repository adapter for chat (simple wrapper)
	noteRepoForChat := &chatNoteRepository{noteRepo: noteRepo}

	chatService := chat.NewService(
		chatRepo,
		noteRepoForChat,
		openaiClient,
	)
	chatHandler := chat.NewHandler(chatService)

	// Initialize server
	srv := server.New(cfg.CORS.AllowedOrigins)
	srv.RegisterRoutes(
		authHandler,
		authService,
		notesHandler,
		chatHandler,
	)

	log.Printf("Yapgan API starting on port %s", cfg.Server.Port)
	log.Printf("CORS allowed origins: %v", cfg.CORS.AllowedOrigins)

	return srv.Start(cfg.Server.Port)
}
