<?php
if (PHP_SAPI !== 'cli' || !in_array($argv[1] ?? '', ['gemini','openrouter'], true)) exit(2);
define('FCPATH', dirname(__DIR__, 2) . '/public/'); define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development');
chdir(FCPATH); require FCPATH . '../app/Config/Paths.php'; $paths = new Config\Paths(); require $paths->systemDirectory . '/Boot.php'; CodeIgniter\Boot::bootConsole($paths);
$provider = $argv[1];
$config = static fn($name, $default) => ($provider === 'gemini' && $name === 'OPENROUTER_API_KEY') || ($provider === 'openrouter' && $name === 'GEMINI_API') ? '' : env($name, $default);
$run = getenv('STUDIA_LIVE_RUN') ?: '';
if ($run !== '' && !preg_match('/^[a-zA-Z0-9_-]+$/', $run)) exit(2);
$directory = WRITEPATH . 'testing/live-job-import/' . ($run !== '' ? $run . '/' : ''); if (!is_dir($directory)) mkdir($directory, 0700, true);
$cases = [
    ['file' => 'ilovepdf_merged (1)', 'name' => 'Enfermeiro', 'code' => '725'],
    ['file' => 'edital3', 'name' => 'Tecnologia da Informação', 'code' => '08'],
    ['file' => 'edital-retificado-dataprev', 'name' => 'Desenvolvimento de Software', 'code' => '3'],
    ['file' => 'edital2', 'name' => 'Assistente Administrativo', 'code' => ''],
    ['file' => 'edital4', 'name' => 'Sem programa de conhecimentos', 'code' => '', 'no_syllabus' => true],
    ['file' => 'edital5', 'name' => 'Estat', 'code' => 'B2-01-A'],
];
if (isset($argv[3])) $cases = array_values(array_filter($cases, static fn($case) => $argv[3] === 'remaining' ? in_array($case['file'], ['edital-retificado-dataprev', 'edital2', 'edital4', 'edital5'], true) : $case['file'] === $argv[3]));
if (!$cases) { fwrite(STDERR, "No matching sample.\n"); exit(2); }
$reportName = $provider . (isset($argv[3]) ? '-' . basename($argv[3]) : '');
$reports = [];
foreach ($cases as $case) {
    $started = hrtime(true); $entry = ['provider' => $provider, 'file' => $case['file'] . '.pdf', 'cargo' => $case['name']];
    echo 'START ' . json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
    try {
        if (getenv('STUDIA_LIVE_PDFS')) {
            $reading = (new App\Services\PdfReading())->read(getenv('STUDIA_LIVE_PDFS') . '/' . $case['file'] . '.pdf');
            $text = $reading['text']; $entry['physicalPages'] = $reading['reading']['total_pages'];
            $entry['ocrPages'] = count(array_filter($reading['reading']['pages'], static fn($p) => $p['method'] === 'ocr'));
        } else $text = file_get_contents(WRITEPATH . 'testing/live-ai-editais/' . $case['file'] . '-source.txt');
        $document = new App\Services\JobImportDocument($text);
        $callNumber = 0;
        $runner = static function ($text, $deadline, $budget, $task) use ($provider, $config, $directory, $case, &$callNumber) {
            $transport = static function ($method, $url, $headers, $payload, $timeout) use ($provider, $directory, $case, &$callNumber, $task) {
                $response = App\Services\AiHttpTransport::request($method, $url, $headers, $payload, $timeout);
                if ($method === 'POST') {
                    $raw = json_decode($response['body'], true); $content = $raw['choices'][0]['message']['content'] ?? null;
                    echo 'CALL ' . ($payload['model'] ?? '') . ' HTTP ' . $response['status'] . ' ' . ($raw['choices'][0]['finish_reason'] ?? '') . "\n";
                    if (is_string($content)) {
                        file_put_contents($directory . $provider . '-' . $case['file'] . '-raw-' . ++$callNumber . '.json', $content);
                        try { ($task['validate'])(json_decode((string) preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($content)), true)); }
                        catch (Throwable $e) { echo 'VALIDATION ' . $e->getMessage() . "\n"; }
                    }
                }
                return $response;
            };
            return $provider === 'gemini'
                ? (new App\Services\GeminiEditalExtractor(transport: $transport, config: $config))->extract($text, $deadline, $budget, $task)
                : (new App\Services\OpenRouterEditalExtractor(transport: $transport, config: $config))->extract($text, $deadline, $budget, $task);
        };
        $ai = new App\Services\AiEditalExtractor(config: $config, gemini: $runner, openRouter: $runner);
        $inventory = null;
        if (($argv[2] ?? '') === 'reuse') {
            $savedPath = $directory . $provider . '-' . $case['file'] . '-inventory.json';
            if (is_file($savedPath)) {
                $saved = json_decode(file_get_contents($savedPath), true);
                try { $inventory = ['structure' => $document->validateInventory($saved['structure']), 'attempts' => [], 'source' => 'captured response revalidated']; } catch (Throwable) {}
            }
            $candidates = glob($directory . $provider . '-' . $case['file'] . '-raw-*.json');
            foreach ($candidates as $candidate) {
                if ($inventory) break;
                $saved = json_decode(file_get_contents($candidate), true);
                if (!isset($saved['options'], $saved['syllabus_pages'])) continue;
                try { $inventory = ['structure' => $document->validateInventory($saved), 'attempts' => [], 'source' => 'captured response revalidated']; break; } catch (Throwable) {}
            }
        }
        $inventory ??= $ai->extract($text, $document->inventoryTask());
        $entry['inventorySource'] = $inventory['source'] ?? 'live API';
        file_put_contents($directory . $provider . '-' . $case['file'] . '-inventory.json', json_encode($inventory, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $entry['inventoryAttempts'] = $inventory['attempts']; $entry['options'] = count($inventory['structure']['options']);
        if (isset($case['no_syllabus'])) {
            if ($inventory['structure']['has_study_syllabus']) throw new RuntimeException('Este exemplo não possui programa de conhecimentos; o inventário diverge da referência.');
            $entry += ['status' => 'passed_no_syllabus', 'warnings' => $inventory['structure']['warnings']];
        } else {
        if (!$inventory['structure']['has_study_syllabus']) throw new RuntimeException('O exemplo possui conteúdo programático, mas o inventário informou ausência.');
        $selected = null;
        foreach ($inventory['structure']['options'] as $option) if (str_contains(mb_strtolower($option['name']), mb_strtolower($case['name'])) && str_contains((string) $option['code'], $case['code'])) { $selected = $option; break; }
        if (!$selected) throw new RuntimeException('O cargo esperado não foi identificado.');
        echo 'SELECTED ' . $selected['name'] . "\n";
        $task = $document->contentTask($inventory['structure'], $selected['ref']);
        $entry['targetInputCharacters'] = mb_strlen($task['messages'][1]['content']); $entry['fullInputCharacters'] = mb_strlen($document->numbered());
        $content = $ai->extract($text, $task);
        if ($run !== '') {
            $review = $document->coverage($inventory['structure'], $content['structure']);
            $entry['pendingBeforeRepair'] = count($review['pending']);
            if ($review['pending']) {
                file_put_contents($directory . $provider . '-' . $case['file'] . '-initial-content.json', json_encode($content, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                try {
                    $fixed = $ai->extract($text, $document->repairTask($inventory['structure'], $content['structure']));
                    $entry['repairAttempts'] = $fixed['attempts']; $content = $fixed;
                } catch (Throwable $repairError) { $entry['repairError'] = $repairError->getMessage(); }
            }
            $entry['pendingAfterRepair'] = count($document->coverage($inventory['structure'], $content['structure'])['pending']);
        }
        file_put_contents($directory . $provider . '-' . $case['file'] . '-content.json', json_encode($content, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $structure = $document->structure($inventory['structure'], $content['structure']);
        (new App\Services\EditalStructureValidator())->fromJson(json_encode($structure));
        file_put_contents($directory . $provider . '-' . $case['file'] . '-structure.json', json_encode($structure, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $entry += ['status' => ($entry['pendingAfterRepair'] ?? 0) > 0 ? 'needs_attention' : 'passed', 'units' => (new App\Services\StudyUnitValidator())->summary($structure)['units'], 'contentAttempts' => $content['attempts'], 'sections' => array_map(static fn($s) => ['name' => $s['name'], 'type' => $s['knowledge_type'], 'pages' => [$s['page_start'],$s['page_end']], 'characters' => mb_strlen($s['source'])], $content['structure']['sections'])];
        $entry['selected'] = ['name' => $selected['name'], 'code' => $selected['code'], 'ref' => $selected['ref']];
        }
    } catch (Throwable $error) {
        $entry += ['status' => 'failed', 'error' => $error->getMessage(), 'attempts' => $error instanceof App\Services\OpenRouterExtractionException ? $error->getAttempts() : []];
    }
    $entry['seconds'] = round((hrtime(true) - $started) / 1e9, 2); $reports[] = $entry;
    file_put_contents($directory . $reportName . '-results.json', json_encode($reports, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
}
