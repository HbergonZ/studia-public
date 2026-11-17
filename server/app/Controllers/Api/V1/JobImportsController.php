<?php
namespace App\Controllers\Api\V1;

use App\Models\{NoticeModel, ExtractionRunModel};
use App\Services\{AiEditalExtractor, JobImportDocument, PdfTextExtractor, NoticeStructureWriter, EditalStructureValidator, StudyUnitValidator, ImportJobs};
use RuntimeException;
use Throwable;

final class JobImportsController extends ApiController
{
    private function notice(int $id): ?array { return (new NoticeModel())->where(['id' => $id, 'user_id' => $this->userId()])->first(); }
    private function draft(int $id): ?array { return db_connect()->table('notice_import_drafts')->where('notice_id', $id)->get()->getRowArray(); }
    private function decode(mixed $value): ?array { return is_array($value) ? $value : ($value ? json_decode($value, true) : null); }
    private function busy(array $row): bool { return db_connect()->table('notice_import_jobs')->where('notice_id', $row['notice_id'])->whereIn('status', ['queued','running'])->countAllResults() > 0 || (str_ends_with($row['status'], '_processing') && strtotime($row['updated_at']) > time() - 600); }
    private function emptyCatalog(int $id): void
    {
        if (db_connect()->table('subjects')->where('notice_id', $id)->countAllResults()) throw new RuntimeException('O edital já possui conteúdo. Seu histórico foi preservado.', 409);
    }
    private function lock(): void { db_connect()->query('SELECT pg_advisory_xact_lock(?)', [$this->userId()]); }
    private function view(int $id): array
    {
        $row = $this->draft($id); if (!$row) throw new RuntimeException('Envie o PDF para começar.', 404);
        $inventory = $this->decode($row['inventory']); $content = $this->decode($row['content']);
        $document = trim($row['source_text']) !== '' ? new JobImportDocument($row['source_text']) : null;
        $coverage = $inventory && $content && $document ? $document->coverage($inventory, $content) : null;
        $reading = $this->decode($row['reading'] ?? null);
        if ($document) {
            $health = $document->readingHealth();
            if ($reading && isset($reading['pages'])) { $health['pages_to_check'] = array_column(array_filter($reading['pages'], static fn($p) => $p['needs_review']), 'page'); $health['warning'] = $health['pages_to_check'] ? 'Confira as páginas com reconhecimento de imagem ou pouco texto legível.' : null; }
            $reading = array_merge($health, $reading ?? []);
        }
        $units = $document && $inventory && $content ? (new StudyUnitValidator())->summary($document->structure($inventory, $content)) : null;
        return ['revision' => (int) $row['revision'], 'status' => $row['status'], 'busy' => $this->busy($row), 'inventory' => $inventory, 'selected_ref' => $row['selected_ref'], 'content' => $content, 'coverage' => $coverage, 'reading' => $reading, 'document' => $document?->documentReview(), 'document_confirmed' => \App\Services\DailyStudyData::boolean($row['document_confirmed']), 'units_summary' => $units, 'error' => $row['last_error'], 'aiAvailable' => trim((string) env('GEMINI_API', '')) !== '' || trim((string) env('OPENROUTER_API_KEY', '')) !== ''];
    }
    private function error(Throwable $error)
    {
        db_connect()->transRollback();
        $code = $error instanceof RuntimeException && in_array($error->getCode(), [404,409,422], true) ? $error->getCode() : 422;
        return $this->respond(['message' => $error instanceof RuntimeException ? $error->getMessage() : 'Não foi possível concluir esta etapa. Tente novamente.'], $code);
    }
    private function checked(int $id, array $body): array
    {
        $row = $this->draft($id); if (!$row) throw new RuntimeException('Envie o PDF para começar.', 404);
        if ($row['status'] === 'applied') throw new RuntimeException('Este conteúdo já foi importado. Continue na revisão do edital.', 409);
        $this->emptyCatalog($id);
        if ($this->busy($row)) throw new RuntimeException('Esta etapa ainda está em andamento. Aguarde antes de tentar novamente.', 409);
        if (!is_int($body['revision'] ?? null) || $body['revision'] !== (int) $row['revision']) throw new RuntimeException('A importação mudou em outra aba. Recarregue para continuar.', 409);
        return $row;
    }
    public function show($id = null)
    {
        if (!$this->notice((int) $id)) return $this->failNotFound();
        try { return $this->respond($this->view((int) $id)); } catch (Throwable $e) { return $this->error($e); }
    }
    public function prepare($id)
    {
        $id = (int) $id; if (!$this->notice($id)) return $this->failNotFound();
        try {
            $this->emptyCatalog($id); $file = $this->request->getFile('file');
            if (!$file || !$file->isValid() || $file->getSize() > 15 * 1024 * 1024 || $file->getMimeType() !== 'application/pdf') throw new RuntimeException('Envie um PDF válido de até 15 MB.');
            $hash = hash_file('sha256', $file->getTempName());
            $background = $this->request->getPost('background') === '1';
            $text = $background ? '' : (new PdfTextExtractor())->extract($file->getTempName()); if (!$background) new JobImportDocument($text);
            $db = db_connect(); $db->transException(true)->transBegin(); $this->lock(); $this->emptyCatalog($id);
            $existing = $this->draft($id);
            if ($existing) {
                if ($existing['source_hash'] !== $hash) throw new RuntimeException('Este rascunho já contém outro PDF. Comece uma nova importação para trocar o documento.', 409);
                $db->transCommit(); return $this->respond($this->view($id));
            }
            $path = WRITEPATH . 'uploads/editais'; if (!is_dir($path)) mkdir($path, 0700, true);
            $name = $file->getRandomName(); $original = $file->getClientName(); $file->move($path, $name);
            $db->table('notice_import_drafts')->insert(['notice_id' => $id, 'source_text' => $text, 'source_hash' => $hash, 'status' => $background ? 'reading_processing' : 'ready']);
            (new NoticeModel())->update($id, ['source' => 'pdf', 'original_filename' => $original, 'stored_path' => $path . '/' . $name, 'extraction_error' => null]);
            if ($background) (new ImportJobs())->enqueue($id, 1, 'reading');
            $db->transCommit(); return $this->respond($this->view($id));
        } catch (Throwable $e) { return $this->error($e); }
    }
    public function prompt($id)
    {
        $id = (int) $id; if (!$this->notice($id)) return $this->failNotFound();
        try {
            $row = $this->draft($id); if (!$row) throw new RuntimeException('Envie o PDF para começar.', 404);
            $document = new JobImportDocument($row['source_text']);
            $stage = $this->request->getGet('stage');
            if (!in_array($stage, ['inventory','content','repair'], true)) throw new RuntimeException('Etapa de importação inválida.');
            $task = $stage === 'inventory' ? $document->inventoryTask() : ($stage === 'repair' ? $document->repairTask($this->decode($row['inventory']) ?? [], $this->decode($row['content']) ?? []) : $document->contentTask($this->decode($row['inventory']) ?? [], $row['selected_ref'] ?? ''));
            return $this->respond(['revision' => (int) $row['revision'], 'prompt' => $document->prompt($task)]);
        } catch (Throwable $e) { return $this->error($e); }
    }
    public function select($id)
    {
        $id = (int) $id; if (!$this->notice($id)) return $this->failNotFound();
        try {
            $db = db_connect(); $db->transException(true)->transBegin(); $this->lock(); $body = $this->body(); $row = $this->checked($id, $body);
            $inventory = $this->decode($row['inventory']);
            if (!$inventory || !$inventory['has_study_syllabus'] || !is_string($body['option_ref'] ?? null)) throw new RuntimeException('Identifique os cargos antes de escolher.');
            (new JobImportDocument($row['source_text']))->option($inventory, $body['option_ref']);
            if ($body['option_ref'] !== $row['selected_ref']) $db->table('notice_import_drafts')->where('notice_id', $id)->update(['selected_ref' => $body['option_ref'], 'content' => null, 'status' => 'inventory_ready', 'revision' => (int) $row['revision'] + 1, 'last_error' => null, 'updated_at' => gmdate('Y-m-d H:i:sP')]);
            $db->transCommit(); return $this->respond($this->view($id));
        } catch (Throwable $e) { return $this->error($e); }
    }
    public function inventory($id) { return $this->analyze((int) $id, 'inventory'); }
    public function content($id) { return $this->analyze((int) $id, 'content'); }
    public function repair($id) { return $this->analyze((int) $id, 'repair'); }
    public function cancel($id)
    {
        $id = (int)$id; if (!$this->notice($id)) return $this->failNotFound();
        try {
            $db = db_connect(); $db->transException(true)->transBegin(); $this->lock(); $body = $this->body(); $row = $this->draft($id);
            if (!$row || !is_int($body['revision'] ?? null) || $body['revision'] !== (int)$row['revision'] || $row['status'] === 'applied') throw new RuntimeException('A etapa mudou. Recarregue para continuar.', 409);
            $db->table('notice_import_jobs')->where('notice_id', $id)->whereIn('status', ['queued','running'])->update(['status' => 'cancelled', 'finished_at' => gmdate('c')]);
            $db->table('notice_import_drafts')->where('notice_id', $id)->update(['revision' => (int)$row['revision'] + 1, 'status' => 'cancelled', 'last_error' => 'Processamento cancelado. Seu progresso foi mantido.', 'updated_at' => gmdate('c')]);
            $db->transCommit(); return $this->respond($this->view($id));
        } catch (Throwable $e) { return $this->error($e); }
    }
    public function reading($id)
    {
        $id = (int)$id; if (!$this->notice($id)) return $this->failNotFound();
        try {
            $db = db_connect(); $db->transException(true)->transBegin(); $this->lock(); $row = $this->checked($id, $this->body());
            if (trim($row['source_text']) !== '') throw new RuntimeException('A leitura já foi concluída. Continue pela identificação dos cargos.', 409);
            $revision = (int)$row['revision'] + 1;
            $db->table('notice_import_drafts')->where('notice_id', $id)->update(['revision' => $revision, 'status' => 'reading_processing', 'last_error' => null, 'updated_at' => gmdate('c')]);
            (new ImportJobs())->enqueue($id, $revision, 'reading'); $db->transCommit(); return $this->respond($this->view($id));
        } catch (Throwable $e) { return $this->error($e); }
    }
    public function confirmDocument($id)
    {
        $id = (int)$id; if (!$this->notice($id)) return $this->failNotFound();
        try {
            $db = db_connect(); $db->transException(true)->transBegin(); $this->lock(); $body = $this->body(); $row = $this->checked($id, $body);
            if (($body['confirmed'] ?? null) !== true || trim($row['source_text']) === '') throw new RuntimeException('Confira o PDF e confirme que o programa completo está presente.');
            $db->table('notice_import_drafts')->where('notice_id', $id)->update(['document_confirmed' => true, 'revision' => (int)$row['revision'] + 1, 'updated_at' => gmdate('c')]);
            $db->transCommit(); return $this->respond($this->view($id));
        } catch (Throwable $e) { return $this->error($e); }
    }
    public function resolve($id)
    {
        $id = (int) $id; if (!$this->notice($id)) return $this->failNotFound();
        try {
            $db = db_connect(); $db->transException(true)->transBegin(); $this->lock(); $body = $this->body(); $row = $this->checked($id, $body);
            $inventory = $this->decode($row['inventory']); $content = $this->decode($row['content']);
            if (($body['decision'] ?? '') === 'reopen' && $inventory && $content && ($body['confirmed'] ?? false) === true) {
                $coverage = (new JobImportDocument($row['source_text']))->coverage($inventory, $content);
                $kept = array_values(array_filter($coverage['decisions'], static fn($d) => $d['gap_id'] !== ($body['gap_id'] ?? null)));
                if (count($kept) === count($coverage['decisions'])) throw new RuntimeException('A decisão mudou. Recarregue para continuar.', 409);
                $content['coverage_decisions'] = $kept;
                $db->table('notice_import_drafts')->where('notice_id', $id)->update(['content' => json_encode($content, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), 'revision' => (int)$row['revision'] + 1, 'updated_at' => gmdate('c')]);
                $db->transCommit(); return $this->respond($this->view($id));
            }
            if (!$inventory || !$content || ($body['confirmed'] ?? false) !== true || ($body['decision'] ?? '') !== 'not_applicable'
                || !is_string($body['reason'] ?? null) || mb_strlen(trim($body['reason'])) < 10 || mb_strlen($body['reason']) > 1000) throw new RuntimeException('Confirme a decisão e explique por que o trecho não pertence ao seu cargo.');
            $coverage = (new JobImportDocument($row['source_text']))->coverage($inventory, $content);
            $gap = array_values(array_filter($coverage['pending'], static fn($g) => $g['id'] === ($body['gap_id'] ?? null)));
            if (!$gap) throw new RuntimeException('A pendência mudou. Recarregue para conferir.', 409);
            $content['coverage_decisions'] = array_merge($coverage['decisions'], [['gap_id' => $gap[0]['id'], 'decision' => 'not_applicable', 'reason' => trim($body['reason']), 'decided_at' => gmdate('c')]]);
            $db->table('notice_import_drafts')->where('notice_id', $id)->update(['content' => json_encode($content, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), 'revision' => (int) $row['revision'] + 1, 'updated_at' => gmdate('Y-m-d H:i:sP')]);
            $db->transCommit(); return $this->respond($this->view($id));
        } catch (Throwable $e) { return $this->error($e); }
    }
    private function analyze(int $id, string $stage)
    {
        if (!$this->notice($id)) return $this->failNotFound(); $reserved = null;
        try {
            $body = $this->body(); $db = db_connect(); $db->transException(true)->transBegin(); $this->lock(); $row = $this->checked($id, $body);
            $document = new JobImportDocument($row['source_text']); $inventory = $this->decode($row['inventory']);
            $task = $stage === 'inventory' ? $document->inventoryTask() : ($stage === 'repair' ? $document->repairTask($inventory ?? [], $this->decode($row['content']) ?? []) : $document->contentTask($inventory ?? [], $row['selected_ref'] ?? ''));
            $reserved = (int) $row['revision'] + 1;
            $db->table('notice_import_drafts')->where('notice_id', $id)->update(['revision' => $reserved, 'status' => $stage . '_processing', 'last_error' => null, 'updated_at' => gmdate('Y-m-d H:i:sP')]); $db->transCommit();
            if (!array_key_exists('response', $body)) {
                $db->transException(true)->transBegin(); $this->lock();
                $current = $this->draft($id);
                if ((int)$current['revision'] !== $reserved) throw new RuntimeException('Etapa cancelada ou substituída.', 409);
                (new ImportJobs())->enqueue($id, $reserved, $stage); $db->transCommit(); return $this->respond($this->view($id));
            }
            if (array_key_exists('response', $body)) {
                if (!is_string($body['response'])) throw new RuntimeException('Cole a resposta JSON da IA.');
                $parsed = (new StudyUnitValidator())->json($body['response']); $result = ($task['validate'])($parsed);
            } else $result = (new AiEditalExtractor())->extract($row['source_text'], $task)['structure'];
            $db->transException(true)->transBegin(); $this->lock(); $current = $this->draft($id); $this->emptyCatalog($id);
            if ((int) ($current['revision'] ?? 0) !== $reserved) throw new RuntimeException('A importação mudou enquanto a IA respondia. Recarregue para continuar.', 409);
            $update = [$stage === 'repair' ? 'content' : $stage => json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'status' => $stage === 'repair' ? 'content_ready' : $stage . '_ready', 'last_error' => null, 'updated_at' => gmdate('Y-m-d H:i:sP')];
            if ($stage === 'inventory') $update += ['selected_ref' => null, 'content' => null];
            $db->table('notice_import_drafts')->where('notice_id', $id)->update($update);
            $db->transCommit(); return $this->respond($this->view($id));
        } catch (Throwable $e) {
            db_connect()->transRollback();
            if ($reserved !== null) {
                $current = $this->draft($id);
                if ($current && (int) $current['revision'] === $reserved) db_connect()->table('notice_import_drafts')->where('notice_id', $id)->where('revision', $reserved)->update(['status' => $current['content'] ? 'content_ready' : ($current['inventory'] ? 'inventory_ready' : 'ready'), 'last_error' => $e instanceof RuntimeException ? $e->getMessage() : 'Não foi possível analisar esta etapa. Tente novamente.', 'updated_at' => gmdate('Y-m-d H:i:sP')]);
            }
            return $this->error($e);
        }
    }
    public function apply($id)
    {
        $id = (int) $id; if (!$this->notice($id)) return $this->failNotFound();
        try {
            $db = db_connect(); $db->transException(true)->transBegin(); $this->lock();
            if (($this->draft($id)['status'] ?? '') === 'applied') { $db->transCommit(); return $this->respond(['status' => 'extracted']); }
            $body = $this->body(); $row = $this->checked($id, $body);
            if (($body['confirmed'] ?? null) !== true || !$row['content']) throw new RuntimeException('Confira os trechos antes de importar o conteúdo.');
            $document = new JobImportDocument($row['source_text']); $inventory = $this->decode($row['inventory']);
            if ($document->documentReview()['needs_confirmation'] && !\App\Services\DailyStudyData::boolean($row['document_confirmed'])) throw new RuntimeException('Confirme que este PDF contém o programa completo, incluindo anexos e retificações aplicáveis.', 409);
            $saved = $this->decode($row['content']);
            $content = $document->validateContent($inventory, $row['selected_ref'], $saved);
            $content['coverage_decisions'] = $saved['coverage_decisions'] ?? [];
            if ($document->coverage($inventory, $content)['pending']) throw new RuntimeException('Há trechos do programa pendentes. Corrija ou confira a aplicabilidade antes de importar.', 409);
            $structure = (new EditalStructureValidator())->fromJson(json_encode($document->structure($inventory, $content), JSON_THROW_ON_ERROR));
            (new NoticeStructureWriter())->replace($id, $this->userId(), $structure, $row['selected_ref']);
            (new NoticeModel())->update($id, ['title' => $inventory['title'], 'status' => 'extracted', 'has_study_syllabus' => true, 'extraction_error' => null]);
            (new ExtractionRunModel())->insert(['notice_id' => $id, 'status' => 'completed', 'model' => 'job-scope/source-lines', 'prompt_version' => 'job-lines-v1', 'raw_response' => json_encode(['inventory' => $inventory, 'content' => $content]), 'created_at' => gmdate('Y-m-d H:i:s'), 'finished_at' => gmdate('Y-m-d H:i:s')]);
            $db->table('notice_import_drafts')->where('notice_id', $id)->update(['status' => 'applied', 'revision' => (int) $row['revision'] + 1, 'updated_at' => gmdate('Y-m-d H:i:sP')]);
            $db->transCommit(); return $this->respond(['status' => 'extracted']);
        } catch (Throwable $e) { return $this->error($e); }
    }
}
