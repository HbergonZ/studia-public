<?php
namespace Tests\Unit;
use App\Services\{StudyUnitSplitter, StudyUnitValidator};
use CodeIgniter\Test\CIUnitTestCase;
final class StudyUnitSplitterTest extends CIUnitTestCase
{
    public function testLongSourceIsSplitWithoutLossOrDuplicatedTitles(): void
    {
        $source = str_repeat('Lei 8.080/1990: princípios e diretrizes do SUS, com seus conceitos e exemplos. ', 5)
            . str_repeat('Biossegurança, prevenção e saúde do trabalhador. ', 8);
        $result = (new StudyUnitSplitter())->split('Programa', $source);
        $this->assertGreaterThan(1, count($result['units']));
        $validator = new StudyUnitValidator();
        $this->assertSame($validator->normalized($source), $validator->normalized(implode('', array_column($result['units'], 'source'))));
        $this->assertCount(count($result['units']), array_unique(array_column($result['units'], 'title')));
    }
    public function testNoSafeBoundaryKeepsTheOriginalAsOneUnit(): void
    {
        $source = str_repeat('conteúdo sem limite seguro ', 70);
        $this->assertCount(1, (new StudyUnitSplitter())->split('Fonte', $source)['units']);
    }
}
