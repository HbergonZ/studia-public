<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class AddSubjectKnowledgeClassification extends Migration
{
    public function up(): void
    {
        $this->db->query(<<<'SQL'
CREATE TABLE study_areas (
    id BIGSERIAL PRIMARY KEY,
    notice_id BIGINT NOT NULL,
    name VARCHAR(180) NOT NULL,
    knowledge_type VARCHAR(16) NOT NULL CHECK (knowledge_type IN ('general', 'specific')),
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_study_areas_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
    CONSTRAINT uq_study_areas_notice_name UNIQUE (notice_id, name)
);
CREATE INDEX idx_study_areas_notice_selection ON study_areas(notice_id, is_selected);
ALTER TABLE subjects ADD COLUMN study_area_id BIGINT NULL;
INSERT INTO study_areas (notice_id, name, knowledge_type, is_selected, sort_order)
SELECT id, 'Conhecimentos gerais', 'general', TRUE, 0 FROM notices;
UPDATE subjects s SET study_area_id = a.id
FROM study_areas a WHERE a.notice_id = s.notice_id AND a.knowledge_type = 'general';
ALTER TABLE subjects ALTER COLUMN study_area_id SET NOT NULL;
ALTER TABLE subjects ADD CONSTRAINT fk_subjects_study_area
    FOREIGN KEY (study_area_id) REFERENCES study_areas(id) ON DELETE CASCADE;
CREATE INDEX idx_subjects_study_area ON subjects(study_area_id);
SQL);
    }

    public function down(): void
    {
        $this->forge->dropForeignKey('subjects', 'fk_subjects_study_area');
        $this->forge->dropColumn('subjects', 'study_area_id');
        $this->forge->dropTable('study_areas', true);
    }
}
