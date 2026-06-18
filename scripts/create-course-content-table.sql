CREATE TABLE IF NOT EXISTS course_contents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  academy_id INT NOT NULL,
  created_by INT NOT NULL,
  type ENUM('lesson', 'video', 'attachment') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NULL,
  video_url TEXT NULL,
  file_name VARCHAR(255) NULL,
  file_path VARCHAR(500) NULL,
  file_url TEXT NULL,
  mime_type VARCHAR(128) NULL,
  file_size INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course_contents_course_id (course_id),
  INDEX idx_course_contents_academy_id (academy_id),
  CONSTRAINT fk_course_contents_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
