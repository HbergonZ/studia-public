<?php
namespace App\Services;

use Closure;
use JsonException;
use RuntimeException;

final class OpenRouterEditalExtractor
{
    private Closure $transport;
    private Closure $clock;
    private Closure $sleep;
    private Closure $config;

    public function __construct(?callable $transport = null, ?callable $clock = null, ?callable $sleep = null, ?callable $config = null)
    {
        $this->transport = Closure::fromCallable($transport ?? [AiHttpTransport::class, 'request']);
        $this->clock = Closure::fromCallable($clock ?? static fn(): float => hrtime(true) / 1e9);
        $this->sleep = Closure::fromCallable($sleep ?? static fn(float $seconds) => usleep((int) ($seconds * 1e6)));
        $this->config = Closure::fromCallable($config ?? static fn(string $name, mixed $default) => env($name, $default));
    }

    public function extract(string $text, ?float $deadline = null, ?int $attemptLimit = null, ?array $task = null): array
    {
        $deadline ??= ($this->clock)() + $this->integer('OPENROUTER_TOTAL_TIMEOUT_SECONDS', 300, 1, 540);
        $attemptTimeout = min($this->integer('OPENROUTER_ATTEMPT_TIMEOUT_SECONDS', 90, 1, 600), $this->integer('OPENROUTER_TIMEOUT_SECONDS', 600, 1, 600));
        $maxAttempts = $attemptLimit ?? $this->integer('OPENROUTER_MAX_ATTEMPTS', 4, 1, 20);
        $maxTokens = $this->integer('OPENROUTER_MAX_TOKENS', 50000, 1, 200000);
        if ($task) $maxTokens = min($maxTokens, $task['max_tokens']);
        $key = trim((string) ($this->config)('OPENROUTER_API_KEY', ''));
        if ($key === '') {
            throw new OpenRouterExtractionException('OPENROUTER_API_KEY não configurada.', []);
        }
        $url = rtrim((string) ($this->config)('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1/chat/completions'), '/');
        if (!filter_var($url, FILTER_VALIDATE_URL) || parse_url($url, PHP_URL_SCHEME) !== 'https' || !str_ends_with($url, '/chat/completions')) {
            throw new OpenRouterExtractionException('OPENROUTER_BASE_URL deve ser uma URL HTTPS terminada em /chat/completions.', []);
        }
        $schema = $task['schema'] ?? EditalJsonSchema::build();
        $messages = $task['messages'] ?? (new EditalPromptBuilder())->build($text);
        $messages[0]['content'] .= "\nJSON Schema obrigatório: " . json_encode($schema['schema'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        // Estimate Portuguese document tokens with two UTF-8 bytes per token plus framing.
        // The provider still checks its tokenizer; never truncate the source to fit.
        $inputTokens = (int) ceil((strlen(json_encode($messages, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE))
            + strlen(json_encode($schema, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE))) / 2) + 512;
        $headers = ['Authorization: Bearer ' . $key, 'Content-Type: application/json', 'X-OpenRouter-Title: Studia'];
        $catalog = $this->call('GET', substr($url, 0, -strlen('/chat/completions')) . '/models', $headers, null, $deadline, $attemptTimeout);
        if ($catalog['status'] !== 200 || !empty($catalog['error'])) {
            throw new OpenRouterExtractionException('Não foi possível consultar os modelos gratuitos da OpenRouter (HTTP ' . $catalog['status'] . ').', []);
        }
        $decoded = json_decode($catalog['body'], true);
        $models = $this->eligibleModels(is_array($decoded) ? ($decoded['data'] ?? []) : [], $inputTokens, $maxTokens);
        if ($models === []) {
            throw new OpenRouterExtractionException('Nenhum modelo gratuito disponível suporta o tamanho do edital e o formato necessário.', []);
        }
        $attempts = [];
        $queue = [];
        foreach ($models as $id => $model) $queue[] = ['id' => $id, 'model' => $model, 'correction' => null];
        while ($candidate = array_shift($queue)) {
            $id = $candidate['id']; $model = $candidate['model'];
            if (count($attempts) >= $maxAttempts || ($this->clock)() >= $deadline) {
                break;
            }
            $started = ($this->clock)();
            $payload = [
                'model' => $id, 'max_tokens' => $model['output_tokens'],
                'provider' => ['require_parameters' => true, 'max_price' => ['prompt' => 0, 'completion' => 0]],
                'response_format' => in_array('structured_outputs', $model['supported_parameters'], true)
                    ? ['type' => 'json_schema', 'json_schema' => $schema] : ['type' => 'json_object'],
                'messages' => $messages,
            ];
            if ($candidate['correction'] !== null) {
                $payload['messages'][] = ['role' => 'assistant', 'content' => $candidate['correction']['response']];
                $payload['messages'][] = ['role' => 'user', 'content' => 'Corrija o JSON anterior sem alterar os textos nem as referências do documento. Erro de validação: ' . $candidate['correction']['error'] . ' Confira cada start_line <= end_line, o cargo escolhido, as páginas, a cobertura e o schema. Retorne o objeto completo corrigido.'];
            }
            $reasoning = $model['reasoning'];
            if (in_array('reasoning', $model['supported_parameters'], true)
                && ($reasoning['mandatory'] ?? null) !== true
                && (($reasoning['mandatory'] ?? null) === false
                    || in_array('none', $reasoning['supported_efforts'] ?? [], true))) {
                $payload['reasoning'] = ['enabled' => false];
            }
            if (in_array('temperature', $model['supported_parameters'], true)) {
                $payload['temperature'] = 0;
            }
            $response = $this->call('POST', $url, $headers, $payload, $deadline, $attemptTimeout);
            $raw = json_decode($response['body'], true);
            $status = (int) $response['status'];
            $code = $status >= 400 ? $status : (int) ($raw['error']['code'] ?? 0);
            $reason = 'invalid_response';
            $fatal = false;
            $wait = 0.0;
            $result = null;
            $validationError = null;
            if (($this->clock)() >= $deadline) {
                $reason = 'total_timeout';
                $fatal = true;
            } elseif (!empty($response['error'])) {
                $reason = $response['error'] === 'timeout' ? 'timeout' : 'network_error';
            } elseif (in_array($code, [401, 402, 403], true)) {
                $reason = $code === 402 ? 'account_limit' : 'authentication';
                $fatal = true;
            } elseif ($code === 429) {
                [$reason, $fatal, $wait] = $this->rateLimit($response['headers'], is_array($raw) ? $raw : []);
                if ($wait > 30 || $wait >= $deadline - ($this->clock)()) {
                    $fatal = true;
                }
            } elseif ($code >= 400 || $status < 200 || $status >= 300) {
                $reason = 'http_error';
            } elseif (!is_array($raw)) {
                $reason = 'invalid_json';
            } elseif (!is_string($raw['model'] ?? null) || !isset($models[$raw['model']])) {
                $reason = 'unexpected_model';
                $fatal = true;
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
                    } catch (RuntimeException $error) {
                        $reason = 'invalid_structure';
                        $validationError = $task ? $error->getMessage() : $this->safeValidationError($error->getMessage());
                    }
                }
            }
            if (($this->clock)() >= $deadline) {
                $result = null;
                $reason = 'total_timeout';
                $fatal = true;
            }
            $attempts[] = ['provider' => 'openrouter', 'model' => $id, 'status' => $result === null ? 'failed' : 'success',
                'duration_ms' => (int) round((($this->clock)() - $started) * 1000),
                'reason' => $reason, 'code' => $code ?: null, 'http_status' => $status];
            if ($validationError !== null) {
                $attempts[array_key_last($attempts)]['validation_error'] = $validationError;
            }
            if ($result !== null) {
                return ['request_id' => $raw['id'] ?? null, 'model' => $raw['model'], 'structure' => $result, 'raw' => $raw, 'attempts' => $attempts];
            }
            if ($task && $reason === 'invalid_structure' && $candidate['correction'] === null && count($attempts) < $maxAttempts) {
                array_unshift($queue, ['id' => $id, 'model' => $model, 'correction' => ['response' => $output, 'error' => $validationError]]);
            }
            if ($fatal) {
                break;
            }
            if ($wait > 0 && count($attempts) < min($maxAttempts, count($models))) {
                ($this->sleep)($wait);
            }
        }
        $lastReason = $attempts === [] ? 'total_timeout' : $attempts[array_key_last($attempts)]['reason'];
        $message = match ($lastReason) {
            'authentication' => 'A OpenRouter recusou a chave ou o acesso. Verifique a configuração.',
            'account_limit' => 'A OpenRouter informou um limite da conta. Verifique os limites da chave.',
            'platform_rate_limit' => 'A cota da OpenRouter está temporariamente esgotada. Aguarde antes de tentar novamente.',
            'total_timeout' => 'O prazo total da importação foi atingido. Tente novamente ou use a importação manual.',
            'unexpected_model' => 'A OpenRouter retornou um modelo que não foi confirmado como gratuito e compatível.',
            default => 'Nenhum modelo gratuito concluiu uma extração válida dentro dos limites. Tente novamente ou use a importação manual.',
        };
        if ($attempts !== [] && array_unique(array_column($attempts, 'reason')) === ['invalid_structure']) {
            $message = 'Os modelos responderam, mas as respostas não passaram na validação: '
                . $attempts[array_key_last($attempts)]['validation_error'];
        }
        throw new OpenRouterExtractionException($message, $attempts);
    }

