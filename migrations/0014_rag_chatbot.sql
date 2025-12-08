-- Enable chatbot feature in properties
ALTER TABLE properties ADD COLUMN chatbot_enabled INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN chatbot_greeting_en TEXT DEFAULT 'Hi! How can I help you today?';
ALTER TABLE properties ADD COLUMN chatbot_name TEXT DEFAULT 'Hotel Assistant';
ALTER TABLE properties ADD COLUMN chatbot_avatar_url TEXT;

-- Knowledge base documents (uploaded by admin)
CREATE TABLE IF NOT EXISTS chatbot_documents (
  document_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_type TEXT DEFAULT 'faq', -- faq, policy, amenity, general
  file_url TEXT, -- if uploaded as file
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Text chunks for RAG (split documents into searchable chunks)
CREATE TABLE IF NOT EXISTS chatbot_chunks (
  chunk_id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- position in original document
  embedding_text TEXT, -- simplified text for matching
  token_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES chatbot_documents(document_id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Create index for faster chunk retrieval
CREATE INDEX IF NOT EXISTS idx_chunks_property ON chatbot_chunks(property_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON chatbot_chunks(document_id);

-- Chat conversations (for context and history)
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  conversation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  session_id TEXT NOT NULL, -- unique per guest session
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Individual chat messages
CREATE TABLE IF NOT EXISTS chatbot_messages (
  message_id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  chunks_used TEXT, -- JSON array of chunk_ids that were used for context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(conversation_id) ON DELETE CASCADE
);

-- Usage tracking and analytics
CREATE TABLE IF NOT EXISTS chatbot_usage_stats (
  stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  date DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(property_id, date)
);

-- Track which chunks are most useful
CREATE TABLE IF NOT EXISTS chatbot_chunk_usage (
  usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  times_retrieved INTEGER DEFAULT 1,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chunk_id) REFERENCES chatbot_chunks(chunk_id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(property_id)
);

-- Rate limiting for chatbot
CREATE TABLE IF NOT EXISTS chatbot_rate_limits (
  limit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  reset_date DATE NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(property_id),
  UNIQUE(property_id, session_id, reset_date)
);
