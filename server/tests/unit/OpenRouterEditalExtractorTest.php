<?php
namespace Tests\Unit;

use App\Services\OpenRouterEditalExtractor;
use App\Services\OpenRouterExtractionException;
use CodeIgniter\Test\CIUnitTestCase;

final class OpenRouterEditalExtractorTest extends CIUnitTestCase
{
    private float $now = 0;
    private array $calls = [];
    private array $sleeps = [];

    private function model(string $id, array $overrides = []): array
    {
        return array_replace_recursive(['id' => $id, 'pricing' => ['prompt' => '0', 'completion' => '0'],
            'context_length' => 200000, 'top_provider' => ['max_completion_tokens' => 8192],
            'supported_parameters' => ['structured_outputs'],
            'architecture' => ['input_modalities' => ['text'], 'output_modalities' => ['text']]], $overrides);
    }

    private function response(string $model, mixed $content = null, string $finish = 'stop'): array
    {
        $content ??= ['title' => 'Edital 2026', 'has_study_syllabus' => true, 'extraction_complete' => true,
            'options' => [], 'groups' => [['ref' => 'g', 'name' => 'Conhecimentos', 'knowledge_type' => 'general',
                'applies_to_all' => true, 'applicability' => [], 'subjects' => [['name' => 'Português', 'topics' => ['Interpretação']]]]], 'warnings' => []];
        return ['status' => 200, 'headers' => [], 'body' => json_encode(['id' => 'req-1', 'model' => $model,
            'choices' => [['finish_reason' => $finish, 'message' => ['content' => is_string($content) ? $content : json_encode($content)]]]]), 'error' => null];
    }

    private function extractor(array $responses, array $models = [], array $config = []): OpenRouterEditalExtractor
    {
        $models = $models ?: [$this->model('vendor/a:free'), $this->model('vendor/b:free')];
        array_unshift($responses, ['status' => 200, 'headers' => [], 'body' => json_encode(['data' => $models]), 'error' => null]);
        return new OpenRouterEditalExtractor(function ($method, $url, $headers, $payload, $timeout) use (&$responses) {
            $this->calls[] = compact('method', 'url', 'payload', 'timeout');
            $response = array_shift($responses);
            $this->assertNotNull($response, 'Unexpected request');
            $this->now += $response['elapsed'] ?? 0;
            return $response;
        }, fn() => $this->now, function ($seconds) { $this->sleeps[] = $seconds; $this->now += $seconds; },
            static fn($name, $default) => (['OPENROUTER_API_KEY' => 'test-key'] + $config)[$name] ?? $default);
    }

    public function testRetriesInvalidJsonAndRecordsActualModel(): void
    {
        $result = $this->extractor([$this->response('vendor/a:free', '{'), $this->response('vendor/b:free')])->extract('Documento');
        $this->assertSame('vendor/b:free', $result['model']);
        $this->assertSame(['invalid_json', 'success'], array_column($result['attempts'], 'reason'));
        $this->assertSame('https://openrouter.ai/api/v1/models', $this->calls[0]['url']);
        $this->assertSame(8192, $this->calls[1]['payload']['max_tokens']);
        $this->assertSame(['prompt' => 0, 'completion' => 0], $this->calls[1]['payload']['provider']['max_price']);
        $this->assertArrayNotHasKey('reasoning', $this->calls[1]['payload']);
        $this->assertArrayNotHasKey('temperature', $this->calls[1]['payload']);
    }

    public function testRetriesTruncatedAndInvalidStructure(): void
    {
        $models = [$this->model('vendor/a:free'), $this->model('vendor/b:free'), $this->model('vendor/c:free')];
        $result = $this->extractor([$this->response('vendor/a:free', null, 'length'), $this->response('vendor/b:free', []), $this->response('vendor/c:free')], $models)->extract('Texto');
        $this->assertSame(['truncated', 'invalid_structure', 'success'], array_column($result['attempts'], 'reason'));
    }

