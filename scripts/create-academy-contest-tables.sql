CREATE TABLE IF NOT EXISTS academy_contests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  academy_id INT NOT NULL,
  created_by INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  start_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL,
  end_at DATETIME NOT NULL,
  notified_at DATETIME NULL,
  live_notified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_academy_contests_academy_id (academy_id),
  INDEX idx_academy_contests_start_at (start_at)
);

CREATE TABLE IF NOT EXISTS academy_contest_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT NOT NULL,
  type ENUM('objective', 'theoretical', 'coding') NOT NULL,
  title VARCHAR(255) NOT NULL,
  prompt TEXT NULL,
  points INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  options JSON NULL,
  coding_problem_slug VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_academy_contest_questions_contest_id (contest_id),
  CONSTRAINT fk_academy_contest_questions_contest
    FOREIGN KEY (contest_id) REFERENCES academy_contests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academy_contest_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT NOT NULL,
  student_id INT NOT NULL,
  started_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  status ENUM('in_progress', 'submitted', 'auto_submitted') NOT NULL DEFAULT 'in_progress',
  score INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_contest_student (contest_id, student_id),
  INDEX idx_academy_contest_attempts_contest_id (contest_id),
  CONSTRAINT fk_academy_contest_attempts_contest
    FOREIGN KEY (contest_id) REFERENCES academy_contests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academy_contest_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option_id VARCHAR(64) NULL,
  answer_text TEXT NULL,
  source_code LONGTEXT NULL,
  language VARCHAR(32) NULL,
  verdict JSON NULL,
  score INT NOT NULL DEFAULT 0,
  is_correct TINYINT(1) NULL,
  answered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_attempt_question (attempt_id, question_id),
  INDEX idx_academy_contest_answers_attempt_id (attempt_id),
  CONSTRAINT fk_academy_contest_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES academy_contest_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_academy_contest_answers_question
    FOREIGN KEY (question_id) REFERENCES academy_contest_questions(id) ON DELETE CASCADE
);
