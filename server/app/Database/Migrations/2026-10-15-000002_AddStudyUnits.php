<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;

class AddStudyUnits extends Migration
{
    public function up(): void
    {
        $this->db->query('ALTER TABLE topics ADD COLUMN source_text TEXT, ADD COLUMN parent_topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL, ADD COLUMN is_source BOOLEAN NOT NULL DEFAULT FALSE');
        $this->db->query('CREATE INDEX topics_parent_topic_idx ON topics(parent_topic_id)');
    }
    public function down(): void
    {
        $this->db->query('ALTER TABLE topics DROP COLUMN parent_topic_id, DROP COLUMN source_text, DROP COLUMN is_source');
    }
}