    private function safeValidationError(string $message): string
    {
        // Only fixed validator messages may be persisted; never copy document text.
        return in_array($message, [
            'A análise não confirmou a extração completa do edital.',
            'A análise não definiu o tipo de conhecimento de todos os blocos.',
            'A análise deixou um bloco sem aplicabilidade.',
            'A análise retornou aplicabilidade contraditória.',
            'A análise repetiu a aplicabilidade de um bloco.',
            'A análise retornou uma matéria sem tópicos.',
            'A análise sem conteúdo estudável deve justificar a ausência e retornar listas vazias.',
            'A análise deixou uma opção sem conteúdo associado.',
            'A resposta da IA não corresponde aos campos esperados.',
            'A resposta da IA contém uma lista inválida.',
            'A resposta da IA contém texto vazio, inválido ou acima do limite.',
            'Um edital sem conteúdo estudável não pode conter blocos de estudo.',
            'Nenhum conteúdo programático válido foi identificado.',
        ], true) ? $message : 'A estrutura retornada contém campos ou referências inválidos.';
    }

    private function integer(string $name, int $default, int $min, int $max): int
    {
        return max($min, min($max, (int) ($this->config)($name, $default)));
    }

    private function eligibleModels(mixed $catalog, int $inputTokens, int $maxTokens): array
    {
        $models = [];
        foreach (is_array($catalog) ? $catalog : [] as $model) {
            if (!is_array($model)) continue;
            $id = $model['id'] ?? null;
            $prices = $model['pricing'] ?? [];
            $parameters = $model['supported_parameters'] ?? [];
            if (!is_string($id) || !preg_match('~^[a-zA-Z0-9._-]+/[a-zA-Z0-9._:/-]+$~', $id) || str_starts_with($id, 'openrouter/')
                || !is_array($prices) || !isset($prices['prompt'], $prices['completion']) || !is_array($parameters)
                || array_intersect(['response_format', 'structured_outputs'], $parameters) === []
                || !in_array('text', $model['architecture']['input_modalities'] ?? [], true)
                || ($model['architecture']['output_modalities'] ?? []) !== ['text']) continue;
            foreach ($prices as $price) {
                if (!is_numeric($price) || (float) $price !== 0.0) continue 2;
            }
            $context = min((int) ($model['context_length'] ?? 0), (int) ($model['top_provider']['context_length'] ?? $model['context_length'] ?? 0));
            $output = min($maxTokens, (int) ($model['top_provider']['max_completion_tokens'] ?? $maxTokens), $context - $inputTokens);
            if ($output < min(4096, $maxTokens)) continue;
            $reasoning = is_array($model['reasoning'] ?? null) ? $model['reasoning'] : [];
            if (!is_array($reasoning['supported_efforts'] ?? null)) $reasoning['supported_efforts'] = [];
            $models[$id] = ['context' => $context, 'output_tokens' => $output, 'supported_parameters' => $parameters, 'reasoning' => $reasoning];
        }
        uksort($models, static fn(string $a, string $b): int => ($models[$b]['context'] <=> $models[$a]['context']) ?: strcmp($a, $b));
        $preferred = array_merge([(string) ($this->config)('OPENROUTER_MODEL', '')], explode(',', (string) ($this->config)('OPENROUTER_FALLBACK_MODELS', '')));
        $ordered = [];
        foreach ($preferred as $id) {
            $id = trim($id);
            if (isset($models[$id])) $ordered[$id] = $models[$id];
        }
        return $ordered + $models;
    }

