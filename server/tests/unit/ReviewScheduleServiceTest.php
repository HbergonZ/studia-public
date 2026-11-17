<?php

namespace Tests\Unit;

use App\Services\ReviewScheduleService;
use CodeIgniter\Test\CIUnitTestCase;
use DateTimeImmutable;

final class ReviewScheduleServiceTest extends CIUnitTestCase
{
    private ReviewScheduleService $service;
    protected function setUp(): void { parent::setUp(); $this->service = new ReviewScheduleService(); }

    public function testPerformanceThresholds(): void
    {
        $this->assertSame('good', $this->service->performance(8, 2));
        $this->assertSame('poor', $this->service->performance(4, 6));
        $this->assertSame('undefined', $this->service->performance(7, 3));
        $this->assertSame('undefined', $this->service->performance(0, 0));
    }

    public function testTransitionIsAppliedOnlyOnceAndClamped(): void
    {
        $this->assertSame(3, $this->service->transition(2, 'good'));
        $this->assertSame(5, $this->service->transition(5, 'good'));
        $this->assertSame(0, $this->service->transition(0, 'poor'));
    }

    public function testNextReviewUsesNewPosition(): void
    {
        $result = $this->service->afterSession(0, 8, 2, new DateTimeImmutable('2026-08-30 00:00:00'));
        $this->assertSame(1, $result['position']);
        $this->assertSame('2026-09-06 00:00:00', $result['nextReviewAt']);
    }
}
