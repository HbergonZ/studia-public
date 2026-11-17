<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
final class AddImportProcessing extends Migration
{
    public function up()
    {
        $this->db->query('ALTER TABLE notice_import_drafts ADD COLUMN reading JSONB, ADD COLUMN document_confirmed BOOLEAN NOT NULL DEFAULT FALSE');
        $this->db->query("CREATE TABLE notice_import_jobs (id BIGSERIAL PRIMARY KEY, notice_id BIGINT NOT NULL REFERENCES notices(id) ON DELETE CASCADE, revision INTEGER NOT NULL, stage VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'queued', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, error TEXT)");
        $this->db->query("CREATE UNIQUE INDEX notice_import_active_job ON notice_import_jobs(notice_id) WHERE status IN ('queued','running')");
    }
    public function down()
    {
        $this->db->query('DROP TABLE notice_import_jobs');
        $this->db->query('ALTER TABLE notice_import_drafts DROP COLUMN reading, DROP COLUMN document_confirmed');
    }
}
