<?php
namespace Tests\Unit;

use App\Services\{AiEditalExtractor,OpenRouterExtractionException};
use CodeIgniter\Test\CIUnitTestCase;

final class AiEditalExtractorTest extends CIUnitTestCase
{
    private function config(array $values = []): callable
    {
        return static fn($name, $default) => ($values + ['GEMINI_API'=>'gemini-test', 'OPENROUTER_API_KEY'=>'router-test'])[$name] ?? $default;
    }

    private function failGemini(): never
    {
        throw new OpenRouterExtractionException('A cota do Gemini está esgotada.', [['provider'=>'gemini','reason'=>'rate_limit']]);
    }

    public function testGeminiFirstAndNoOpenRouterRequestOnSuccess(): void
    {
        $expected = ['model'=>'gemini-3.6-flash','attempts'=>[['provider'=>'gemini','reason'=>'success']]];
        $extractor = new AiEditalExtractor($this->config(), fn()=>10.0, function($text,$deadline,$timeout) use($expected) {
            $this->assertSame('Documento integral', $text);
            $this->assertSame(310.0, $deadline);
            $this->assertSame(90, $timeout);
            return $expected;
        }, fn()=>$this->fail('OpenRouter não deve ser consultado após sucesso.'));
        $this->assertSame($expected, $extractor->extract('Documento integral'));
    }

    public function testFallbackRetainsDeadlineRemainingAttemptsAndHistory(): void
    {
        $now = 10.0;
        $extractor = new AiEditalExtractor($this->config(), function() use(&$now) { return $now; },
            function() use(&$now) { $now += 85; $this->failGemini(); },
            function($text,$deadline,$remaining) {
                $this->assertSame(310.0,$deadline);
                $this->assertSame(3,$remaining);
                return ['model'=>'vendor/free','attempts'=>[['provider'=>'openrouter','reason'=>'success']]];
            });
        $result = $extractor->extract('Documento');
        $this->assertSame(['gemini','openrouter'],array_column($result['attempts'],'provider'));
    }

    public function testExhaustedBudgetDoesNotStartAnotherProvider(): void
    {
        $extractor = new AiEditalExtractor($this->config(['OPENROUTER_MAX_ATTEMPTS'=>1]), fn()=>10.0,
            fn()=>$this->failGemini(), fn()=>$this->fail('Limite de tentativas excedido.'));
        $this->expectException(OpenRouterExtractionException::class);
        $this->expectExceptionMessage('A cota do Gemini');
        $extractor->extract('Documento');
    }

    public function testTotalDeadlineDoesNotRestartAtFallback(): void
    {
        $now=10.0;
        $extractor = new AiEditalExtractor($this->config(['OPENROUTER_TOTAL_TIMEOUT_SECONDS'=>20]), function() use(&$now) { return $now; },
            function() use(&$now) { $now=30; $this->failGemini(); }, fn()=>$this->fail('Prazo esgotado.'));
        $this->expectExceptionMessage('O prazo total');
        $extractor->extract('Documento');
    }

    public function testOpenRouterWorksWithoutGeminiKey(): void
    {
        $extractor = new AiEditalExtractor($this->config(['GEMINI_API'=>'']), fn()=>10.0,
            fn()=>$this->fail('Gemini sem chave.'), function($text,$deadline,$remaining) {
                $this->assertSame(4,$remaining);
                return ['attempts'=>[['provider'=>'openrouter']]];
            });
        $this->assertSame('openrouter',$extractor->extract('Documento')['attempts'][0]['provider']);
    }

    public function testBothProviderFailuresPreserveAttempts(): void
    {
        $extractor = new AiEditalExtractor($this->config(), fn()=>10.0, fn()=>$this->failGemini(),
            fn()=>throw new OpenRouterExtractionException('Falha OpenRouter.', [['provider'=>'openrouter','reason'=>'authentication']]));
        try { $extractor->extract('Documento'); $this->fail('Esperava falha.'); }
        catch(OpenRouterExtractionException $e) {
            $this->assertCount(2,$e->getAttempts());
            $this->assertSame('Falha OpenRouter.',$e->getMessage());
        }
    }

    public function testGeminiOnlyFailureDoesNotRequireRouterKey(): void
    {
        $extractor = new AiEditalExtractor($this->config(['OPENROUTER_API_KEY'=>'']), fn()=>10.0,
            fn()=>$this->failGemini(), fn()=>$this->fail('OpenRouter sem chave.'));
        $this->expectExceptionMessage('A cota do Gemini');
        $extractor->extract('Documento');
    }

    public function testMissingKeysHaveClearMessage(): void
    {
        $extractor = new AiEditalExtractor($this->config(['GEMINI_API'=>'','OPENROUTER_API_KEY'=>'']));
        $this->expectExceptionMessage('Configure GEMINI_API ou OPENROUTER_API_KEY');
        $extractor->extract('Documento');
    }
}
