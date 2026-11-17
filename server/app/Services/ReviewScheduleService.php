<?php

namespace App\Services;

use DateTimeImmutable;

final class ReviewScheduleService
{
    public const INTERVALS = [1, 7, 16, 35, 90, 180];

    public function initialPosition(int $difficulty): int
    {
        $difficulty = max(0, min(10, $difficulty));
        return min(5, (int) round(((10 - $difficulty) / 10) * 5));
    }

    public function performance(int $correct, int $wrong): string
    {
        $total = $correct + $wrong;
        if ($total <= 0) return 'undefined';
        $rate = $correct / $total;
        return $rate >= .8 ? 'good' : ($rate < .5 ? 'poor' : 'undefined');
    }

    public function transition(int $position, string $performance): int
    {
        return match ($performance) {
            'good' => min(5, $position + 1),
            'poor' => max(0, $position - 1),
            default => max(0, min(5, $position)),
        };
    }

    /** @return array{position:int,nextReviewAt:string} */
    public function afterSession(int $position, int $correct, int $wrong, DateTimeImmutable $studiedAt): array
    {
        $next = $this->transition($position, $this->performance($correct, $wrong));
        return ['position' => $next, 'nextReviewAt' => $studiedAt->modify('+' . self::INTERVALS[$next] . ' days')->format('Y-m-d H:i:s')];
    }
}
