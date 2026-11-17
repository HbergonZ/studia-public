<?php
namespace App\Controllers\Api\V1;

use App\Models\{ContentGroupModel, NoticeModel, SelectableOptionModel, StudyAreaModel, SubjectModel, TopicModel};

final class CatalogController extends ApiController
{
    private function ownsNotice($id): bool { return (bool) (new NoticeModel())->where(['id' => $id, 'user_id' => $this->userId()])->first(); }
    private function ownedSubject($id): ?array { return (new SubjectModel())->select('subjects.*')->join('notices', 'notices.id=subjects.notice_id')->where(['subjects.id' => $id, 'notices.user_id' => $this->userId(), 'notices.deleted_at' => null])->first(); }
    private function ownedTopic($id): ?array { return (new TopicModel())->select('topics.*')->join('subjects', 'subjects.id=topics.subject_id')->join('notices', 'notices.id=subjects.notice_id')->where(['topics.id' => $id, 'notices.user_id' => $this->userId(), 'notices.deleted_at' => null])->first(); }

    private function fields(array $body, bool $subject): array
    {
        $fields = [];
        foreach (['nome' => 'name', 'peso' => 'weight', 'dificuldade' => 'difficulty'] as $alias => $key) if (array_key_exists($alias, $body)) $body[$key] = $body[$alias];
        if (array_key_exists('name', $body)) {
            if (!is_string($body['name']) || trim($body['name']) === '' || mb_strlen(trim($body['name'])) > ($subject ? 240 : 20000)) throw new \InvalidArgumentException($subject ? 'Informe um nome de matéria com até 240 caracteres, sem deixar o campo vazio.' : 'Informe um nome de tópico com até 20 mil caracteres, sem deixar o campo vazio.');
            $fields['name'] = trim($body['name']);
        }
        foreach (($subject ? ['weight' => 100, 'color' => 6, 'sort_order' => 100000] : ['difficulty' => 10, 'sort_order' => 100000]) as $key => $max) {
            if (!array_key_exists($key, $body)) continue;
            if (!is_int($body[$key]) || $body[$key] < ($key === 'color' ? 1 : 0) || $body[$key] > $max) throw new \InvalidArgumentException('Informe peso, dificuldade, cor e ordem dentro dos limites indicados.');
            $fields[$key] = $body[$key];
        }
        if ($subject && array_key_exists('weight', $fields)) $fields['weight_override'] = $fields['weight'];
        if ($subject && ($body['reset_weight'] ?? false) === true) $fields['weight_override'] = null;
        return $fields;
    }

    public function createSubject($noticeId)
    {
        if (!$this->ownsNotice($noticeId)) return $this->failNotFound();
        try {
            $fields = $this->fields($this->body(), true);
            if (!isset($fields['name'])) throw new \InvalidArgumentException('Informe o nome da matéria.');
            unset($fields['weight_override']);
            $db = db_connect(); $db->transStart();
            $gm = new ContentGroupModel();
            $group = $gm->where(['notice_id' => $noticeId, 'external_ref' => 'manual-general'])->first();
            $groupId = $group['id'] ?? $gm->insert(['notice_id' => $noticeId, 'external_ref' => 'manual-general', 'name' => 'Conhecimentos gerais', 'knowledge_type' => 'general', 'applies_to_all' => true], true);
            $id = (new SubjectModel())->insert(['notice_id' => $noticeId, 'content_group_id' => $groupId] + $fields + ['weight' => 5, 'color' => 1], true);
            $db->transComplete(); return $this->respondCreated(['id' => $id]);
        } catch (\InvalidArgumentException $e) { return $this->failValidationErrors($e->getMessage()); }
    }

    public function updateArea($noticeId, $areaId)
    {
        if (!$this->ownsNotice($noticeId)) return $this->failNotFound();
        $model = new StudyAreaModel(); $area = $model->where(['id' => $areaId, 'notice_id' => $noticeId])->first();
        if (!$area) return $this->failNotFound();
        if ($area['knowledge_type'] === 'general') return $this->failValidationErrors('Conhecimentos gerais são obrigatórios.');
        $selected = $this->body()['selected'] ?? null;
        if (!is_bool($selected)) return $this->failValidationErrors('Informe se a área está selecionada.');
        $model->update($areaId, ['is_selected' => $selected]); return $this->respondUpdated(['id' => $areaId, 'selected' => $selected]);
    }

