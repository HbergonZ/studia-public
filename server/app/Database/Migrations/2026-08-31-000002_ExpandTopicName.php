<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class ExpandTopicName extends Migration
{
    public function up(): void
    {
        $this->db->query('ALTER TABLE topics ALTER COLUMN name TYPE TEXT');
    }

    public function down(): void
    {
        $this->db->query('ALTER TABLE topics ALTER COLUMN name TYPE VARCHAR(300)');
    }
}
