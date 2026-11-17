<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
final class AddImportRequestKey extends Migration
{
    public function up() { $this->db->query('ALTER TABLE notices ADD COLUMN import_request_key VARCHAR(64) NULL'); $this->db->query('CREATE UNIQUE INDEX uq_notice_import_request ON notices(user_id, import_request_key) WHERE import_request_key IS NOT NULL'); }
    public function down() { $this->db->query('DROP INDEX uq_notice_import_request'); $this->db->query('ALTER TABLE notices DROP COLUMN import_request_key'); }
}
