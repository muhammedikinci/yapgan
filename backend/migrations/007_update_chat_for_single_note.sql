-- Add note_id to conversations table (each conversation is tied to one note)
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS note_id VARCHAR(255) REFERENCES notes(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_note_id ON chat_conversations(note_id);

COMMENT ON TABLE chat_conversations IS 'AI chat conversations - each tied to a specific note';
COMMENT ON COLUMN chat_conversations.note_id IS 'The note this conversation is about';
