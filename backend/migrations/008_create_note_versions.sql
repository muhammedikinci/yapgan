-- Migration: 009 - Create Note Versions (Time Travel Feature)
-- Creates version history tracking for notes with automatic versioning

-- ============================================================
-- 1. Create note_versions table
-- ============================================================

CREATE TABLE note_versions (
    id VARCHAR(255) PRIMARY KEY,
    note_id VARCHAR(255) NOT NULL,
    version_number INTEGER NOT NULL,
    
    -- Snapshot of note at this version
    title VARCHAR(500) NOT NULL,
    content_md TEXT NOT NULL,
    source_url TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Change metadata
    change_summary VARCHAR(255),
    chars_added INTEGER DEFAULT 0,
    chars_removed INTEGER DEFAULT 0,
    
    -- Audit
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================

CREATE INDEX idx_note_versions_note_id ON note_versions(note_id);
CREATE INDEX idx_note_versions_created_at ON note_versions(note_id, created_at DESC);
CREATE UNIQUE INDEX idx_note_versions_unique ON note_versions(note_id, version_number);

-- ============================================================
-- 3. Create initial versions for existing notes
-- ============================================================

-- Create initial versions for all existing notes
-- Note: Tags will be fetched separately and stored in versions
INSERT INTO note_versions (id, note_id, version_number, title, content_md, source_url, tags, created_by, created_at)
SELECT 
    gen_random_uuid()::text,
    n.id,
    1, -- Initial version
    n.title,
    n.content_md,
    n.source_url,
    COALESCE(
        ARRAY(
            SELECT t.name 
            FROM note_tags nt 
            JOIN tags t ON nt.tag_id = t.id 
            WHERE nt.note_id = n.id
            ORDER BY t.name
        ),
        '{}'::text[]
    ) as tags,
    n.user_id,
    n.created_at
FROM notes n;

-- ============================================================
-- 4. Create function to auto-create versions on note updates
-- ============================================================

CREATE OR REPLACE FUNCTION create_note_version()
RETURNS TRIGGER AS $$
DECLARE
    latest_version INTEGER;
    old_length INTEGER;
    new_length INTEGER;
    chars_added_val INTEGER;
    chars_removed_val INTEGER;
    summary TEXT;
    note_tags TEXT[];
BEGIN
    -- Get latest version number
    SELECT COALESCE(MAX(version_number), 0) INTO latest_version
    FROM note_versions
    WHERE note_id = NEW.id;
    
    -- Calculate character changes
    old_length := LENGTH(OLD.content_md);
    new_length := LENGTH(NEW.content_md);
    
    IF new_length > old_length THEN
        chars_added_val := new_length - old_length;
        chars_removed_val := 0;
    ELSE
        chars_added_val := 0;
        chars_removed_val := old_length - new_length;
    END IF;
    
    -- Build change summary
    summary := '';
    IF OLD.title IS DISTINCT FROM NEW.title THEN
        summary := 'Title changed';
    END IF;
    
    IF chars_added_val > 0 THEN
        IF summary != '' THEN
            summary := summary || ', ';
        END IF;
        summary := summary || '+' || chars_added_val || ' chars';
    END IF;
    
    IF chars_removed_val > 0 THEN
        IF summary != '' THEN
            summary := summary || ', ';
        END IF;
        summary := summary || '-' || chars_removed_val || ' chars';
    END IF;
    
    IF summary = '' THEN
        summary := 'Minor update';
    END IF;
    
    -- Get current tags for this note
    SELECT COALESCE(
        ARRAY(
            SELECT t.name 
            FROM note_tags nt 
            JOIN tags t ON nt.tag_id = t.id 
            WHERE nt.note_id = NEW.id
            ORDER BY t.name
        ),
        '{}'::text[]
    ) INTO note_tags;
    
    -- Create new version
    INSERT INTO note_versions (
        id, note_id, version_number, title, content_md, source_url, tags, 
        change_summary, chars_added, chars_removed, created_by, created_at
    ) VALUES (
        gen_random_uuid()::text,
        NEW.id,
        latest_version + 1,
        NEW.title,
        NEW.content_md,
        NEW.source_url,
        note_tags,
        summary,
        chars_added_val,
        chars_removed_val,
        NEW.user_id,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Create trigger to auto-version on note updates
-- ============================================================

CREATE TRIGGER note_update_version
BEFORE UPDATE ON notes
FOR EACH ROW
WHEN (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.content_md IS DISTINCT FROM NEW.content_md OR
    OLD.source_url IS DISTINCT FROM NEW.source_url
)
EXECUTE FUNCTION create_note_version();

-- ============================================================
-- 6. Create trigger for initial version on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION create_note_version_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    note_tags TEXT[];
BEGIN
    -- Get current tags for this note (usually empty on insert, but check anyway)
    SELECT COALESCE(
        ARRAY(
            SELECT t.name 
            FROM note_tags nt 
            JOIN tags t ON nt.tag_id = t.id 
            WHERE nt.note_id = NEW.id
            ORDER BY t.name
        ),
        '{}'::text[]
    ) INTO note_tags;
    
    -- Create version 1 on insert
    INSERT INTO note_versions (
        id, note_id, version_number, title, content_md, source_url, tags, 
        change_summary, chars_added, chars_removed, created_by, created_at
    ) VALUES (
        gen_random_uuid()::text,
        NEW.id,
        1,
        NEW.title,
        NEW.content_md,
        NEW.source_url,
        note_tags,
        'Initial version',
        LENGTH(NEW.content_md),
        0,
        NEW.user_id,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER note_insert_version
AFTER INSERT ON notes
FOR EACH ROW
EXECUTE FUNCTION create_note_version_on_insert();

-- ============================================================
-- Migration Complete
-- ============================================================
