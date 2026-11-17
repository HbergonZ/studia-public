<?php
// Revalidate a named live run against the current rules. Never calls an AI provider.
if (PHP_SAPI !== 'cli' || !preg_match('/^[a-zA-Z0-9_-]+$/', $argv[1] ?? '')) exit(2);
define('FCPATH', dirname(__DIR__, 2) . '/public/'); define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development');
chdir(FCPATH); require FCPATH . '../app/Config/Paths.php'; $paths = new Config\Paths(); require $paths->systemDirectory . '/Boot.php'; CodeIgniter\Boot::bootConsole($paths);
$directory = WRITEPATH . 'testing/live-job-import/' . $argv[1] . '/'; $output = [];
foreach (['gemini','openrouter'] as $provider) {
    foreach (json_decode(file_get_contents($directory . "$provider-results.json"), true) as $entry) {
        $stem = pathinfo($entry['file'], PATHINFO_FILENAME);
        $targeted = $directory . "$provider-$stem-results.json";
        if (is_file($targeted)) $entry = json_decode(file_get_contents($targeted), true)[0];
        $review = ['provider' => $provider, 'file' => $entry['file'], 'status' => $entry['status']];
        if (!in_array($entry['status'], ['passed','needs_attention','passed_no_syllabus'], true)) { $review['reason'] = $entry['error'] ?? 'Falha no provedor'; $output[] = $review; continue; }
        try {
            $text = file_get_contents(WRITEPATH . 'testing/live-ai-editais/' . $stem . '-source.txt');
            $d = new App\Services\JobImportDocument($text);
            $inventory = $d->validateInventory(json_decode(file_get_contents($directory . "$provider-$stem-inventory.json"), true)['structure']);
            if ($entry['status'] !== 'passed_no_syllabus') {
                $content = json_decode(file_get_contents($directory . "$provider-$stem-content.json"), true)['structure'];
                $validated = $d->validateContent($inventory, $content['option_ref'], $content);
                $coverage = $d->coverage($inventory, $validated);
                $structure = $d->structure($inventory, $validated);
                (new App\Services\EditalStructureValidator())->fromJson(json_encode($structure));
                $review['status'] = $coverage['pending'] ? 'needs_attention' : 'ready_for_human_review';
                $review['pending'] = count($coverage['pending']); $review['units'] = (new App\Services\StudyUnitValidator())->summary($structure)['units'];
            }
        } catch (Throwable $e) { $review['status'] = 'rejected'; $review['reason'] = $e->getMessage(); }
        $output[] = $review;
    }
}
file_put_contents($directory . 'final-review.json', json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
foreach ($output as $entry) echo json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
