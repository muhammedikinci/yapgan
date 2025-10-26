package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	Qdrant     QdrantConfig
	Embedding  EmbeddingConfig
	OpenAI     OpenAIConfig
	JWT        JWTConfig
	CORS       CORSConfig
	Pagination PaginationConfig
}

type ServerConfig struct {
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type QdrantConfig struct {
	Host           string
	Port           int
	CollectionName string
	VectorSize     int
}

type EmbeddingConfig struct {
	Provider string // "fastembed", "openai", or "local"
	Endpoint string // FastEmbed service endpoint
	Model    string // Model name (e.g., "intfloat/multilingual-e5-large")
}

type OpenAIConfig struct {
	APIKey  string
	Model   string
	Enabled bool
}

type JWTConfig struct {
	Secret             string
	RefreshSecret      string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
}

type CORSConfig struct {
	AllowedOrigins []string
}

type PaginationConfig struct {
	DefaultPageSize int
	MaxPageSize     int
}

// Load reads configuration from TOML file
func Load(env string) (*Config, error) {
	v := viper.New()

	// Set config file location
	v.SetConfigName(env)
	v.SetConfigType("toml")
	v.AddConfigPath(".conf")
	v.AddConfigPath(".")

	// Read config file
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Parse into struct
	var cfg Config

	// Server config
	cfg.Server.Port = v.GetString("server.port")

	// Database config
	cfg.Database.Host = v.GetString("database.host")
	cfg.Database.Port = v.GetString("database.port")
	cfg.Database.User = v.GetString("database.user")
	cfg.Database.Password = v.GetString("database.password")
	cfg.Database.Name = v.GetString("database.name")
	cfg.Database.SSLMode = v.GetString("database.sslmode")

	// Qdrant config
	cfg.Qdrant.Host = v.GetString("qdrant.host")
	cfg.Qdrant.Port = v.GetInt("qdrant.port")
	cfg.Qdrant.CollectionName = v.GetString("qdrant.collection_name")
	cfg.Qdrant.VectorSize = v.GetInt("qdrant.vector_size")

	// Embedding config
	cfg.Embedding.Provider = v.GetString("embedding.provider")
	cfg.Embedding.Endpoint = v.GetString("embedding.endpoint")
	cfg.Embedding.Model = v.GetString("embedding.model")

	// OpenAI config
	cfg.OpenAI.APIKey = v.GetString("openai.api_key")
	cfg.OpenAI.Model = v.GetString("openai.model")
	cfg.OpenAI.Enabled = v.GetBool("openai.enabled")

	// Allow API key from environment variable
	if cfg.OpenAI.APIKey == "" {
		v.SetEnvPrefix("OPENAI")
		v.BindEnv("api_key")
		cfg.OpenAI.APIKey = v.GetString("api_key")
	}

	// JWT config
	cfg.JWT.Secret = v.GetString("jwt.secret")
	cfg.JWT.RefreshSecret = v.GetString("jwt.refresh_secret")

	// Parse durations
	accessExpiry, err := time.ParseDuration(v.GetString("jwt.access_token_expiry"))
	if err != nil {
		return nil, fmt.Errorf("invalid access token expiry: %w", err)
	}
	cfg.JWT.AccessTokenExpiry = accessExpiry

	refreshExpiry, err := time.ParseDuration(v.GetString("jwt.refresh_token_expiry"))
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token expiry: %w", err)
	}
	cfg.JWT.RefreshTokenExpiry = refreshExpiry

	// CORS config
	cfg.CORS.AllowedOrigins = v.GetStringSlice("cors.allowed_origins")

	// Pagination config
	cfg.Pagination.DefaultPageSize = v.GetInt("pagination.default_page_size")
	cfg.Pagination.MaxPageSize = v.GetInt("pagination.max_page_size")

	// Validate required fields
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return &cfg, nil
}

// Validate checks if all required config values are set
func (c *Config) Validate() error {
	if c.Server.Port == "" {
		return fmt.Errorf("server.port is required")
	}

	if c.Database.Host == "" {
		return fmt.Errorf("database.host is required")
	}

	if c.Database.Name == "" {
		return fmt.Errorf("database.name is required")
	}

	if c.JWT.Secret == "" {
		return fmt.Errorf("jwt.secret is required")
	}

	if len(c.JWT.Secret) < 32 {
		return fmt.Errorf("jwt.secret must be at least 32 characters")
	}

	if c.JWT.RefreshSecret == "" {
		return fmt.Errorf("jwt.refresh_secret is required")
	}

	if len(c.JWT.RefreshSecret) < 32 {
		return fmt.Errorf("jwt.refresh_secret must be at least 32 characters")
	}

	if c.JWT.AccessTokenExpiry == 0 {
		return fmt.Errorf("jwt.access_token_expiry is required")
	}

	if c.JWT.RefreshTokenExpiry == 0 {
		return fmt.Errorf("jwt.refresh_token_expiry is required")
	}

	if c.Pagination.DefaultPageSize <= 0 {
		return fmt.Errorf("pagination.default_page_size must be greater than 0")
	}

	if c.Pagination.MaxPageSize <= 0 {
		return fmt.Errorf("pagination.max_page_size must be greater than 0")
	}

	return nil
}

// GetDatabaseDSN returns the database connection string
func (c *Config) GetDatabaseDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}
