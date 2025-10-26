-- Add user_id to tags table
ALTER TABLE tags ADD COLUMN user_id VARCHAR(255);

-- Add foreign key constraint
ALTER TABLE tags ADD CONSTRAINT fk_tags_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Drop the old unique constraint on name
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;

-- Add unique constraint on (user_id, name) combination
-- This allows different users to have the same tag names
ALTER TABLE tags ADD CONSTRAINT tags_user_id_name_unique UNIQUE (user_id, name);
