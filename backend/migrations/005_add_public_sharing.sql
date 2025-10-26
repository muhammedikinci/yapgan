-- Add public sharing fields to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS public_slug VARCHAR(255) UNIQUE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP;

-- Create index on public_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_notes_public_slug ON notes(public_slug) WHERE public_slug IS NOT NULL;

-- Create index on is_public for listing public notes
CREATE INDEX IF NOT EXISTS idx_notes_is_public ON notes(is_public) WHERE is_public = TRUE;
