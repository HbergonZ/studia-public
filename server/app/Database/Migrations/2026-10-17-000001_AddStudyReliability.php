<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
final class AddStudyReliability extends Migration
{
    public function up()
    {
        $this->db->query('ALTER TABLE subjects ADD COLUMN weight_override SMALLINT NULL CHECK (weight_override BETWEEN 0 AND 100)');
        $this->db->query('ALTER TABLE study_sessions ADD COLUMN corrected_at TIMESTAMP NULL');
        $this->db->query('CREATE TABLE study_session_corrections (id BIGSERIAL PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, previous_values JSONB NOT NULL, corrected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    }
    public function down()
    {
        $this->db->query('DROP TABLE study_session_corrections');
        $this->db->query('ALTER TABLE study_sessions DROP COLUMN corrected_at');
        $this->db->query('ALTER TABLE subjects DROP COLUMN weight_override');
    }
}
