<?php
namespace App\Services;

use Closure;
use JsonException;
use RuntimeException;

final class GeminiEditalExtractor
{
    private Closure $transport;
    private Closure $clock;
    private Closure $config;

    public function __construct(?callable $transport = null, ?callable $clock = null, ?callable $config = null)
    {
        $this->transport = Closure::fromCallable($transport ?? [AiHttpTransport::class, 'request']);
        $this->clock = Closure::fromCallable($clock ?? static fn(): float => hrtime(true) / 1e9);
        $this->config = Closure::fromCallable($config ?? static fn(string $name, mixed $default) => env($name, $default));
    }

    public function extract(string $text, float $deadline, int $attemptTimeout, ?array $task = null): array
    {
        $key = trim((string) ($this->config)('GEMINI_API', ''));
        if ($key === '') throw new OpenRouterExtractionException('GEMINI_API não configurada.', []);
        $model = trim((string) ($this->config)('GEMINI_MODEL', 'gemini-3.6-flash'));
        if (!preg_match('/^gemini-[a-zA-Z0-9._-]+$/D', $model)) {
            throw new OpenRouterExtractionException('GEMINI_MODEL inválido.', []);
        }
        $started = ($this->clock)();
        $remaining = min((float) $attemptTimeout, $deadline - $started);
        if ($remaining <= 0) throw new OpenRouterExtractionException('O prazo total da importação foi atingido.', []);
        $schema = $task['schema'] ?? EditalJsonSchema::build();
        $messages = $task['messages'] ?? (new EditalPromptBuilder())->build($text);
        $messages[0]['content'] .= "\nJSON Schema obrigatório: " . json_encode($schema['schema'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $payload = ['model' => $model, 'messages' => $messages,
            'max_tokens' => max(1, min(65536, $task['max_tokens'] ?? 65536, (int) ($this->config)('OPENROUTER_MAX_TOKENS', 50000))),
            'response_format' => ['type' => 'json_schema', 'json_schema' => $schema]];
        if ($task) $payload['reasoning_effort'] = 'low';
        $remaining = min((float) $attemptTimeout, $deadline - ($this->clock)());
        if ($remaining <= 0) throw new OpenRouterExtractionException('O prazo total da importação foi atingido.', []);
        $response = ($this->transport)('POST', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            ['Authorization: Bearer ' . $key, 'Content-Type: application/json'], $payload, max(1, (int) floor($remaining * 1000)));
        $raw = json_decode($response['body'], true);
        $status = (int) $response['status'];
        $reason = 'invalid_response';
        $result = null;
        if (($this->clock)() >= $deadline) {
            $reason = 'total_timeout';
        } elseif (!empty($response['error'])) {
            $reason = $response['error'] === 'timeout' ? 'timeout' : 'network_error';
        } elseif (in_array($status, [401, 403], true)) {
            $reason = 'authentication';
        } elseif ($status === 429) {
            $reason = 'provider_rate_limit';
        } elseif ($status < 200 || $status >= 300 || isset($raw['error'])) {
            $reason = 'http_error';
        } elseif (!is_array($raw)) {
            $reason = 'invalid_json';
        } elseif (($raw['choices'][0]['finish_reason'] ?? null) === 'length') {
            $reason = 'truncated';
        } elseif (($raw['choices'][0]['finish_reason'] ?? null) !== 'stop') {
            $reason = 'incomplete';
        } else {
            $output = $raw['choices'][0]['message']['content'] ?? null;
            if (is_string($output) && trim($output) !== '') {
                try {
                    $parsed = json_decode((string) preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($output)), true, 512, JSON_THROW_ON_ERROR);
                    $result = $task ? ($task['validate'])($parsed) : (new EditalStructureValidator())->validateAutomatic($parsed);
                    $reason = 'success';
                } catch (JsonException) {
                    $reason = 'invalid_json';
                } catch (RuntimeException) {
                    $reason = 'invalid_structure';
                }
            }
        }
        if (($this->clock)() >= $deadline) {
            $result = null;
            $reason = 'total_timeout';
        }
        $attempts = [['provider' => 'gemini', 'model' => $model, 'status' => $result === null ? 'failed' : 'success',
            'duration_ms' => (int) round((($this->clock)() - $started) * 1000), 'reason' => $reason,
            'code' => $status >= 400 ? $status : null, 'http_status' => $status]];
        if ($result !== null) {
            return ['request_id' => $raw['id'] ?? null, 'model' => $model, 'structure' => $result, 'raw' => $raw, 'attempts' => $attempts];
        }
        $message = match ($reason) {
            'authentication' => 'O Gemini recusou a chave ou o acesso. Verifique a configuração.',
            'provider_rate_limit' => 'A cota do Gemini está temporariamente esgotada.',
            'timeout', 'total_timeout' => 'O Gemini não concluiu a análise no prazo disponível.',
            'invalid_structure' => 'A resposta do Gemini não passou na validação do edital.',
            default => 'O Gemini não concluiu uma extração válida.',
        };
        throw new OpenRouterExtractionException($message, $attempts);
    }
}
