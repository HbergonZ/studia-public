<?php
namespace App\Controllers\Api\V1;

use App\Services\{DailyPlanner, DailyStudyData};
use DateTimeImmutable;

final class DailyPlansController extends ApiController
{
    private function validDate(mixed $value): ?string
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) return null;
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $date && $date->format('Y-m-d') === $value ? $value : null;
    }

    public function showPlan()
    {
        $service = new DailyStudyData();
        $date = $this->validDate($this->request->getGet('date') ?? $service->today($this->userId()));
        if (!$date) return $this->failValidationErrors('Data inválida.');
        try { $context = $service->context($this->userId(), $date); }
        catch (\InvalidArgumentException $e) { return $this->failValidationErrors($e->getMessage()); }
        $row = db_connect()->table('daily_study_plans')->where(['user_id' => $this->userId(), 'notice_id' => $context['noticeId'], 'study_date' => $date])->get()->getRowArray();
        return $this->respond($service->present($row, $context, $date));
    }

    public function index()
    {
        $from = $this->validDate($this->request->getGet('from'));
        $to = $this->validDate($this->request->getGet('to'));
        if (!$from || !$to || $to < $from || (new DateTimeImmutable($from))->diff(new DateTimeImmutable($to))->days > 370) return $this->failValidationErrors('Informe um período de até um ano.');
        $rows = db_connect()->query("SELECT p.* FROM daily_study_plans p JOIN notices n ON n.id=p.notice_id WHERE p.user_id=? AND n.status='confirmed' AND n.deleted_at IS NULL AND p.study_date BETWEEN ? AND ? ORDER BY p.study_date", [$this->userId(), $from, $to])->getResultArray();
        return $this->respond(array_map(static fn ($r) => ['date' => $r['study_date'], 'blocks' => json_decode($r['blocks'], true, 512, JSON_THROW_ON_ERROR)], $rows));
    }

    public function save()
    {
        $d = $this->body(); $service = new DailyStudyData(); $uid = $this->userId();
        $date = $this->validDate($d['date'] ?? null);
        if (!$date || $date < $service->today($uid)) return $this->failValidationErrors('Planos anteriores ficam disponíveis apenas para consulta.');
        $duration = $d['blockMinutes'] ?? null; $pause = $d['breakMinutes'] ?? null;
        if (!is_int($duration) || $duration < 5 || $duration > 180 || !is_int($pause) || $pause < 0 || $pause > 30 || !is_array($d['blocks'] ?? null) || count($d['blocks']) > 288 || !is_int($d['version'] ?? null)) return $this->failValidationErrors('Revise as durações e os blocos do plano.');
        $db = db_connect(); $db->transBegin();
        try {
            $db->query('SELECT pg_advisory_xact_lock(?)', [$uid]);
            $context = $service->context($uid, $date);
            if ((string) ($d['noticeId'] ?? '') !== (string) $context['noticeId']) throw new \InvalidArgumentException('O edital ativo mudou. Recarregue o plano.');
            $where = ['user_id' => $uid, 'notice_id' => $context['noticeId'], 'study_date' => $date];
            $existing = $db->table('daily_study_plans')->where($where)->get()->getRowArray();
            if ((int) ($existing['version'] ?? 0) !== $d['version']) { $db->transRollback(); return $this->fail('O plano mudou em outra tela. Recarregue antes de editar.', 409); }
            $old = $existing ? json_decode($existing['blocks'], true, 512, JSON_THROW_ON_ERROR) : [];
            $done = array_filter($old, static fn ($b) => $b['status'] === 'completed');
            $oldById = array_column($old, null, 'id'); $blocks = []; $ids = [];
            foreach ($d['blocks'] as $block) {
                if (!is_array($block) || !is_scalar($block['topicId'] ?? null)) throw new \InvalidArgumentException('Assunto inválido.');
                $id = $block['id'] ?? ''; $topicId = (string) ($block['topicId'] ?? '');
                if (!is_string($id) || !preg_match('/^[a-zA-Z0-9-]{16,64}$/', $id) || isset($ids[$id]) || !is_int($block['minutes'] ?? null) || $block['minutes'] < 5 || $block['minutes'] > 180 || !in_array($block['status'] ?? '', ['planned', 'deferred', 'completed'], true)) throw new \InvalidArgumentException('Bloco inválido.');
                $ids[$id] = true;
                if (($oldById[$id]['status'] ?? '') === 'completed') {
                    $saved = $oldById[$id];
                    if ($block['status'] !== 'completed' || $block['minutes'] !== $saved['minutes'] || $topicId !== $saved['topicId']) throw new \InvalidArgumentException('Blocos concluídos não podem ser alterados.');
                    $blocks[] = $saved; continue;
                }
                if (!isset($context['topics'][$topicId]) || (($context['topics'][$topicId]['isSource'] ?? false) && ($oldById[$id]['topicId'] ?? '') !== $topicId) || $block['status'] === 'completed') throw new \InvalidArgumentException('Escolha um assunto do edital ativo.');
                $blocks[] = ['id' => $id, 'topicId' => $topicId, 'minutes' => $block['minutes'], 'status' => $block['status'], 'reason' => isset($oldById[$id]) && $oldById[$id]['topicId'] === $topicId ? $oldById[$id]['reason'] : ($existing ? 'Escolhido por você' : (new DailyPlanner())->reason($context['topics'][$topicId], $date))];
            }
            foreach ($done as $block) if (!isset($ids[$block['id']])) throw new \InvalidArgumentException('Preserve os blocos já concluídos.');
            $pending = array_values(array_filter($blocks, static fn ($b) => $b['status'] === 'planned'));
            $activeCount = count(array_filter($blocks, static fn ($b) => $b['status'] !== 'deferred'));
            $remainingReserved = array_sum(array_column($pending, 'minutes')) + max(0, $activeCount - 1) * $pause;
            $oldPending = array_filter($old, static fn ($b) => $b['status'] === 'planned');
            $oldActiveCount = count(array_filter($old, static fn ($b) => $b['status'] !== 'deferred'));
            $oldReserved = array_sum(array_column($oldPending, 'minutes')) + max(0, $oldActiveCount - 1) * (int) ($existing['break_minutes'] ?? $pause);
            if ($pending && $remainingReserved + $context['spentMinutes'] > $context['capacityMinutes'] && $remainingReserved >= $oldReserved) throw new \InvalidArgumentException('Os blocos e pausas ultrapassam o tempo disponível. Reduza o plano ou ajuste sua rotina.');
            $values = ['blocks' => json_encode($blocks, JSON_THROW_ON_ERROR), 'block_minutes' => $duration, 'break_minutes' => $pause, 'version' => $d['version'] + 1];
            if ($existing) $db->table('daily_study_plans')->where('id', $existing['id'])->update($values);
            else $db->table('daily_study_plans')->insert($where + $values);
            if (!$db->transStatus()) throw new \RuntimeException('Falha ao salvar plano.');
            $row = $db->table('daily_study_plans')->where($where)->get()->getRowArray();
            $db->transCommit();
            return $this->respond($service->present($row, $context, $date));
        } catch (\InvalidArgumentException $e) { $db->transRollback(); return $this->failValidationErrors($e->getMessage()); }
        catch (\Throwable $e) { $db->transRollback(); log_message('error', 'Falha ao salvar plano: {message}', ['message' => $e->getMessage()]); return $this->failServerError('Não foi possível salvar o plano. Tente novamente.'); }
    }
}
