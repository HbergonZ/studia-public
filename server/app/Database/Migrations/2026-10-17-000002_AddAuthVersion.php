<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
final class AddAuthVersion extends Migration
{
    public function up() { $this->db->query('ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0'); }
    public function down() { $this->db->query('ALTER TABLE users DROP COLUMN auth_version'); }
}
