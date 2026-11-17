<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class NormalizeNoticeContent extends Migration
{
    public function up(): void
    {
        $this->db->query(<<<'SQL'
CREATE TABLE selectable_options (
    id BIGSERIAL PRIMARY KEY, notice_id BIGINT NOT NULL, external_ref VARCHAR(80) NOT NULL,
    code VARCHAR(80), name VARCHAR(240) NOT NULL, kind VARCHAR(30) NOT NULL,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
    CONSTRAINT fk_options_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
    CONSTRAINT uq_options_notice_ref UNIQUE (notice_id, external_ref)
);
CREATE INDEX idx_options_notice_selection ON selectable_options(notice_id, is_selected);
ALTER TABLE notices ADD COLUMN has_study_syllabus BOOLEAN NULL;
CREATE TABLE content_groups (
    id BIGSERIAL PRIMARY KEY, notice_id BIGINT NOT NULL, external_ref VARCHAR(80) NOT NULL,
    name VARCHAR(240) NOT NULL, knowledge_type VARCHAR(16) NOT NULL CHECK (knowledge_type IN ('general','specific','uncertain')),
    applies_to_all BOOLEAN NOT NULL DEFAULT FALSE, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
    CONSTRAINT fk_groups_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
    CONSTRAINT uq_groups_notice_ref UNIQUE (notice_id, external_ref)
);
CREATE TABLE option_content_groups (
    option_id BIGINT NOT NULL, content_group_id BIGINT NOT NULL, weight NUMERIC(8,3) NULL CHECK (weight >= 0),
    PRIMARY KEY (option_id, content_group_id),
    CONSTRAINT fk_applicability_option FOREIGN KEY (option_id) REFERENCES selectable_options(id) ON DELETE CASCADE,
    CONSTRAINT fk_applicability_group FOREIGN KEY (content_group_id) REFERENCES content_groups(id) ON DELETE CASCADE
);
ALTER TABLE subjects ADD COLUMN content_group_id BIGINT NULL;
INSERT INTO content_groups (notice_id, external_ref, name, knowledge_type, applies_to_all, sort_order)
SELECT notice_id, 'legacy-group-' || id, name, knowledge_type, knowledge_type='general', sort_order FROM study_areas;
INSERT INTO selectable_options (notice_id, external_ref, name, kind, is_selected, sort_order)
SELECT notice_id, 'legacy-option-' || id, name, 'area', is_selected, sort_order FROM study_areas WHERE knowledge_type='specific';
INSERT INTO option_content_groups (option_id, content_group_id)
SELECT o.id,g.id FROM selectable_options o JOIN content_groups g ON g.notice_id=o.notice_id
WHERE o.external_ref=replace(g.external_ref,'group','option');
UPDATE subjects s SET content_group_id=g.id FROM content_groups g
WHERE g.external_ref='legacy-group-' || s.study_area_id;
ALTER TABLE subjects ALTER COLUMN content_group_id SET NOT NULL;
ALTER TABLE subjects ALTER COLUMN study_area_id DROP NOT NULL;
ALTER TABLE subjects ADD CONSTRAINT fk_subjects_content_group FOREIGN KEY (content_group_id) REFERENCES content_groups(id) ON DELETE CASCADE;
CREATE INDEX idx_subjects_content_group ON subjects(content_group_id);
SQL);
    }

    public function down(): void
    {
        $this->forge->dropForeignKey('subjects', 'fk_subjects_content_group');
        $this->forge->dropColumn('subjects', 'content_group_id');
        $this->forge->dropTable('option_content_groups', true);
        $this->forge->dropTable('content_groups', true);
        $this->forge->dropTable('selectable_options', true);
        $this->forge->dropColumn('notices', 'has_study_syllabus');
    }
}
