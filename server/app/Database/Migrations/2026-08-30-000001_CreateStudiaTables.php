<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateStudiaTables extends Migration
{
    public function up(): void
    {
        $this->db->query(<<<'SQL'
CREATE TABLE study_profiles (
    user_id INTEGER PRIMARY KEY,
    weekly_question_goal INTEGER NOT NULL DEFAULT 150 CHECK (weekly_question_goal >= 0),
    weekly_minutes_goal INTEGER NOT NULL DEFAULT 900 CHECK (weekly_minutes_goal >= 0),
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/Manaus',
    created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE availabilities (
    id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL, weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    minutes INTEGER NOT NULL DEFAULT 0 CHECK (minutes BETWEEN 0 AND 1440), created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
    CONSTRAINT uq_availability_user_day UNIQUE(user_id, weekday),
    CONSTRAINT fk_availability_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE notices (
    id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL, title VARCHAR(180) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processing','extracted','confirmed','failed')),
    source VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','pdf','text')),
    original_filename VARCHAR(255), stored_path VARCHAR(500), extraction_error TEXT, confirmed_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_notices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_notices_user ON notices(user_id);
CREATE TABLE subjects (
    id BIGSERIAL PRIMARY KEY, notice_id BIGINT NOT NULL, name VARCHAR(180) NOT NULL,
    weight SMALLINT NOT NULL DEFAULT 1 CHECK (weight BETWEEN 0 AND 100), color SMALLINT NOT NULL DEFAULT 1 CHECK (color BETWEEN 1 AND 6),
    sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
    CONSTRAINT fk_subjects_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE
);
CREATE INDEX idx_subjects_notice ON subjects(notice_id);
CREATE TABLE topics (
    id BIGSERIAL PRIMARY KEY, subject_id BIGINT NOT NULL, name VARCHAR(300) NOT NULL,
    difficulty SMALLINT NOT NULL DEFAULT 10 CHECK (difficulty BETWEEN 0 AND 10), curve_position SMALLINT NOT NULL DEFAULT 0 CHECK (curve_position BETWEEN 0 AND 5),
    first_reviewed_at TIMESTAMP NULL, last_reviewed_at TIMESTAMP NULL, next_review_at TIMESTAMP NULL,
    sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
    CONSTRAINT fk_topics_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_topics_next_review ON topics(next_review_at);
CREATE TABLE study_sessions (
    id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL, topic_id BIGINT NOT NULL, studied_on DATE NOT NULL,
    minutes INTEGER NOT NULL CHECK (minutes BETWEEN 0 AND 1440), correct_answers INTEGER NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
    wrong_answers INTEGER NOT NULL DEFAULT 0 CHECK (wrong_answers >= 0), difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 0 AND 10), created_at TIMESTAMP NULL,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user_date ON study_sessions(user_id, studied_on);
CREATE TABLE extraction_runs (
    id BIGSERIAL PRIMARY KEY, notice_id BIGINT NOT NULL, status VARCHAR(20) NOT NULL,
    model VARCHAR(80), prompt_version VARCHAR(20), request_id VARCHAR(120), input_tokens INTEGER, output_tokens INTEGER,
    error TEXT, raw_response JSONB, created_at TIMESTAMP NULL, finished_at TIMESTAMP NULL,
    CONSTRAINT fk_extractions_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE
);
CREATE INDEX idx_extractions_notice ON extraction_runs(notice_id);
SQL);
    }

    public function down(): void
    {
        foreach (['extraction_runs', 'study_sessions', 'topics', 'subjects', 'notices', 'availabilities', 'study_profiles'] as $table) {
            $this->forge->dropTable($table, true);
        }
    }
}
