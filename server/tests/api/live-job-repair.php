<?php
// Opt-in real calls for localized correction; preserves the original failed captures.
if (PHP_SAPI !== 'cli' || !in_array($argv[1] ?? '', ['gemini','openrouter'], true)) exit(2);
define('FCPATH', dirname(__DIR__, 2) . '/public/'); define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development');
chdir(FCPATH); require FCPATH . '../app/Config/Paths.php'; $paths = new Config\Paths(); require $paths->systemDirectory . '/Boot.php'; CodeIgniter\Boot::bootConsole($paths);
$provider = $argv[1];
$config = static fn($name, $default) => ($provider === 'gemini' && $name === 'OPENROUTER_API_KEY') || ($provider === 'openrouter' && $name === 'GEMINI_API') ? '' : env($name, $default);
$directory = WRITEPATH . 'testing/live-job-import/'; $reports = [];
foreach (['edital-retificado-dataprev','edital5'] as $stem) {
    $started = hrtime(true); $entry = ['provider' => $provider, 'file' => $stem . '.pdf'];
    echo 'START ' . json_encode($entry) . "\n";
    try {
        $text = file_get_contents(WRITEPATH . 'testing/live-ai-editais/' . $stem . '-source.txt');
        $document = new App\Services\JobImportDocument($text);
        $inventory = json_decode(file_get_contents($directory . "openrouter-$stem-inventory.json"), true)['structure'];
        $content = json_decode(file_get_contents($directory . "openrouter-$stem-content.json"), true)['structure'];
        $task = $document->repairTask($inventory, $content);
        $entry['inputCharacters'] = mb_strlen($task['messages'][1]['content']);
        $entry['pendingBefore'] = count($document->coverage($inventory, $content)['pending']);
        $result = (new App\Services\AiEditalExtractor(config: $config))->extract($text, $task);
        $entry['pendingAfter'] = count($document->coverage($inventory, $result['structure'])['pending']);
        $entry['status'] = $entry['pendingAfter'] === 0 ? 'repaired' : 'still_pending';
        $entry['attempts'] = $result['attempts'];
        if (array_slice($result['structure']['sections'], 0, count($content['sections'])) !== $content['sections']) throw new RuntimeException('Accepted sections changed.');
        file_put_contents($directory . "$provider-$stem-repair.json", json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    } catch (Throwable $e) {
        $entry['status'] = 'failed'; $entry['error'] = $e->getMessage();
        $entry['attempts'] = $e instanceof App\Services\OpenRouterExtractionException ? $e->getAttempts() : [];
    }
    $entry['seconds'] = round((hrtime(true) - $started) / 1e9, 2); $reports[] = $entry;
    file_put_contents($directory . "$provider-repair-results.json", json_encode($reports, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
}
