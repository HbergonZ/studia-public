<?php
namespace App\Services;
use App\Models\{ContentGroupModel, SelectableOptionModel, StudyAreaModel, SubjectModel, TopicModel};
use RuntimeException;
final class NoticeStructureWriter
{
    /** Caller owns the transaction. Never replace a populated catalog. */
    public function replace(int $noticeId, int $userId, array $structure, ?string $selectedRef = null): void
    {
        $db = db_connect(); $db->query('SELECT pg_advisory_xact_lock(?)', [$userId]);
        if ($db->table('subjects')->where('notice_id', $noticeId)->countAllResults() > 0) throw new RuntimeException('O edital já possui conteúdo. A estrutura existente e seu histórico foram preservados.');
        $options = new SelectableOptionModel(); $groups = new ContentGroupModel(); $subjects = new SubjectModel(); $topics = new TopicModel();
        $options->where('notice_id', $noticeId)->delete(); $groups->where('notice_id', $noticeId)->delete(); (new StudyAreaModel())->where('notice_id', $noticeId)->delete();
        $ids = [];
        foreach ($structure['options'] as $index => $option) $ids[$option['ref']] = $options->insert(['notice_id' => $noticeId, 'external_ref' => $option['ref'], 'code' => $option['code'], 'name' => $option['name'], 'kind' => $option['kind'], 'is_selected' => $option['ref'] === $selectedRef, 'sort_order' => $index], true);
        $order = 0;
        foreach ($structure['groups'] as $index => $group) {
            $groupId = $groups->insert(['notice_id' => $noticeId, 'external_ref' => $group['ref'], 'name' => $group['name'], 'knowledge_type' => $group['knowledge_type'], 'applies_to_all' => $group['applies_to_all'], 'sort_order' => $index], true);
            foreach ($group['applicability'] as $application) $db->table('option_content_groups')->insert(['option_id' => $ids[$application['option_ref']], 'content_group_id' => $groupId, 'weight' => $application['weight']]);
            foreach ($group['subjects'] as $subject) {
                $subjectId = $subjects->insert(['notice_id' => $noticeId, 'content_group_id' => $groupId, 'name' => $subject['name'], 'weight' => 1, 'color' => ($order % 6) + 1, 'sort_order' => $order++], true);
                foreach ($subject['topics'] as $position => $topic) {
                    if (is_string($topic)) { $topics->insert(['subject_id' => $subjectId, 'name' => $topic, 'sort_order' => $position]); continue; }
                    $parent = $topics->insert(['subject_id' => $subjectId, 'name' => $topic['title'], 'source_text' => $topic['source'], 'is_source' => true, 'sort_order' => $position], true);
                    foreach ($topic['units'] as $unit) $topics->insert(['subject_id' => $subjectId, 'name' => $unit['title'], 'source_text' => $unit['source'], 'parent_topic_id' => $parent, 'sort_order' => $position]);
                }
            }
        }
    }
}