    public function testScopedTaskRepairsOnceWithValidationFeedback(): void
    {
        $task = ['max_tokens' => 1000,
            'messages' => [['role' => 'user', 'content' => 'Locate the selected job in numbered lines.']],
            'schema' => ['name' => 'location', 'schema' => ['type' => 'object']],
            'validate' => static function (array $value): array {
                if (($value['start'] ?? 0) > ($value['end'] ?? 0)) {
                    throw new \RuntimeException('Invalid range: start exceeds end.');
                }
                return $value;
            }];
        $result = $this->extractor([
            $this->response('vendor/a:free', ['start' => 8, 'end' => 2]),
            $this->response('vendor/a:free', ['start' => 2, 'end' => 8]),
        ])->extract('Document', null, 2, $task);
        $this->assertSame(['invalid_structure', 'success'], array_column($result['attempts'], 'reason'));
        $this->assertSame('vendor/a:free', $this->calls[2]['payload']['model']);
        $this->assertSame('assistant', $this->calls[2]['payload']['messages'][1]['role']);
        $this->assertStringContainsString('Invalid range: start exceeds end.', $this->calls[2]['payload']['messages'][2]['content']);
        $this->assertSame(1000, $this->calls[2]['payload']['max_tokens']);
        $this->assertSame(['start' => 2, 'end' => 8], $result['structure']);
    }

    public function testExcludesChargedRouterAndSmallContextModels(): void
    {
        $models = [$this->model('vendor/paid', ['pricing' => ['request' => '.001']]), $this->model('openrouter/free'),
            $this->model('vendor/audio', ['architecture' => ['output_modalities' => ['text', 'audio']]]),
            $this->model('vendor/small', ['context_length' => 100]), $this->model('vendor/b:free')];
        $result = $this->extractor([$this->response('vendor/b:free')], $models)->extract('Texto');
        $this->assertSame('vendor/b:free', $result['model']);
        $this->assertCount(2, $this->calls);
    }

    public function testPreferredModelsKeepOrderAndJsonOnlyUsesJsonObject(): void
    {
        $models = [$this->model('vendor/a:free'), $this->model('vendor/b:free', ['supported_parameters' => ['response_format']])];
        $result = $this->extractor([$this->response('vendor/b:free')], $models, ['OPENROUTER_MODEL' => 'vendor/paid', 'OPENROUTER_FALLBACK_MODELS' => 'vendor/b:free,vendor/a:free'])->extract('Texto');
        $this->assertSame('vendor/b:free', $result['model']);
        $this->assertSame(['type' => 'json_object'], $this->calls[1]['payload']['response_format']);
    }

    public function testAuthenticationAndUnknownPlatformQuotaStopImmediately(): void
    {
        foreach ([401, 402, 403, 429] as $status) {
            $this->calls = [];
            $response = ['status' => $status, 'headers' => [], 'body' => json_encode(['error' => ['metadata' => ['error_type' => 'rate_limit_exceeded']]]), 'error' => null];
            try { $this->extractor([$response])->extract('Texto'); $this->fail('Expected failure'); }
            catch (OpenRouterExtractionException $e) { $this->assertCount(1, $e->getAttempts()); }
            $this->assertCount(2, $this->calls);
        }
    }

    public function testRespectsRetryAfterBeforeNextModel(): void
    {
        $response = ['status' => 429, 'headers' => ['Retry-After' => '2'], 'body' => '{}', 'error' => null];
        $result = $this->extractor([$response, $this->response('vendor/b:free')])->extract('Texto');
        $this->assertSame([2.0], $this->sleeps);
        $this->assertSame('vendor/b:free', $result['model']);
    }

    public function testRetryAfterBeyondBudgetDoesNotSleepOrRetry(): void
    {
        $response = ['status' => 429, 'headers' => ['retry-after' => '10'], 'body' => '{}', 'error' => null];
        try { $this->extractor([$response], [], ['OPENROUTER_TOTAL_TIMEOUT_SECONDS' => 5])->extract('Texto'); $this->fail('Expected failure'); }
        catch (OpenRouterExtractionException $e) { $this->assertCount(1, $e->getAttempts()); }
        $this->assertSame([], $this->sleeps);
        $this->assertCount(2, $this->calls);
    }

