<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
final class AlignSubjectNameLimit extends Migration
{
    public function up() { $this->db->query('ALTER TABLE subjects ALTER COLUMN name TYPE VARCHAR(240)'); }
    public function down() { /* Keep the wider field to avoid truncating existing titles. */ }
}
