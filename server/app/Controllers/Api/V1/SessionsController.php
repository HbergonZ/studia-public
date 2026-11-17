<?php
namespace App\Controllers\Api\V1;

use App\Services\{DailyStudyData, ReviewScheduleService};
use DateTimeImmutable;

final class SessionsController extends ApiController
{
    public function correct($id)
    {
        $d = $this->body(); $db = db_connect(); $uid = $this->userId();
        foreach (['minutes' => 1440, 'correct_answers' => 100000, 'wrong_answers' => 100000, 'difficulty' => 10] as $field => $max) if (!is_int($d[$field] ?? null) || $d[$field] < 0 || $d[$field] > $max) return $this->failValidationErrors('Revise o tempo, questões e dificuldade.');
        if (!is_bool($d['completes_topic'] ?? null) || !is_array($d['expected'] ?? null) || !is_string($d['reason'] ?? null) || trim($d['reason']) === '' || mb_strlen($d['reason']) > 500) return $this->failValidationErrors('Informe o motivo da correção e recarregue o histórico.');
        $fields = array_intersect_key($d, array_flip(['minutes','correct_answers','wrong_answers','difficulty','completes_topic']));
        if ($fields['minutes'] === 0 && $fields['correct_answers'] + $fields['wrong_answers'] === 0 && !$fields['completes_topic']) return $this->failValidationErrors('Informe tempo ou questões para uma continuação.');
        $db->transBegin();
        try {
            $db->query('SELECT pg_advisory_xact_lock(?)', [$uid]);
            $session = $db->table('study_sessions')->where(['id' => (int) $id, 'user_id' => $uid])->get()->getRowArray();
            if (!$session) { $db->transRollback(); return $this->failNotFound('Sessão não encontrada.'); }
            $current = []; foreach ($fields as $key => $value) $current[$key] = $key === 'completes_topic' ? DailyStudyData::boolean($session[$key]) : (int) $session[$key];
            if ($current !== $d['expected'] && $current !== $fields) { $db->transRollback(); return $this->fail('Este registro mudou em outra tela. Recarregue o histórico.',409); }
            if ($current !== $fields) {
                $db->table('study_session_corrections')->insert(['session_id' => $id, 'user_id' => $uid, 'previous_values' => json_encode(['values' => $current, 'reason' => trim($d['reason'])], JSON_THROW_ON_ERROR)]);
                $db->table('study_sessions')->where('id', $id)->update($fields + ['corrected_at' => date('Y-m-d H:i:s')]);
                foreach ($db->table('daily_study_plans')->where('user_id', $uid)->get()->getResultArray() as $plan) {
                    $blocks = json_decode($plan['blocks'], true, 512, JSON_THROW_ON_ERROR); $changed = false;
                    foreach ($blocks as &$block) if ((string) ($block['sessionId'] ?? '') === (string) $id) { $block['actualMinutes'] = $fields['minutes']; $changed = true; }
                    unset($block);
                    if ($changed) $db->table('daily_study_plans')->where('id', $plan['id'])->update(['blocks' => json_encode($blocks, JSON_THROW_ON_ERROR), 'version' => (int) $plan['version'] + 1]);
                }
            }
            $topic = (new \App\Services\SessionHistory())->rebuild((string) $session['topic_id']);
            if (!$db->transStatus()) throw new \RuntimeException('Transaction failed');
            $db->transCommit(); return $this->respond(['id' => $id, 'nextReviewAt' => $topic['next_review_at']]);
        } catch (\Throwable $e) { $db->transRollback(); log_message('error', 'Falha ao corrigir sessão: {type}', ['type' => get_class($e)]); return $this->failServerError('Não foi possível corrigir a sessão. Nenhum registro foi alterado.'); }
    }