    public function testDeadlineIncludesCatalogAndCapsRequestTimeout(): void
    {
        $response = $this->response('vendor/a:free');
        $response['elapsed'] = 6;
        try { $this->extractor([$response], [], ['OPENROUTER_TOTAL_TIMEOUT_SECONDS' => 5])->extract('Texto'); $this->fail('Expected failure'); }
        catch (OpenRouterExtractionException $e) { $this->assertSame('total_timeout', $e->getAttempts()[0]['reason']); }
        $this->assertSame(5000, $this->calls[1]['timeout']);
        $this->assertCount(2, $this->calls);
    }

    public function testMaxAttemptsLimitsFallback(): void
    {
        try { $this->extractor([$this->response('vendor/a:free', '{')], [], ['OPENROUTER_MAX_ATTEMPTS' => 1])->extract('Texto'); $this->fail('Expected failure'); }
        catch (OpenRouterExtractionException $e) { $this->assertCount(1, $e->getAttempts()); }
        $this->assertCount(2, $this->calls);
    }

    public function testRejectsUnexpectedPaidReturnedModel(): void
    {
        try { $this->extractor([$this->response('vendor/paid')])->extract('Texto'); $this->fail('Expected failure'); }
        catch (OpenRouterExtractionException $e) { $this->assertSame('unexpected_model', $e->getAttempts()[0]['reason']); }
        $this->assertCount(2, $this->calls);
    }

    public function testNetworkTimeoutAndUnavailableModelAllowFallback(): void
    {
        foreach ([['status' => 0, 'error' => 'timeout'], ['status' => 503, 'error' => null]] as $failure) {
            $this->calls = [];
            $result = $this->extractor([$failure + ['headers' => [], 'body' => ''], $this->response('vendor/b:free')])->extract('Texto');
            $this->assertSame('vendor/b:free', $result['model']);
            $this->assertCount(2, $result['attempts']);
        }
    }

    public function testLegacyTimeoutAndShortOutputLimitAreHonored(): void
    {
        $result = $this->extractor([$this->response('vendor/a:free')], [$this->model('vendor/a:free', ['top_provider' => ['max_completion_tokens' => 4096]])],
            ['OPENROUTER_TIMEOUT_SECONDS' => 7])->extract('Texto');
        $this->assertSame('vendor/a:free', $result['model']);
        $this->assertSame(7000, $this->calls[1]['timeout']);
        $this->assertSame(4096, $this->calls[1]['payload']['max_tokens']);
        $this->assertStringContainsString('JSON Schema obrigatório', $this->calls[1]['payload']['messages'][0]['content']);
    }

    public function testDailyResetDoesNotRotateOrSleep(): void
    {
        $response = ['status' => 429, 'headers' => ['x-ratelimit-remaining' => '0', 'x-ratelimit-reset' => (string) ((time() + 86400) * 1000)], 'body' => '{}', 'error' => null];
        try { $this->extractor([$response])->extract('Texto'); $this->fail('Expected failure'); }
        catch (OpenRouterExtractionException $e) { $this->assertSame('platform_rate_limit', $e->getAttempts()[0]['reason']); }
        $this->assertSame([], $this->sleeps);
        $this->assertCount(2, $this->calls);
    }

    public function testUnknownRateLimitWithoutRetryHintStops(): void
    {
        $response = ['status' => 429, 'headers' => [], 'body' => '{}', 'error' => null];
        try { $this->extractor([$response])->extract('Texto'); $this->fail('Expected failure'); }
        catch (OpenRouterExtractionException $e) { $this->assertSame('platform_rate_limit', $e->getAttempts()[0]['reason']); }
        $this->assertSame([], $this->sleeps);
        $this->assertCount(2, $this->calls);
    }

    public function testExplicitProviderRateLimitWaitsAndFallsBack(): void
    {
        $response = ['status' => 429, 'headers' => [], 'body' => json_encode(['error' => ['metadata' => ['provider_code' => 429]]]), 'error' => null];
        $result = $this->extractor([$response, $this->response('vendor/b:free')])->extract('Texto');
        $this->assertSame('vendor/b:free', $result['model']);
        $this->assertSame([1.0], $this->sleeps);
    }

