package qdrant

import (
	"context"
	"fmt"

	"github.com/qdrant/go-client/qdrant"
)

type Client struct {
	client         *qdrant.Client
	collectionName string
	vectorSize     uint64
}

// NewClient creates a new Qdrant client
func NewClient(host string, port int, collectionName string, vectorSize int) (*Client, error) {
	client, err := qdrant.NewClient(&qdrant.Config{
		Host: host,
		Port: port,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create qdrant client: %w", err)
	}

	c := &Client{
		client:         client,
		collectionName: collectionName,
		vectorSize:     uint64(vectorSize),
	}

	// Initialize collection if it doesn't exist
	if err := c.initCollection(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to initialize collection: %w", err)
	}

	return c, nil
}

// initCollection creates the collection if it doesn't exist
func (c *Client) initCollection(ctx context.Context) error {
	// Check if collection exists
	exists, err := c.client.CollectionExists(ctx, c.collectionName)
	if err != nil {
		return fmt.Errorf("failed to check collection existence: %w", err)
	}

	if exists {
		return nil
	}

	// Create collection
	err = c.client.CreateCollection(ctx, &qdrant.CreateCollection{
		CollectionName: c.collectionName,
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     c.vectorSize,
			Distance: qdrant.Distance_Cosine,
		}),
	})
	if err != nil {
		return fmt.Errorf("failed to create collection: %w", err)
	}

	return nil
}

// UpsertPoint inserts or updates a point in the collection
func (c *Client) UpsertPoint(ctx context.Context, id string, vector []float32, payload map[string]interface{}) error {
	point := &qdrant.PointStruct{
		Id:      qdrant.NewIDNum(hashID(id)),
		Vectors: qdrant.NewVectors(vector...),
		Payload: qdrant.NewValueMap(payload),
	}

	_, err := c.client.Upsert(ctx, &qdrant.UpsertPoints{
		CollectionName: c.collectionName,
		Points:         []*qdrant.PointStruct{point},
	})
	if err != nil {
		return fmt.Errorf("failed to upsert point: %w", err)
	}

	return nil
}

// DeletePoint deletes a point from the collection
func (c *Client) DeletePoint(ctx context.Context, id string) error {
	_, err := c.client.Delete(ctx, &qdrant.DeletePoints{
		CollectionName: c.collectionName,
		Points: &qdrant.PointsSelector{
			PointsSelectorOneOf: &qdrant.PointsSelector_Points{
				Points: &qdrant.PointsIdsList{
					Ids: []*qdrant.PointId{
						qdrant.NewIDNum(hashID(id)),
					},
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete point: %w", err)
	}

	return nil
}

// Search performs a semantic search
func (c *Client) Search(ctx context.Context, vector []float32, limit uint64) ([]*qdrant.ScoredPoint, error) {
	results, err := c.client.Query(ctx, &qdrant.QueryPoints{
		CollectionName: c.collectionName,
		Query:          qdrant.NewQuery(vector...),
		Limit:          &limit,
		WithPayload:    qdrant.NewWithPayload(true),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	return results, nil
}

// SearchWithFilter performs a semantic search with user filter
func (c *Client) SearchWithFilter(ctx context.Context, vector []float32, userID string, limit uint64) ([]*qdrant.ScoredPoint, error) {
	filter := &qdrant.Filter{
		Must: []*qdrant.Condition{
			{
				ConditionOneOf: &qdrant.Condition_Field{
					Field: &qdrant.FieldCondition{
						Key: "user_id",
						Match: &qdrant.Match{
							MatchValue: &qdrant.Match_Keyword{
								Keyword: userID,
							},
						},
					},
				},
			},
		},
	}

	results, err := c.client.Query(ctx, &qdrant.QueryPoints{
		CollectionName: c.collectionName,
		Query:          qdrant.NewQuery(vector...),
		Filter:         filter,
		Limit:          &limit,
		WithPayload:    qdrant.NewWithPayload(true),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search with filter: %w", err)
	}

	return results, nil
}

// GetAllUserPoints retrieves all points for a specific user with their vectors
func (c *Client) GetAllUserPoints(ctx context.Context, userID string, limit uint64) ([]*qdrant.RetrievedPoint, error) {
	filter := &qdrant.Filter{
		Must: []*qdrant.Condition{
			{
				ConditionOneOf: &qdrant.Condition_Field{
					Field: &qdrant.FieldCondition{
						Key: "user_id",
						Match: &qdrant.Match{
							MatchValue: &qdrant.Match_Keyword{
								Keyword: userID,
							},
						},
					},
				},
			},
		},
	}

	limitU32 := uint32(limit)
	scrollResult, err := c.client.Scroll(ctx, &qdrant.ScrollPoints{
		CollectionName: c.collectionName,
		Filter:         filter,
		Limit:          &limitU32,
		WithPayload:    qdrant.NewWithPayload(true),
		WithVectors:    qdrant.NewWithVectors(true),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to scroll points: %w", err)
	}

	return scrollResult, nil
}

// hashID converts a string ID to a numeric ID for Qdrant
// Simple hash function for demo purposes
func hashID(id string) uint64 {
	var hash uint64
	for _, c := range id {
		hash = hash*31 + uint64(c)
	}
	return hash
}

// Close closes the Qdrant client connection
func (c *Client) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}
