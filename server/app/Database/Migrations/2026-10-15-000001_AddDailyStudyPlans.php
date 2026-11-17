<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;

class AddDailyStudyPlans extends Migration
{
    public function up(): void
    {
        $this->db->query("ALTER TABLE study_profiles ADD COLUMN block_minutes SMALLINT NOT NULL DEFAULT 25 CHECK (block_minutes BETWEEN 5 AND 180), ADD COLUMN break_minutes SMALLINT NOT NULL DEFAULT 5 CHECK (break_minutes BETWEEN 0 AND 30)");
        $this->db->query("ALTER TABLE topics ADD COLUMN needs_continuation BOOLEAN NOT NULL DEFAULT FALSE");
        $this->db->query("ALTER TABLE study_sessions ADD COLUMN completes_topic BOOLEAN NOT NULL DEFAULT TRUE, ADD COLUMN request_key VARCHAR(64), ADD CONSTRAINT uq_session_request UNIQUE (user_id, request_key)");
        $this->db->query("CREATE TABLE daily_study_plans (
            id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notice_id BIGINT NOT NULL REFERENCES notices(id) ON DELETE CASCADE, study_date DATE NOT NULL,
            block_minutes SMALLINT NOT NULL DEFAULT 25 CHECK (block_minutes BETWEEN 5 AND 180),
            break_minutes SMALLINT NOT NULL DEFAULT 5 CHECK (break_minutes BETWEEN 0 AND 30),
            blocks JSONB NOT NULL DEFAULT '[]', version INTEGER NOT NULL DEFAULT 1,
            UNIQUE(user_id, notice_id, study_date)
        )");
    }
    public function down(): void
    {
        $this->forge->dropTable('daily_study_plans', true);
        $this->db->query('ALTER TABLE study_sessions DROP CONSTRAINT uq_session_request, DROP COLUMN request_key, DROP COLUMN completes_topic');
        $this->db->query('ALTER TABLE topics DROP COLUMN needs_continuation');
        $this->db->query('ALTER TABLE study_profiles DROP COLUMN block_minutes, DROP COLUMN break_minutes');
    }
}