    public function testOptionalGenerationFlagsAreOnlySentWhenSupported(): void
    {
        $models = [$this->model('vendor/a:free', ['supported_parameters' => ['structured_outputs', 'reasoning', 'temperature'], 'reasoning' => ['mandatory' => false]])];
        $this->extractor([$this->response('vendor/a:free')], $models)->extract('Texto');
        $this->assertSame(['enabled' => false], $this->calls[1]['payload']['reasoning']);
        $this->assertSame(0, $this->calls[1]['payload']['temperature']);
    }

    public function testDoesNotDisableMandatoryOrUnknownReasoning(): void
    {
        foreach ([[], ['mandatory' => true], ['mandatory' => true, 'supported_efforts' => ['none']], ['supported_efforts' => ['high', 'low']], ['supported_efforts' => null]] as $reasoning) {
            $this->calls = [];
            $models = [$this->model('vendor/a:free', ['supported_parameters' => ['structured_outputs', 'reasoning'], 'reasoning' => $reasoning])];
            $this->extractor([$this->response('vendor/a:free')], $models)->extract('Texto');
            $this->assertArrayNotHasKey('reasoning', $this->calls[1]['payload']);
        }
    }

    public function testDisablesReasoningWhenNoneEffortExplicitlySupported(): void
    {
        $models = [$this->model('vendor/a:free', ['supported_parameters' => ['structured_outputs', 'reasoning'], 'reasoning' => ['supported_efforts' => ['low', 'none']]])];
        $this->extractor([$this->response('vendor/a:free')], $models)->extract('Texto');
        $this->assertSame(['enabled' => false], $this->calls[1]['payload']['reasoning']);
    }

    public function testReportsValidationFailureInsteadOfClaimingTimeout(): void
    {
        try {
            $this->extractor([$this->response('vendor/a:free', []), $this->response('vendor/b:free', [])])->extract('Texto');
            $this->fail('Expected failure');
        } catch (OpenRouterExtractionException $error) {
            $this->assertStringContainsString('não passaram na validação', $error->getMessage());
            $this->assertSame('A resposta da IA não corresponde aos campos esperados.', $error->getAttempts()[0]['validation_error']);
        }
    }

    public function testRecordsSafeValidationErrorBeforeSuccessfulFallback(): void
    {
        $result = $this->extractor([$this->response('vendor/a:free', []), $this->response('vendor/b:free')])->extract('Texto privado');
        $this->assertSame('A resposta da IA não corresponde aos campos esperados.', $result['attempts'][0]['validation_error']);
        $this->assertArrayNotHasKey('validation_error', $result['attempts'][1]);
        $this->assertStringNotContainsString('Texto privado', json_encode($result['attempts']));
    }

    public function testLongPortugueseDocumentFitsContextAndIsSentInFull(): void
    {
        $text = str_repeat('Seleção pública: experiência profissional e análise de títulos. ', 4700)
            . "\nFIM INTEGRAL DO DOCUMENTO";
        $this->assertGreaterThan(290000, mb_strlen($text));
        $models = [$this->model('vendor/a:free', ['context_length' => 262144])];
        $result = $this->extractor([$this->response('vendor/a:free')], $models)->extract($text);
        $this->assertSame('vendor/a:free', $result['model']);
        $userMessage = $this->calls[1]['payload']['messages'][1]['content'];
        $this->assertStringContainsString($text, $userMessage);
        $this->assertStringEndsWith('FIM INTEGRAL DO DOCUMENTO', $userMessage);
        $this->assertSame(8192, $this->calls[1]['payload']['max_tokens']);
    }

    public function testAcceptsCompleteDocumentWithoutStudySyllabus(): void
    {
        $structure = ['title' => 'Seleção por títulos 2025', 'has_study_syllabus' => false,
            'extraction_complete' => true, 'options' => [], 'groups' => [],
            'warnings' => ['A seleção utiliza títulos e experiência profissional, sem prova de conhecimentos.']];
        $result = $this->extractor([$this->response('vendor/a:free', $structure)])->extract('Seleção exclusivamente por títulos e experiência profissional.');
        $this->assertSame($structure, $result['structure']);
        $this->assertSame('success', $result['attempts'][0]['reason']);
        $this->assertCount(2, $this->calls);
    }
}
