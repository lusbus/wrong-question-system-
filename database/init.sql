CREATE TABLE IF NOT EXISTS wrong_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL CHECK(subject IN ('行测', '申论')),
  question_type TEXT NOT NULL,
  question_content TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_analysis TEXT,
  correct_solution TEXT,
  knowledge_points TEXT DEFAULT '[]',
  similar_questions TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'mastered')),
  source TEXT,
  structure_analysis TEXT DEFAULT NULL,
  error_cause_type TEXT DEFAULT NULL,
  error_cause_detail TEXT DEFAULT NULL,
  option_analysis TEXT DEFAULT NULL,
  avoid_pitfall_mantra TEXT DEFAULT NULL,
  similar_question_ids TEXT DEFAULT NULL,
  self_check_action TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  parent_id INTEGER,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES knowledge_points(id)
);

CREATE TABLE IF NOT EXISTS study_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  note_content TEXT,
  review_count INTEGER DEFAULT 0,
  last_reviewed DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES wrong_questions(id)
);

CREATE TABLE IF NOT EXISTS ai_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL DEFAULT 'openai',
  api_key TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4',
  base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  is_active BOOLEAN DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON wrong_questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_type ON wrong_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_status ON wrong_questions(status);