    private function rateLimit(array $headers, array $raw): array
    {
        $headers = array_change_key_case($headers, CASE_LOWER);
        $platform = isset($headers['x-ratelimit-limit']) || isset($headers['x-ratelimit-remaining'])
            || ($raw['error']['metadata']['error_type'] ?? null) === 'rate_limit_exceeded';
        $retry = $headers['retry-after'] ?? null;
        $wait = is_numeric($retry) ? max(0.0, (float) $retry) : (is_string($retry) ? max(0, (strtotime($retry) ?: time()) - time()) : 0);
        $provider = isset($raw['error']['metadata']['provider_name']) || isset($raw['error']['metadata']['provider_code']);
        if (!$platform && !$provider && $wait <= 0) {
            return ['platform_rate_limit', true, 0.0];
        }
        if ($platform) {
            $reset = $headers['x-ratelimit-reset'] ?? null;
            if (is_numeric($reset)) {
                $reset = (float) $reset;
                if ($reset > 1e11) $reset /= 1000;
                $wait = max($wait, $reset - time());
            }
            // An unknown platform reset may be a daily quota: do not rotate models blindly.
            return ['platform_rate_limit', $wait <= 0, $wait];
        }
        return ['provider_rate_limit', false, $wait > 0 ? $wait : 1.0];
    }

    private function call(string $method, string $url, array $headers, ?array $payload, float $deadline, int $attemptTimeout): array
    {
        $remaining = min((float) $attemptTimeout, $deadline - ($this->clock)());
        if ($remaining <= 0) return ['status' => 0, 'headers' => [], 'body' => '', 'error' => 'timeout'];
        return ($this->transport)($method, $url, $headers, $payload, max(1, (int) floor($remaining * 1000)));
    }

}
