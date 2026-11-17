<?php

// Opt-in live provider test. Uses configured credentials without printing them.
if (PHP_SAPI !== 'cli' || !in_array($argv[1] ?? '', ['gemini', 'openrouter'], true) || !is_dir($argv[2] ?? '')) {
    fwrite(STDERR, "Usage: php tests/api/live-ai-editais.php gemini|openrouter PDF_DIRECTORY\n");
    exit(2);
}
define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development');
chdir(FCPATH);
require FCPATH . '../app/Config/Paths.php';
$paths = new Config\Paths();
require $paths->systemDirectory . '/Boot.php';
CodeIgniter\Boot::bootConsole($paths);

$provider = $argv[1];
$directory = realpath($argv[2]);
$output = WRITEPATH . 'testing/live-ai-editais/';
if (!is_dir($output)) mkdir($output, 0700, true);
$files = glob($directory . '/*.pdf');
if (isset($argv[3])) $files = array_values(array_filter($files, static fn($file) => basename($file) === $argv[3]));
if (!$files) throw new RuntimeException('Nenhum PDF corresponde ao teste solicitado.');
usort($files, static fn($a, $b) => ((basename($a) !== 'ilovepdf_merged (1).pdf') <=> (basename($b) !== 'ilovepdf_merged (1).pdf')) ?: strcmp($a, $b));
$secrets = array_filter([(string) env('GEMINI_API', ''), (string) env('OPENROUTER_API_KEY', '')]);
$redact = static fn(string $value): string => str_replace($secrets, '[REDACTED]', $value);
$overrideModel = $argv[4] ?? null;
$modelSetting = $provider === 'gemini' ? 'GEMINI_MODEL' : 'OPENROUTER_MODEL';
$config = static fn($name, $default) => $name === $modelSetting && $overrideModel ? $overrideModel : env($name, $default);
$runName = $provider . ($overrideModel ? '-' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $overrideModel) : '') . (isset($argv[3]) ? '-single' : '');
$report = ['provider' => $provider, 'startedAt' => gmdate('c'), 'configuration' => [
    'keyPresent' => trim((string) env($provider === 'gemini' ? 'GEMINI_API' : 'OPENROUTER_API_KEY', '')) !== '',
    'preferredModel' => $config($provider === 'gemini' ? 'GEMINI_MODEL' : 'OPENROUTER_MODEL', ''),
    'attemptSeconds' => env('OPENROUTER_ATTEMPT_TIMEOUT_SECONDS', 90),
    'totalSeconds' => env('OPENROUTER_TOTAL_TIMEOUT_SECONDS', 300),
], 'results' => []];
$write = static function () use (&$report, $output, $runName): void {
    file_put_contents($output . $runName . '-results.json', json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
};
echo json_encode($report['configuration'], JSON_UNESCAPED_UNICODE) . "\n";
foreach ($files as $file) {
    $name = basename($file);
    $stem = $runName . '-' . pathinfo($name, PATHINFO_FILENAME);
    echo "START $provider: $name\n";
    $started = hrtime(true);
    $calls = [];
    $entry = ['file' => $name, 'sha256' => hash_file('sha256', $file), 'startedAt' => gmdate('c')];
    $transport = static function ($method, $url, $headers, $payload, $timeout) use (&$calls, $redact, $output, $stem) {
        if ($method === 'POST') echo 'CALL ' . ($payload['model'] ?? '') . "\n";
        $response = App\Services\AiHttpTransport::request($method, $url, $headers, $payload, $timeout);
        $raw = json_decode($response['body'], true);
        if ($method === 'POST') {
            $calls[] = ['model' => $payload['model'] ?? null, 'httpStatus' => $response['status'], 'transportError' => $response['error'],
                'finishReason' => $raw['choices'][0]['finish_reason'] ?? null, 'usage' => $raw['usage'] ?? null,
                'providerError' => isset($raw['error']['message']) ? mb_substr($redact((string) $raw['error']['message']), 0, 1000) : null,
                'errorExcerpt' => $response['status'] >= 400 ? mb_substr($redact($response['body']), 0, 2000) : null];
            echo 'HTTP ' . $response['status'] . ' ' . ($response['error'] ?? '') . "\n";
            $content = $raw['choices'][0]['message']['content'] ?? null;
            if (is_string($content)) file_put_contents($output . $stem . '-response-' . count($calls) . '.txt', $redact($content));
        }
        return $response;
    };
    try {
        $text = (new App\Services\PdfTextExtractor())->extract($file);
        $entry['characters'] = mb_strlen($text);
        preg_match_all('/\[\[PAGE \d+\]\]/', $text, $pages);
        $entry['pagesWithText'] = count($pages[0]);
        file_put_contents($output . pathinfo($name, PATHINFO_FILENAME) . '-source.txt', $text);
        (new App\Services\EditalPromptBuilder())->build($text);
        $extractor = $provider === 'gemini'
            ? new App\Services\GeminiEditalExtractor(transport: $transport, config: $config)
            : new App\Services\OpenRouterEditalExtractor(transport: $transport, config: $config);
        $result = $provider === 'gemini'
            ? $extractor->extract($text, hrtime(true) / 1e9 + (int) env('OPENROUTER_TOTAL_TIMEOUT_SECONDS', 300), (int) env('OPENROUTER_ATTEMPT_TIMEOUT_SECONDS', 90))
            : $extractor->extract($text);
        $structure = $result['structure'];
        file_put_contents($output . $stem . '-structure.json', json_encode($structure, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        $subjects = $topics = 0;
        foreach ($structure['groups'] as $group) {
            $subjects += count($group['subjects']);
            foreach ($group['subjects'] as $subject) $topics += count($subject['topics']);
        }
        $entry += ['status' => 'passed', 'model' => $result['model'], 'hasStudySyllabus' => $structure['has_study_syllabus'],
            'title' => $structure['title'], 'options' => count($structure['options']), 'groups' => count($structure['groups']),
            'subjects' => $subjects, 'topics' => $topics, 'warnings' => $structure['warnings'], 'attempts' => $result['attempts']];
    } catch (Throwable $error) {
        $entry += ['status' => 'failed', 'error' => $redact($error->getMessage()),
            'attempts' => $error instanceof App\Services\OpenRouterExtractionException ? $error->getAttempts() : []];
    }
    $entry['calls'] = $calls;
    $entry['durationSeconds'] = round((hrtime(true) - $started) / 1e9, 2);
    $report['results'][] = $entry;
    $write();
    echo json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
}
$report['finishedAt'] = gmdate('c');
$write();
echo "DONE $provider: " . count($files) . " PDFs\n";
