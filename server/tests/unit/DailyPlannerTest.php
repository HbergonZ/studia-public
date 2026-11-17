<?php
namespace Tests\Unit;
use App\Services\DailyPlanner;
use CodeIgniter\Test\CIUnitTestCase;

final class DailyPlannerTest extends CIUnitTestCase
{
    private function topics(int $count = 30): array
    {
        return array_map(static fn ($i) => ['id' => (string) $i, 'subjectId' => (string) ($i % 3), 'weight' => 5, 'weeklyMinutes' => 0, 'nextReviewAt' => null, 'continuation' => false], range(1, $count));
    }
    public function testLargeNoticeFitsTwoHoursIncludingBreaks(): void
    {
        $engine = new DailyPlanner();
        $blocks = $engine->suggest($this->topics(), '2026-10-15', 120, 0, 25, 5);
        $this->assertCount(4, $blocks);
        $this->assertSame(115, $engine->reservedMinutes($blocks, 5));
        $this->assertCount(4, array_unique(array_column($blocks, 'topicId')));
    }
    public function testZeroAvailabilityAndShortRemainingTime(): void
    {
        $engine = new DailyPlanner();
        $this->assertSame([], $engine->suggest($this->topics(), '2026-10-15', 0, 0, 25, 5));
        $this->assertSame([], $engine->suggest($this->topics(), '2026-10-15', 60, 57, 25, 5));
        $blocks = $engine->suggest($this->topics(), '2026-10-15', 60, 50, 25, 5);
        $this->assertCount(1, $blocks);
        $this->assertSame(10, $blocks[0]['minutes']);
    }
    public function testOverdueBacklogDoesNotExcludeAllNewContent(): void
    {
        $topics = $this->topics();
        for ($i = 0; $i < 20; $i++) $topics[$i]['nextReviewAt'] = '2026-10-01 00:00:00';
        $blocks = (new DailyPlanner())->suggest($topics, '2026-10-15', 120, 0, 25, 5);
        $this->assertStringContainsString('vencida', $blocks[0]['reason']);
        $this->assertStringContainsString('vencida', $blocks[1]['reason']);
        $this->assertStringContainsString('Avançar', $blocks[2]['reason']);
    }
    public function testFutureReviewsDoNotBecomeTodaysWork(): void
    {
        $topics = $this->topics(1); $topics[0]['nextReviewAt'] = '2026-11-01';
        $this->assertSame([], (new DailyPlanner())->suggest($topics, '2026-10-15', 120, 0, 25, 5));
    }
    public function testUnitsFollowTheirContentOrderInsteadOfLexicalIds(): void
    {
        $topics = $this->topics(2);
        $topics[0] = array_replace($topics[0], ['id'=>'99','order'=>0,'subjectId'=>'1']);
        $topics[1] = array_replace($topics[1], ['id'=>'100','order'=>1,'subjectId'=>'1']);
        $blocks = (new DailyPlanner())->suggest($topics, '2026-10-15', 60, 0, 25, 5);
        $this->assertSame(['99','100'], array_column($blocks,'topicId'));
    }
    public function testOriginalSourcesStayOutOfNewSuggestions(): void
    {
        $topics = $this->topics(2); $topics[0]['isSource'] = true;
        $blocks = (new DailyPlanner())->suggest($topics, '2026-10-15', 60, 0, 25, 5);
        $this->assertSame([$topics[1]['id']], array_column($blocks,'topicId'));
    }
    public function testWorkReservedInAnEarlierPlanIsNotRepeatedAutomatically(): void
    {
        $topics = $this->topics(2); $topics[0]['plannedEarlier'] = true;
        $blocks = (new DailyPlanner())->suggest($topics, '2026-10-16', 120, 0, 25, 5);
        $this->assertCount(1, $blocks);
        $this->assertSame($topics[1]['id'], $blocks[0]['topicId']);
    }
    public function testContinuationAndSubjectRotation(): void
    {
        $topics = $this->topics(); $topics[8]['continuation'] = true;
        $blocks = (new DailyPlanner())->suggest($topics, '2026-10-15', 90, 0, 25, 5);
        $this->assertSame($topics[8]['id'], $blocks[0]['topicId']);
        $this->assertStringContainsString('Continuar', $blocks[0]['reason']);
        $ids = array_column($topics, 'subjectId', 'id');
        $this->assertCount(3, array_unique(array_map(static fn ($b) => $ids[$b['topicId']], $blocks)));
    }
    public function testDeferredBlocksFreeTimeWithoutDeletingCompletions(): void
    {
        $engine = new DailyPlanner();
        $this->assertSame(55, $engine->reservedMinutes([['minutes' => 25, 'status' => 'completed'], ['minutes' => 25, 'status' => 'planned'], ['minutes' => 25, 'status' => 'deferred']], 5));
    }
}
