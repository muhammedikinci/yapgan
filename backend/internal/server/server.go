package server

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/muhammedikinci/yapgan/internal/auth"
	"github.com/muhammedikinci/yapgan/internal/chat"
	"github.com/muhammedikinci/yapgan/internal/notes"
)

type Server struct {
	echo           *echo.Echo
	allowedOrigins []string
}

func New(allowedOrigins []string) *Server {
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedOrigins,
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			echo.HeaderAuthorization,
		},
	}))

	return &Server{
		echo:           e,
		allowedOrigins: allowedOrigins,
	}
}

func (s *Server) Start(port string) error {
	return s.echo.Start(":" + port)
}

func (s *Server) RegisterRoutes(
	authHandler *auth.Handler,
	authService *auth.Service,
	notesHandler *notes.Handler,
	chatHandler *chat.Handler,
) {
	// Health check
	s.echo.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{
			"status": "ok",
		})
	})

	// Auth routes (public)
	s.echo.POST("/api/auth/register", authHandler.Register)
	s.echo.POST("/api/auth/login", authHandler.Login)

	// Protected routes
	api := s.echo.Group("/api")
	api.Use(auth.JWTMiddleware(authService))

	// User info
	api.GET("/me", func(c echo.Context) error {
		userID := c.Get("user_id").(string)
		return c.JSON(200, map[string]string{
			"user_id": userID,
			"message": "This is a protected route",
		})
	})

	// Notes routes with action-specific
	api.POST(
		"/notes",
		notesHandler.CreateNote,
	)
	api.GET("/notes", notesHandler.ListNotes)
	api.GET("/notes/:id", notesHandler.GetNote)
	api.PUT(
		"/notes/:id",
		notesHandler.UpdateNote,
	)
	api.DELETE("/notes/:id", notesHandler.DeleteNote)
	api.GET("/notes/:id/backlinks", notesHandler.GetBacklinks)
	api.POST("/notes/:id/share", notesHandler.ShareNote) // Toggle public sharing

	// Version history routes
	api.GET("/notes/:id/versions", notesHandler.ListVersions)
	api.GET("/notes/:id/versions/:v1/diff/:v2", notesHandler.GetVersionDiff)
	api.POST("/notes/:id/restore", notesHandler.RestoreVersion)

	// Tags routes
	api.GET("/tags", notesHandler.ListTags)
	api.DELETE("/tags/:id", notesHandler.DeleteTag)

	// Stats routes
	api.GET("/stats", notesHandler.GetStats)

	// Search routes
	api.POST("/search", notesHandler.Search)

	// Vector space routes
	api.GET("/vector-space", notesHandler.GetVectorSpace)

	// Graph routes
	api.GET("/graph", notesHandler.GetGraph)

	// Chat routes (AI Chat with single-note conversations)
	api.POST("/chat/conversations", chatHandler.CreateConversation)
	api.GET("/chat/conversations", chatHandler.ListConversations)
	api.GET("/chat/conversations/:id", chatHandler.GetConversation)
	api.DELETE("/chat/conversations/:id", chatHandler.DeleteConversation)
	api.POST(
		"/chat/conversations/:id/messages",
		chatHandler.SendMessage,
	)
	api.POST(
		"/chat/conversations/:id/stream",
		chatHandler.SendMessageStream,
	)

	// Public routes (no authentication required)
	s.echo.GET("/public/:slug", notesHandler.GetPublicNote)
}