    public function updateOption($noticeId, $optionId)
    {
        if (!$this->ownsNotice($noticeId)) return $this->failNotFound();
        $model = new SelectableOptionModel();
        if (!$model->where(['id' => $optionId, 'notice_id' => $noticeId])->first()) return $this->failNotFound();
        $selected = $this->body()['selected'] ?? null;
        if (!is_bool($selected)) return $this->failValidationErrors('Informe se o cargo está selecionado.');
        $model->update($optionId, ['is_selected' => $selected]); return $this->respondUpdated(['id' => $optionId, 'selected' => $selected]);
    }

    public function updateSubject($id)
    {
        if (!$this->ownedSubject($id)) return $this->failNotFound();
        try { $fields = $this->fields($this->body(), true); unset($fields['weight']); if (!$fields) return $this->failValidationErrors('Informe uma alteração válida.'); (new SubjectModel())->update($id, $fields); return $this->respondUpdated($fields); }
        catch (\InvalidArgumentException $e) { return $this->failValidationErrors($e->getMessage()); }
    }

    private function removeSafely(array $topicIds, callable $remove)
    {
        $db = db_connect(); $db->transBegin();
        try {
            $db->query('SELECT pg_advisory_xact_lock(?)', [$this->userId()]);
            if ($topicIds) {
                if ($db->table('study_sessions')->whereIn('topic_id', $topicIds)->countAllResults() > 0) throw new \InvalidArgumentException('Este conteúdo tem estudos registrados e não pode ser removido. Seu histórico foi preservado.');
                $ids = array_fill_keys(array_map('strval', $topicIds), true);
                foreach ($db->table('daily_study_plans')->where('user_id', $this->userId())->get()->getResultArray() as $plan) foreach (json_decode($plan['blocks'], true, 512, JSON_THROW_ON_ERROR) as $block) if (isset($ids[$block['topicId']])) throw new \InvalidArgumentException('Este conteúdo faz parte de um plano salvo e não pode ser removido. Seus planos foram preservados.');
            }
            $remove(); $db->transCommit(); return $this->respondDeleted(['removed' => true]);
        } catch (\InvalidArgumentException $e) { $db->transRollback(); return $this->fail($e->getMessage(), 409); }
        catch (\Throwable $e) { $db->transRollback(); log_message('error', 'Falha ao remover conteúdo: {type}', ['type' => get_class($e)]); return $this->failServerError('Não foi possível remover o conteúdo.'); }
    }

    public function deleteSubject($id)
    {
        if (!$this->ownedSubject($id)) return $this->failNotFound();
        $ids = array_column((new TopicModel())->where('subject_id', $id)->findAll(), 'id');
        return $this->removeSafely($ids, static fn () => (new SubjectModel())->delete($id));
    }

    public function createTopic($subjectId)
    {
        if (!$this->ownedSubject($subjectId)) return $this->failNotFound();
        try { $fields = $this->fields($this->body(), false); if (!isset($fields['name'])) return $this->failValidationErrors('Informe o nome do tópico.'); $id = (new TopicModel())->insert(['subject_id' => $subjectId] + $fields + ['difficulty' => 10], true); return $this->respondCreated(['id' => $id]); }
        catch (\InvalidArgumentException $e) { return $this->failValidationErrors($e->getMessage()); }
    }

    public function updateTopic($id)
    {
        if (!$this->ownedTopic($id)) return $this->failNotFound();
        try { $fields = $this->fields($this->body(), false); if (!$fields) return $this->failValidationErrors('Informe uma alteração válida.'); (new TopicModel())->update($id, $fields); return $this->respondUpdated($fields); }
        catch (\InvalidArgumentException $e) { return $this->failValidationErrors($e->getMessage()); }
    }

    public function deleteTopic($id)
    {
        if (!$this->ownedTopic($id)) return $this->failNotFound();
        $children = array_column((new TopicModel())->where('parent_topic_id', $id)->findAll(), 'id');
        return $this->removeSafely([$id, ...$children], static fn () => (new TopicModel())->delete($id));
    }
}
