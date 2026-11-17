<?php
namespace App\Controllers\Api\V1;

use App\Models\NoticeModel;
use App\Services\{DailyStudyData, EditalStructureValidator, StudyUnitValidator};
use RuntimeException;

final class StudyUnitsController extends ApiController
{
    public function previewImport()
    {
        try {
            $response = $this->body()['response'] ?? '';
            if (!is_string($response)) throw new RuntimeException('Informe a resposta JSON.');
            $validator = new StudyUnitValidator();
            $structure = (new EditalStructureValidator())->validate($validator->json($response));
            if (($structure['extraction_complete'] ?? false) !== true) throw new RuntimeException('A resposta indica uma extração incompleta. Peça à IA o conteúdo completo antes de importar.');
            return $this->respond(['structure' => $structure, 'summary' => $validator->summary($structure)]);
        } catch (RuntimeException $e) { return $this->failValidationErrors($e->getMessage()); }
    }

    private function snapshot($id): ?array
    {
        $notice = (new NoticeModel())->where(['id' => $id, 'user_id' => $this->userId()])->first();
        if (!$notice) return null;
        $rows = db_connect()->query('SELECT t.id,t.name,t.source_text,t.parent_topic_id,t.is_source,t.sort_order,s.name subject_name,g.name group_name,
            (SELECT COUNT(*) FROM study_sessions ss WHERE ss.topic_id=t.id) session_count
            FROM topics t JOIN subjects s ON s.id=t.subject_id JOIN content_groups g ON g.id=s.content_group_id
            WHERE s.notice_id=? ORDER BY s.sort_order,t.sort_order,t.id', [$id])->getResultArray();
        $topics = []; $originals = [];
        foreach ($rows as $row) {
            $item = ['topic_id' => (string) $row['id'], 'title' => mb_substr($row['name'],0,180), 'source' => $row['source_text'] ?? $row['name'],
                'subject' => $row['subject_name'], 'group' => $row['group_name'], 'sessions' => (int) $row['session_count'], 'organized' => $row['parent_topic_id'] !== null];
            if (DailyStudyData::boolean($row['is_source'])) $originals[] = $item;
            else $topics[] = $item;
        }
        // Study results do not invalidate a content preview; all content edits do.
        $revision = hash('sha256', json_encode(array_map(static fn($r) => array_diff_key($r, ['session_count' => true]), $rows), JSON_THROW_ON_ERROR));
        return ['notice' => ['id' => (string) $notice['id'], 'title' => $notice['title']], 'revision' => $revision, 'topics' => $topics, 'originals' => $originals];
    }

    public function show($id = null)
    {
        $snapshot = $this->snapshot($id);
        return $snapshot ? $this->respond($snapshot) : $this->failNotFound();
    }

    private function validateProposal(array $snapshot, array $body): array
    {
        if (($body['revision'] ?? '') !== $snapshot['revision']) throw new RuntimeException('O conteúdo mudou. Atualize a página e gere um novo prompt.');
        if (!is_string($body['response'] ?? null)) throw new RuntimeException('Informe a resposta JSON.');
        $validator = new StudyUnitValidator(); $value = $validator->json($body['response']);
        if (($value['version'] ?? null) !== 1 || !is_array($value['topics'] ?? null) || !array_is_list($value['topics']) || count($value['topics']) < 1 || count($value['topics']) > 2000) throw new RuntimeException('Use version 1 e uma lista topics com os assuntos organizados.');
        $available = array_column($snapshot['topics'], null, 'topic_id'); $seen = []; $result = [];
        foreach ($value['topics'] as $topic) {
            $topicId = is_array($topic) && (is_string($topic['topic_id'] ?? null) || is_int($topic['topic_id'] ?? null)) ? (string) $topic['topic_id'] : '';
            if (!isset($available[$topicId]) || isset($seen[$topicId])) throw new RuntimeException('Assunto inexistente, já organizado ou repetido na resposta.');
            $seen[$topicId] = true;
            $original = $available[$topicId];
            $validated = $validator->topic(['title' => $original['title'], 'source' => $topic['source'] ?? null, 'units' => $topic['units'] ?? null]);
            if ($validator->normalized($validated['source']) !== $validator->normalized($original['source'])) throw new RuntimeException('O texto original foi alterado pela IA: ' . $original['title']);
            $result[] = $original + ['units' => $validated['units']];
        }
        return $result;
    }

    public function preview($id)
    {
        $snapshot = $this->snapshot($id); if (!$snapshot) return $this->failNotFound();
        try { return $this->respond(['topics' => $this->validateProposal($snapshot, $this->body())]); }
        catch (RuntimeException $e) { return $this->failValidationErrors($e->getMessage()); }
    }

    public function apply($id)
    {
        $db = db_connect(); $db->transException(true)->transBegin();
        try {
            $db->query('SELECT pg_advisory_xact_lock(?)', [$this->userId()]);
            $snapshot = $this->snapshot($id);
            if (!$snapshot) { $db->transRollback(); return $this->failNotFound(); }
            $topics = $this->validateProposal($snapshot, $this->body());
            $created = 0;
            foreach ($topics as $topic) {
                $row = $db->table('topics')->where('id', $topic['topic_id'])->get()->getRowArray();
                $db->table('topics')->where('id', $row['id'])->update(['is_source' => true, 'source_text' => $topic['source']]);
                foreach ($topic['units'] as $unit) {
                    $db->table('topics')->insert(['subject_id' => $row['subject_id'], 'parent_topic_id' => $row['id'], 'name' => $unit['title'], 'source_text' => $unit['source'],
                        'difficulty' => $row['difficulty'], 'sort_order' => $row['sort_order'], 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')]);
                    $created++;
                }
            }
            if (!$db->transStatus()) throw new \Exception('Transação interrompida.');
            $db->transCommit();
            return $this->respond(['units' => $created, 'message' => 'Organização aplicada. O histórico anterior foi preservado.']);
        } catch (RuntimeException $e) { $db->transRollback(); return $this->failValidationErrors($e->getMessage()); }
        catch (\Throwable $e) { $db->transRollback(); log_message('error', 'Falha ao organizar unidades: {error}', ['error' => $e->getMessage()]); return $this->failServerError('Não foi possível aplicar a organização. Tente novamente.'); }
    }
}
