<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class AddCompletedNoticeStatus extends Migration
{
    public function up(): void
    {
        $this->db->query('ALTER TABLE notices DROP CONSTRAINT notices_status_check');
        $this->db->query("ALTER TABLE notices ADD CONSTRAINT notices_status_check CHECK (status IN ('draft','processing','extracted','confirmed','failed','inactive','completed'))");
    }

    public function down(): void
    {
        $this->db->query("UPDATE notices SET status = 'inactive' WHERE status = 'completed'");
        $this->db->query('ALTER TABLE notices DROP CONSTRAINT notices_status_check');
        $this->db->query("ALTER TABLE notices ADD CONSTRAINT notices_status_check CHECK (status IN ('draft','processing','extracted','confirmed','failed','inactive'))");
    }
}