    public function create()
    {
        $d = $this->body();
        if (!is_scalar($d['topic_id'] ?? null) || !ctype_digit((string) $d['topic_id'])) return $this->failValidationErrors('Assunto inválido.');
        $uid = $this->userId(); $data = new DailyStudyData();
        foreach (['minutes' => 1440, 'correct_answers' => 100000, 'wrong_answers' => 100000, 'difficulty' => 10] as $field => $max) {
            if (!is_int($d[$field] ?? null) || $d[$field] < 0 || $d[$field] > $max) return $this->failValidationErrors('Informe tempo, questões e dificuldade válidos.');
        }
        $complete = $d['completes_topic'] ?? true;
        if (!is_bool($complete)) return $this->failValidationErrors('Informe se o estudo foi concluído.');
        $key = $d['request_key'] ?? null;
        if ($key !== null && (!is_string($key) || !preg_match('/^[a-zA-Z0-9-]{16,64}$/', $key))) return $this->failValidationErrors('Identificador do registro inválido.');
        $date = $d['studied_on'] ?? $data->today($uid);
        $parsed = is_string($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? DateTimeImmutable::createFromFormat('!Y-m-d', $date) : false;
        if (!$parsed || $parsed->format('Y-m-d') !== $date || $date > $data->today($uid)) return $this->failValidationErrors('Informe uma data de estudo válida, até hoje.');
        if (!$complete && $d['minutes'] === 0 && $d['correct_answers'] + $d['wrong_answers'] === 0) return $this->failValidationErrors('Informe o tempo ou as questões realizadas.');
        $db = db_connect(); $db->transBegin();
        try {
            $db->query('SELECT pg_advisory_xact_lock(?)', [$uid]);
            if ($key) {
                $previous = $db->table('study_sessions')->where(['user_id' => $uid, 'request_key' => $key])->get()->getRowArray();
                if ($previous) {
                    if ((string) $previous['topic_id'] !== (string) ($d['topic_id'] ?? '') || (int) $previous['minutes'] !== $d['minutes'] || (int) $previous['correct_answers'] !== $d['correct_answers'] || (int) $previous['wrong_answers'] !== $d['wrong_answers'] || (int) $previous['difficulty'] !== $d['difficulty'] || DailyStudyData::boolean($previous['completes_topic']) !== $complete || $previous['studied_on'] !== $date) throw new \InvalidArgumentException('Este registro já foi enviado com outros dados. Recarregue antes de continuar.');
                    $savedTopic = $db->table('topics')->where('id', $previous['topic_id'])->get()->getRowArray();
                    $db->transCommit(); return $this->respondCreated(['id' => $previous['id'], 'repeated' => true, 'nextReviewAt' => $savedTopic['next_review_at'], 'completesTopic' => DailyStudyData::boolean($previous['completes_topic'])]);
                }
            }
            $context = $data->context($uid, $date);
            $topicId = (string) ($d['topic_id'] ?? '');
            if (!isset($context['topics'][$topicId])) { $db->transRollback(); return $this->failNotFound('Assunto não encontrado no edital ativo.'); }
            $topic = $db->table('topics')->where('id', $topicId)->get()->getRowArray();
            $plan = null; $blocks = []; $blockIndex = null;
            if (isset($d['plan_id']) || isset($d['block_id'])) {
                $plan = $db->table('daily_study_plans')->where(['id' => (int) ($d['plan_id'] ?? 0), 'user_id' => $uid, 'notice_id' => $context['noticeId'], 'study_date' => $date])->get()->getRowArray();
                if (!$plan) throw new \InvalidArgumentException('Plano do dia não encontrado. Recarregue antes de registrar.');
                $blocks = json_decode($plan['blocks'], true, 512, JSON_THROW_ON_ERROR);
                foreach ($blocks as $i => $block) if ($block['id'] === ($d['block_id'] ?? '') && $block['topicId'] === $topicId && $block['status'] === 'planned') $blockIndex = $i;
                if ($blockIndex === null) throw new \InvalidArgumentException('Este bloco já foi concluído ou alterado. Recarregue o plano.');
            }
            if (!$plan && !isset($d['plan_id']) && !isset($d['block_id'])) {
                $candidate = $db->table('daily_study_plans')->where(['user_id' => $uid, 'notice_id' => $context['noticeId'], 'study_date' => $date])->get()->getRowArray();
                if ($candidate) {
                    $candidateBlocks = json_decode($candidate['blocks'], true, 512, JSON_THROW_ON_ERROR);
                    foreach ($candidateBlocks as $i => $candidateBlock) {
                        if ($candidateBlock['topicId'] === $topicId && $candidateBlock['status'] === 'planned') { $plan = $candidate; $blocks = $candidateBlocks; $blockIndex = $i; break; }
                    }
                }
            }
            $db->table('study_sessions')->insert(['user_id' => $uid, 'topic_id' => $topicId, 'studied_on' => $date, 'minutes' => $d['minutes'], 'correct_answers' => $d['correct_answers'], 'wrong_answers' => $d['wrong_answers'], 'difficulty' => $d['difficulty'], 'completes_topic' => $complete, 'request_key' => $key, 'created_at' => date('Y-m-d H:i:s')]);
            $id = $db->insertID(); $schedule = null;
            $latestSession = $db->table('study_sessions')->selectMax('studied_on')->where('topic_id', $topicId)->get()->getRowArray();
            if ($date >= ($latestSession['studied_on'] ?? $date)) {
                $update = ['difficulty' => $d['difficulty'], 'needs_continuation' => !$complete];
                if ($complete) {
                    $service = new ReviewScheduleService();
                    $position = $topic['last_reviewed_at'] ? (int) $topic['curve_position'] : $service->initialPosition($d['difficulty']);
                    $schedule = $service->afterSession($position, $d['correct_answers'], $d['wrong_answers'], $parsed);
                    $update += ['curve_position' => $schedule['position'], 'first_reviewed_at' => $topic['first_reviewed_at'] ?: $date . ' 00:00:00', 'last_reviewed_at' => $date . ' 00:00:00', 'next_review_at' => $schedule['nextReviewAt']];
                }
                $db->table('topics')->where('id', $topicId)->update($update);
            }
            if ($plan) {
                $blocks[$blockIndex]['status'] = 'completed'; $blocks[$blockIndex]['sessionId'] = (string) $id; $blocks[$blockIndex]['actualMinutes'] = $d['minutes'];
                $db->table('daily_study_plans')->where('id', $plan['id'])->update(['blocks' => json_encode($blocks, JSON_THROW_ON_ERROR), 'version' => (int) $plan['version'] + 1]);
            }
            if (!$db->transStatus()) throw new \RuntimeException('Gravação interrompida.');
            $db->transCommit();
            return $this->respondCreated(['id' => $id, 'nextReviewAt' => $schedule['nextReviewAt'] ?? $topic['next_review_at'], 'position' => $schedule['position'] ?? (int) $topic['curve_position'], 'completesTopic' => $complete]);
        } catch (\InvalidArgumentException $e) { $db->transRollback(); return $this->failValidationErrors($e->getMessage()); }
        catch (\Throwable $e) { $db->transRollback(); log_message('error', 'Falha ao registrar estudo: {message}', ['message' => $e->getMessage()]); return $this->failServerError('Não foi possível salvar o estudo. Tente novamente.'); }
    }
}
