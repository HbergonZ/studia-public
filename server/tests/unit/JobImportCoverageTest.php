<?php
namespace Tests\Unit;
use App\Services\JobImportDocument;
use CodeIgniter\Test\CIUnitTestCase;
use RuntimeException;

final class JobImportCoverageTest extends CIUnitTestCase
{
    private function sample(): array
    {
        $d = new JobImportDocument("[[PAGE 1]]\nPERFIL 3: Software\nPERFIL 4: Dados\n[[PAGE 2]]\nPERFIL 3: SOFTWARE\nProgramacao de sistemas e desenvolvimento de software.\n[[PAGE 3]]\nGestao e governanca de tecnologia da informacao.\nGerenciamento de projetos e processos usando BPMN.\nPERFIL 4: DADOS\nOutro programa de conhecimento exclusivo do perfil quatro.");
        $v = $d->validateInventory(['title' => 'Selecao', 'has_study_syllabus' => true, 'options' => [['ref' => '3', 'code' => '3', 'name' => 'Software', 'kind' => 'profile', 'level' => null, 'source_line' => 2, 'general_expected' => false, 'specific_expected' => true], ['ref' => '4', 'code' => '4', 'name' => 'Dados', 'kind' => 'profile', 'level' => null, 'source_line' => 3, 'general_expected' => false, 'specific_expected' => true]], 'syllabus_pages' => [2,3], 'warnings' => []]);
        $c = $d->validateContent($v, '3', ['option_ref' => '3', 'complete' => true, 'sections' => [['name' => 'Software', 'knowledge_type' => 'specific', 'start_line' => 5, 'end_line' => 6, 'evidence_line' => 5]], 'warnings' => []]);
        return [$d, $v, $c];
    }
    public function testTailAcrossPagesIsPendingAndOtherJobIsExcluded(): void
    {
        [$d,$v,$c] = $this->sample(); $review = $d->coverage($v, $c);
        $this->assertSame('needs_attention', $review['status']);
        $this->assertCount(1, $review['pending']);
        $this->assertSame([8,9], [$review['pending'][0]['start_line'], $review['pending'][0]['end_line']]);
        $this->assertStringNotContainsString('perfil quatro', $review['pending'][0]['source']);
    }
    public function testRepairKeepsAcceptedSourceAndCannotWriteOutsideGap(): void
    {
        [$d,$v,$c] = $this->sample(); $task = $d->repairTask($v, $c);
        $response = ['option_ref' => '3', 'complete' => true, 'sections' => [['name' => 'Governanca', 'knowledge_type' => 'specific', 'start_line' => 8, 'end_line' => 9, 'evidence_line' => 5]], 'warnings' => []];
        $fixed = ($task['validate'])($response);
        $this->assertSame($c['sections'][0], $fixed['sections'][0]);
        $this->assertSame('ready_for_review', $d->coverage($v, $fixed)['status']);
        $response['sections'][0]['end_line'] = 11;
        $this->expectException(RuntimeException::class); ($task['validate'])($response);
    }
    public function testDecisionOnlyResolvesMatchingOriginalGap(): void
    {
        [$d,$v,$c] = $this->sample(); $gap = $d->coverage($v, $c)['pending'][0];
        $c['coverage_decisions'] = [['gap_id' => 'forged', 'decision' => 'not_applicable', 'reason' => 'Outro cargo']];
        $this->assertSame('needs_attention', $d->coverage($v, $c)['status']);
        $c['coverage_decisions'][0]['gap_id'] = $gap['id'];
        $this->assertSame('ready_for_review', $d->coverage($v, $c)['status']);
    }
    public function testRepairCannotLeaveAShortFinalContinuationBehind(): void
    {
        [$d,$v,$c] = $this->sample();
        $task = $d->repairTask($v, $c);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('cortou parte');
        ($task['validate'])(['option_ref' => '3', 'complete' => true, 'sections' => [['name' => 'Incompleto', 'knowledge_type' => 'specific', 'start_line' => 8, 'end_line' => 8, 'evidence_line' => 5]]]);
    }
    public function testPageFootersAloneAreNotPending(): void
    {
        [$d,$v,$c] = $this->sample(); $c['sections'][0]['end_line'] = 9;
        $this->assertSame([], $d->coverage($v, $c)['pending']);
    }
    public function testInternalGapAcrossPagesIsPending(): void
    {
        [$d,$v,$c] = $this->sample();
        $c['sections'][] = ['name' => 'Ultimo', 'knowledge_type' => 'specific', 'start_line' => 9, 'end_line' => 9, 'evidence_line' => 5];
        $gaps = $d->coverage($v, $c)['pending'];
        $this->assertCount(1, $gaps); $this->assertSame(8, $gaps[0]['start_line']);
    }
}
