<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class AddInactiveNoticeStatus extends Migration
{
    public function up(): void
    {
        $this->db->query('ALTER TABLE notices DROP CONSTRAINT notices_status_check');
        $this->db->query("ALTER TABLE notices ADD CONSTRAINT notices_status_check CHECK (status IN ('draft','processing','extracted','confirmed','failed','inactive'))");

        $this->db->query(<<<'SQL'
UPDATE notices current_notice
SET status = 'inactive'
WHERE current_notice.status = 'confirmed'
  AND current_notice.deleted_at IS NULL
  AND EXISTS (
      SELECT 1
      FROM notices newer_notice
      WHERE newer_notice.user_id = current_notice.user_id
        AND newer_notice.status = 'confirmed'
        AND newer_notice.deleted_at IS NULL
        AND newer_notice.id > current_notice.id
  )
SQL);

        $this->db->query("CREATE UNIQUE INDEX uq_notices_confirmed_user ON notices(user_id) WHERE status = 'confirmed' AND deleted_at IS NULL");
    }

    public function down(): void
    {
        $this->db->query('DROP INDEX IF EXISTS uq_notices_confirmed_user');
        $this->db->query("UPDATE notices SET status = 'draft' WHERE status = 'inactive'");
        $this->db->query('ALTER TABLE notices DROP CONSTRAINT notices_status_check');
        $this->db->query("ALTER TABLE notices ADD CONSTRAINT notices_status_check CHECK (status IN ('draft','processing','extracted','confirmed','failed'))");
    }
}
