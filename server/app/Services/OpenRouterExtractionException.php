<?php
namespace App\Services;

use RuntimeException;

final class OpenRouterExtractionException extends RuntimeException
{
    public function __construct(string $message, private readonly array $attempts)
    {
        parent::__construct($message);
    }

    public function getAttempts(): array
    {
        return $this->attempts;
    }
}
