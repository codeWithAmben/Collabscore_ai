CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(128) NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  role ENUM('STUDENT', 'INSTRUCTOR') NOT NULL DEFAULT 'STUDENT',
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  classroom_course_id VARCHAR(128) NULL,
  owner_id INT NOT NULL,
  group_base_grade DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  assigned_section VARCHAR(255) NOT NULL DEFAULT 'General Contribution',
  is_leader TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_project_member (project_id, user_email),
  CONSTRAINT fk_members_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  google_file_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  web_view_link VARCHAR(512) NULL,
  last_synced_at DATETIME NULL,
  UNIQUE KEY uq_project_file (project_id, google_file_id),
  CONSTRAINT fk_files_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS revision_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_file_id INT NOT NULL,
  contributor_email VARCHAR(255) NOT NULL,
  contributor_name VARCHAR(255) NOT NULL,
  revision_count INT NOT NULL DEFAULT 0,
  bytes_added INT NOT NULL DEFAULT 0,
  active_days INT NOT NULL DEFAULT 0,
  last_edit_at DATETIME NULL,
  raw_timeline_json JSON NULL,
  UNIQUE KEY uq_file_contributor (project_file_id, contributor_email),
  CONSTRAINT fk_revisions_file FOREIGN KEY (project_file_id) REFERENCES project_files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS peer_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  reviewer_email VARCHAR(255) NOT NULL,
  reviewee_email VARCHAR(255) NOT NULL,
  owned_task VARCHAR(255) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NULL,
  UNIQUE KEY uq_peer_review (project_id, reviewer_email, reviewee_email),
  CONSTRAINT fk_reviews_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  model_used VARCHAR(128) NOT NULL,
  evaluation_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evals_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
