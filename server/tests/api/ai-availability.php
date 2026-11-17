<?php
// Explicit, small real-provider probe. No documents, credentials or raw responses are printed.
if (PHP_SAPI !== 'cli') exit(2);
define('FCPATH', dirname(__DIR__, 2) . '/public/'); define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development');
chdir(FCPATH); require FCPATH . '../app/Config/Paths.php'; $paths = new Config\Paths(); require $paths->systemDirectory . '/Boot.php'; CodeIgniter\Boot::bootConsole($paths);
$task = ['max_tokens' => 128, 'messages' => [['role' => 'system', 'content' => 'Retorne somente o JSON {"ok":true}.'], ['role' => 'user', 'content' => 'Teste de disponibilidade.']],
    'schema' => ['name' => 'availability', 'strict' => true, 'schema' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean']], 'required' => ['ok'], 'additionalProperties' => false]],
    'validate' => static function ($value) { if (($value['ok'] ?? false) !== true) throw new RuntimeException('Resposta de teste inválida.'); return $value; }];
$reports = [];
foreach (['gemini','openrouter'] as $provider) {
    $config = static fn($name, $default) => match ($name) {
        'OPENROUTER_MAX_ATTEMPTS' => 1, 'OPENROUTER_TOTAL_TIMEOUT_SECONDS' => 25, 'OPENROUTER_ATTEMPT_TIMEOUT_SECONDS' => 20,
        'GEMINI_API' => $provider === 'openrouter' ? '' : env($name, $default),
        'OPENROUTER_API_KEY' => $provider === 'gemini' ? '' : env($name, $default),
        default => env($name, $default),
    };
    $entry = ['provider' => $provider]; $started = hrtime(true);
    try {
        $result = (new App\Services\AiEditalExtractor(config: $config))->extract('Teste de disponibilidade.', $task);
        $entry += ['available' => true, 'model' => $result['model'], 'attempts' => $result['attempts']];
    } catch (Throwable $e) {
        $entry += ['available' => false, 'message' => $e->getMessage(), 'attempts' => $e instanceof App\Services\OpenRouterExtractionException ? $e->getAttempts() : []];
    }
    $entry['seconds'] = round((hrtime(true) - $started) / 1e9, 2); $reports[] = $entry;
    echo json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
}
file_put_contents(WRITEPATH . 'testing/ai-availability.json', json_encode($reports, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
