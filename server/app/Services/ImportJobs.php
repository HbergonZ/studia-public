<?php
namespace App\Services;
use App\Models\NoticeModel;
use RuntimeException;
use Throwable;

final class ImportJobs
{
    public function __construct(private $analyze = null) {}
    public function enqueue(int $notice, int $revision, string $stage): void
    {
        db_connect()->table('notice_import_jobs')->insert(['notice_id' => $notice, 'revision' => $revision, 'stage' => $stage]);
    }
    public function processOne(?int $onlyNotice = null): bool
    {
        $db = db_connect(); $db->transException(true)->transBegin();
        // An interrupted process can be resumed explicitly, never auto-retried against AI quotas.
        $scope = $onlyNotice !== null ? ' AND notice_id=?' : ''; $bindings = $onlyNotice !== null ? [$onlyNotice] : [];
        $expired = $db->query("UPDATE notice_import_jobs SET status='failed', error='O processamento foi interrompido. Retome esta etapa.', finished_at=NOW() WHERE status='running' AND started_at < NOW() - INTERVAL '15 minutes'" . $scope . ' RETURNING notice_id, revision', $bindings)->getResultArray();
        foreach ($expired as $job) $db->table('notice_import_drafts')->where('notice_id', $job['notice_id'])->where('revision', $job['revision'])->update(['status' => 'interrupted', 'last_error' => 'O processamento foi interrompido. Retome esta etapa.']);
        $job = $db->query("SELECT * FROM notice_import_jobs WHERE status='queued'" . $scope . ' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1', $bindings)->getRowArray();
        if (!$job) { $db->transCommit(); return false; }
        $db->table('notice_import_jobs')->where('id', $job['id'])->update(['status' => 'running', 'started_at' => gmdate('c')]); $db->transCommit();
        try {
            $draft = $db->table('notice_import_drafts')->where('notice_id', $job['notice_id'])->get()->getRowArray();
            if (!$draft || (int)$draft['revision'] !== (int)$job['revision']) throw new RuntimeException('Etapa cancelada ou substituída.');
            $notice = (new NoticeModel())->find($job['notice_id']);
            if (!$notice) throw new RuntimeException('Este edital foi removido.');
            if ($job['stage'] === 'reading') {
                $result = (new PdfReading())->read($notice['stored_path'], function ($progress) use ($db, $job) {
                    $db->table('notice_import_drafts')->where('notice_id', $job['notice_id'])->where('revision', $job['revision'])->update(['reading' => json_encode($progress), 'updated_at' => gmdate('c')]);
                    return $db->affectedRows() > 0;
                });
                $update = ['source_text' => $result['text'], 'reading' => json_encode($result['reading']), 'status' => 'ready'];
            } else {
                $document = new JobImportDocument($draft['source_text']);
                $inventory = json_decode($draft['inventory'] ?? 'null', true); $content = json_decode($draft['content'] ?? 'null', true);
                $task = match ($job['stage']) {
                    'inventory' => $document->inventoryTask(),
                    'content' => $document->contentTask($inventory ?? [], $draft['selected_ref'] ?? ''),
                    'repair' => $document->repairTask($inventory ?? [], $content ?? []),
                    default => throw new RuntimeException('Etapa desconhecida.'),
                };
                $result = $this->analyze ? ($this->analyze)($draft['source_text'], $task) : (new AiEditalExtractor())->extract($draft['source_text'], $task)['structure'];
                $update = [$job['stage'] === 'inventory' ? 'inventory' : 'content' => json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'status' => $job['stage'] === 'inventory' ? 'inventory_ready' : 'content_ready'];
                if ($job['stage'] === 'inventory') $update += ['selected_ref' => null, 'content' => null];
            }
            $db->transException(true)->transBegin();
            $db->query('SELECT pg_advisory_xact_lock(?)', [(int)$job['notice_id']]);
            $active = $db->table('notice_import_jobs')->where('id', $job['id'])->get()->getRowArray();
            if ($active['status'] === 'running') {
                $db->table('notice_import_drafts')->where('notice_id', $job['notice_id'])->where('revision', $job['revision'])->update($update + ['last_error' => null, 'updated_at' => gmdate('c')]);
                $db->table('notice_import_jobs')->where('id', $job['id'])->where('status', 'running')->update(['status' => 'completed', 'finished_at' => gmdate('c')]);
            }
            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            $message = $e instanceof RuntimeException ? $e->getMessage() : 'Não foi possível concluir a etapa. Retome para tentar novamente.';
            $db->table('notice_import_jobs')->where('id', $job['id'])->where('status', 'running')->update(['status' => 'failed', 'error' => $message, 'finished_at' => gmdate('c')]);
            $db->table('notice_import_drafts')->where('notice_id', $job['notice_id'])->where('revision', $job['revision'])->update(['status' => 'interrupted', 'last_error' => $message, 'updated_at' => gmdate('c')]);
        }
        return true;
    }
}
