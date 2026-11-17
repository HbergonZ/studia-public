<?php
namespace Tests\Unit;

use App\Services\GeminiEditalExtractor;
use App\Services\OpenRouterExtractionException;
use CodeIgniter\Test\CIUnitTestCase;

final class GeminiEditalExtractorTest extends CIUnitTestCase
{
    private float $now = 0;
    private array $calls = [];

    private function response(mixed $content = null, string $finish = 'stop'): array
    {
        $content ??= ['title' => 'Edital NAV Brasil', 'has_study_syllabus' => false, 'extraction_complete' => true,
            'options' => [], 'groups' => [], 'warnings' => ['Seleção exclusivamente por títulos e experiência.']];
        return ['status' => 200, 'body' => json_encode(['id' => 'google-request', 'model' => 'gemini-3.6-flash',
            'choices' => [['finish_reason' => $finish, 'message' => ['content' => is_string($content) ? $content : json_encode($content)]]]]),
            'error' => null, 'headers' => []];
    }

    private function extractor(array $response, array $config = []): GeminiEditalExtractor
    {
        return new GeminiEditalExtractor(function ($method, $url, $headers, $payload, $timeout) use ($response) {
            $this->calls[] = compact('method', 'url', 'headers', 'payload', 'timeout');
            $this->now += $response['elapsed'] ?? 0;
            return $response;
        }, fn() => $this->now, static fn($key, $default) => ($config + ['GEMINI_API' => 'test-key'])[$key] ?? $default);
    }

    public function testValidatesStructuredResponseAndPreservesWholeInput(): void
    {
        $text = str_repeat('Documento completo. ', 20000);
        $result = $this->extractor($this->response())->extract($text, 300, 90);
        $this->assertFalse($result['structure']['has_study_syllabus']);
        $this->assertSame('success', $result['attempts'][0]['reason']);
        $this->assertSame('gemini', $result['attempts'][0]['provider']);
        $call = $this->calls[0];
        $this->assertSame('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', $call['url']);
        $this->assertSame(['Authorization: Bearer test-key', 'Content-Type: application/json'], $call['headers']);
        $this->assertSame('json_schema', $call['payload']['response_format']['type']);
        $this->assertTrue($call['payload']['response_format']['json_schema']['strict']);
        $this->assertStringContainsString($text, json_encode($call['payload']['messages'], JSON_UNESCAPED_UNICODE));
        $this->assertSame(90000, $call['timeout']);
        $this->assertArrayNotHasKey('provider', $call['payload']);
    }

    public function testUsesConfiguredModelAndCapsOutputAndRemainingTime(): void
    {
        $this->extractor($this->response(), ['GEMINI_MODEL' => 'gemini-2.5-flash-lite', 'OPENROUTER_MAX_TOKENS' => 200000])->extract('Texto', 4.25, 90);
        $this->assertSame('gemini-2.5-flash-lite', $this->calls[0]['payload']['model']);
        $this->assertSame(65536, $this->calls[0]['payload']['max_tokens']);
        $this->assertSame(4250, $this->calls[0]['timeout']);
    }

    public function testRejectsInvalidTruncatedAndIncompleteResults(): void
    {
        foreach ([[$this->response('{'), 'invalid_json'], [$this->response([]), 'invalid_structure'],
            [$this->response(null, 'length'), 'truncated'], [$this->response(null, 'content_filter'), 'incomplete']] as [$response, $reason]) {
            try {
                $this->extractor($response)->extract('Texto', 300, 90);
                $this->fail('Invalid response must not be accepted');
            } catch (OpenRouterExtractionException $error) {
                $this->assertSame($reason, $error->getAttempts()[0]['reason']);
            }
        }
    }

    public function testProviderFailuresExposeOnlySafeDiagnostics(): void
    {
        foreach ([401 => 'authentication', 403 => 'authentication', 429 => 'provider_rate_limit', 503 => 'http_error'] as $status => $reason) {
            try {
                $this->extractor(['status' => $status, 'body' => '{"error":{"message":"SECRET"}}', 'error' => null])->extract('Texto', 300, 90);
                $this->fail('Provider failure must be returned to coordinator');
            } catch (OpenRouterExtractionException $error) {
                $this->assertSame($reason, $error->getAttempts()[0]['reason']);
                $this->assertStringNotContainsString('SECRET', $error->getMessage() . json_encode($error->getAttempts()));
            }
        }
    }

    public function testTimeoutAndLateSuccessAreRejected(): void
    {
        foreach ([[['status' => 0, 'body' => '', 'error' => 'timeout'], 'timeout'],
            [$this->response() + ['elapsed' => 5], 'total_timeout']] as [$response, $reason]) {
            $this->now = 0;
            try {
                $this->extractor($response)->extract('Texto', 5, 90);
                $this->fail('Expired extraction must fail');
            } catch (OpenRouterExtractionException $error) {
                $this->assertSame($reason, $error->getAttempts()[0]['reason']);
            }
        }
    }

    public function testMissingKeyOrExpiredDeadlineDoNotSendRequest(): void
    {
        foreach ([['GEMINI_API' => ''], ['GEMINI_MODEL' => '../invalid'], []] as $config) {
            try {
                $this->extractor($this->response(), $config)->extract('Texto', 0, 90);
                $this->fail('Invalid configuration must fail');
            } catch (OpenRouterExtractionException $error) {
                $this->assertSame([], $error->getAttempts());
            }
        }
        $this->assertSame([], $this->calls);
    }
}
