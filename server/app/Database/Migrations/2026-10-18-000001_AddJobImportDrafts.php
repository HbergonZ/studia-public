<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
final class AddJobImportDrafts extends Migration
{
    public function up()
    {
        $this->db->query("CREATE TABLE notice_import_drafts (notice_id BIGINT PRIMARY KEY REFERENCES notices(id) ON DELETE CASCADE, source_text TEXT NOT NULL, source_hash VARCHAR(64) NOT NULL, inventory JSONB, selected_ref VARCHAR(80), content JSONB, status VARCHAR(40) NOT NULL DEFAULT 'ready', revision INTEGER NOT NULL DEFAULT 1, last_error TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    }
    public function down() { $this->db->query('DROP TABLE notice_import_drafts'); }
}
