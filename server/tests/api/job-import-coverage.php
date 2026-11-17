<?php
// Offline regression against captured live responses. No provider calls.
if (PHP_SAPI !== 'cli') exit(2);
define('FCPATH', dirname(__DIR__, 2) . '/public/'); define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development');
chdir(FCPATH); require FCPATH . '../app/Config/Paths.php'; $paths = new Config\Paths(); require $paths->systemDirectory . '/Boot.php'; CodeIgniter\Boot::bootConsole($paths);
$directory = WRITEPATH . 'testing/live-job-import/';
foreach (['edital-retificado-dataprev', 'edital5', 'ilovepdf_merged (1)', 'edital3'] as $stem) {
    $provider = $stem === 'edital3' ? 'gemini' : 'openrouter';
    $d = new App\Services\JobImportDocument(file_get_contents(WRITEPATH . 'testing/live-ai-editais/' . $stem . '-source.txt'));
    $inventory = json_decode(file_get_contents($directory . "$provider-$stem-inventory.json"), true)['structure'];
    $content = json_decode(file_get_contents($directory . "$provider-$stem-content.json"), true)['structure'];
    $coverage = $d->coverage($inventory, $content);
    echo json_encode(['file' => $stem, 'status' => $coverage['status'], 'gaps' => array_map(static fn($g) => ['from' => $g['start_line'], 'to' => $g['end_line'], 'text' => mb_substr($g['source'], 0, 170)], $coverage['pending'])], JSON_UNESCAPED_UNICODE) . "\n";
    if (in_array($stem, ['edital-retificado-dataprev','edital5'], true) && !$coverage['pending']) throw new RuntimeException('Known omission was not detected: ' . $stem);
    file_put_contents($directory . "$stem-coverage.json", json_encode($coverage, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
