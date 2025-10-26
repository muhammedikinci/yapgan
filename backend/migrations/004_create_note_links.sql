-- Create note_links table for bi-directional linking
CREATE TABLE IF NOT EXISTS note_links (
    id VARCHAR(255) PRIMARY KEY,
    source_note_id VARCHAR(255) NOT NULL,
    target_note_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE,
    UNIQUE(source_note_id, target_note_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_note_id);
