<?php
namespace App\Services;

use Closure;

/** Coordinates providers using one deadline and one attempt budget. */
final class AiEditalExtractor
{
    private Closure $config;
    private Closure $clock;
    private Closure $gemini;
    private Closure $openRouter;

    public function __construct(?callable $config = null, ?callable $clock = null, ?callable $gemini = null, ?callable $openRouter = null)
    {
        $this->config = Closure::fromCallable($config ?? static fn($name, $default) => env($name, $default));
        $this->clock = Closure::fromCallable($clock ?? static fn(): float => hrtime(true) / 1e9);
        $this->gemini = Closure::fromCallable($gemini ?? fn($text, $deadline, $timeout, $task = null) =>
            (new GeminiEditalExtractor(clock: $this->clock, config: $this->config))->extract($text, $deadline, $timeout, $task));
        $this->openRouter = Closure::fromCallable($openRouter ?? fn($text, $deadline, $remaining, $task = null) =>
            (new OpenRouterEditalExtractor(clock: $this->clock, config: $this->config))->extract($text, $deadline, $remaining, $task));
    }

    public function extract(string $text, ?array $task = null): array
    {
        // Validate document limits before contacting either provider.
        (new EditalPromptBuilder())->build($text);
        $deadline = ($this->clock)() + max(1, min(540, (int) ($this->config)('OPENROUTER_TOTAL_TIMEOUT_SECONDS', 300)));
        $maxAttempts = max(1, min(20, (int) ($this->config)('OPENROUTER_MAX_ATTEMPTS', 4)));
        $timeout = max(1, min(600, (int) ($this->config)('OPENROUTER_ATTEMPT_TIMEOUT_SECONDS', 90),
            (int) ($this->config)('OPENROUTER_TIMEOUT_SECONDS', 600)));
        $attempts = [];
        $lastError = null;
        if (trim((string) ($this->config)('GEMINI_API', '')) !== '') {
            try {
                return ($this->gemini)($text, $deadline, $timeout, $task);
            } catch (OpenRouterExtractionException $error) {
                $attempts = $error->getAttempts();
                $lastError = $error->getMessage();
            }
        }
        if (($this->clock)() >= $deadline) {
            throw new OpenRouterExtractionException('O prazo total da importação foi atingido. Tente novamente ou use a importação manual.', $attempts);
        }
        if (count($attempts) < $maxAttempts && trim((string) ($this->config)('OPENROUTER_API_KEY', '')) !== '') {
            try {
                $result = ($this->openRouter)($text, $deadline, $maxAttempts - count($attempts), $task);
                $result['attempts'] = array_merge($attempts, $result['attempts']);
                return $result;
            } catch (OpenRouterExtractionException $error) {
                $attempts = array_merge($attempts, $error->getAttempts());
                $lastError = $error->getMessage();
            }
        }
        throw new OpenRouterExtractionException($lastError ?? 'Configure GEMINI_API ou OPENROUTER_API_KEY para analisar o edital.', $attempts);
    }
}
