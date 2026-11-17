<?php
namespace Tests\Unit;
use App\Services\{StudyUnitValidator, EditalStructureValidator};
use CodeIgniter\Test\CIUnitTestCase;
use RuntimeException;

final class StudyUnitValidatorTest extends CIUnitTestCase
{
    private function topic(): array { return ['title'=>'Saúde pública','source'=>'SUS: princípios; organização.','units'=>[['title'=>'Princípios do SUS','source'=>'SUS: princípios;'],['title'=>'Organização do SUS','source'=>'organização.']]]; }
    public function testPreservesCompleteOrderedCoverage(): void { $this->assertCount(2, (new StudyUnitValidator())->topic($this->topic())['units']); }
    public function testAllowsOnlyWhitespaceDifferences(): void { $t=$this->topic();$t['source']="SUS: princípios;\n organização.";$this->assertSame($t['units'],(new StudyUnitValidator())->topic($t)['units']); }
    public function testRejectsOmission(): void { $t=$this->topic();array_pop($t['units']);$this->expectException(RuntimeException::class);(new StudyUnitValidator())->topic($t); }
    public function testRejectsInvention(): void { $t=$this->topic();$t['units'][1]['source']='financiamento.';$this->expectException(RuntimeException::class);(new StudyUnitValidator())->topic($t); }
    public function testRejectsRepeatedSource(): void { $t=$this->topic();$t['units'][1]['source']=$t['source'];$this->expectException(RuntimeException::class);(new StudyUnitValidator())->topic($t); }
    public function testRejectsReorderedExcerpts(): void { $t=$this->topic();$t['units']=array_reverse($t['units']);$this->expectException(RuntimeException::class);(new StudyUnitValidator())->topic($t); }
    public function testRejectsDuplicateTitles(): void { $t=$this->topic();$t['units'][1]['title']=$t['units'][0]['title'];$this->expectException(RuntimeException::class);(new StudyUnitValidator())->topic($t); }
    public function testDuplicateMessageIdentifiesTitleAndUnitPositions(): void {
        $t=$this->topic();$t['units'][1]['title']='  PRINCÍPIOS DO SUS  ';
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('O título "PRINCÍPIOS DO SUS" se repete nas unidades 1 e 2');
        (new StudyUnitValidator())->topic($t);
    }
    public function testAcceptsSpecificMathTitlesWithLiteralCoverage(): void {
        $t=['title'=>'Operações básicas','source'=>'Operações básicas: adição, subtração, multiplicação e divisão. Potenciação e Radiciação.','units'=>[
            ['title'=>'Adição e subtração','source'=>'Operações básicas: adição, subtração,'],
            ['title'=>'Multiplicação e divisão','source'=>'multiplicação e divisão.'],
            ['title'=>'Potenciação','source'=>'Potenciação e'],
            ['title'=>'Radiciação','source'=>'Radiciação.'],
        ]];
        $this->assertSame($t,(new StudyUnitValidator())->topic($t));
    }
    public function testRejectsLongDisplayTitle(): void { $t=$this->topic();$t['units'][0]['title']=str_repeat('a',181);$this->expectException(RuntimeException::class);(new StudyUnitValidator())->topic($t); }
    public function testSupportsFencedJson(): void { $v=new StudyUnitValidator();$this->assertSame(['version'=>1],$v->json("```json\n{\"version\":1}\n```")); }
    public function testRejectsTruncatedJson(): void { $this->expectException(RuntimeException::class);(new StudyUnitValidator())->json('{"version":'); }
    public function testImportsOrganizedAndLegacyTopicsTogether(): void {
        $s=['study_units_version'=>1,'extraction_complete'=>true,'options'=>[],'groups'=>[['ref'=>'all','name'=>'Geral','knowledge_type'=>'general','applies_to_all'=>true,'subjects'=>[['name'=>'Saúde','topics'=>[$this->topic(),'Outro assunto.']]]]]];
        $v=(new EditalStructureValidator())->validate($s);
        $this->assertSame($this->topic(),$v['groups'][0]['subjects'][0]['topics'][0]);
        $this->assertSame(['subjects'=>1,'sources'=>2,'units'=>3,'legacy'=>1],(new StudyUnitValidator())->summary($v));
    }
    public function testRejectsIncompleteNewResponse(): void { $this->expectException(RuntimeException::class);(new EditalStructureValidator())->validate(['study_units_version'=>1,'extraction_complete'=>false]); }
    public function testRejectsMalformedGroupList(): void { $this->expectException(RuntimeException::class);(new EditalStructureValidator())->validate(['groups'=>'texto']); }
    public function testRejectsMalformedSubject(): void { $this->expectException(RuntimeException::class);(new EditalStructureValidator())->validate(['groups'=>[['ref'=>'all','name'=>'Geral','subjects'=>['texto']]]]); }
    public function testRejectsFalseCoverageAsText(): void { $this->expectException(RuntimeException::class);(new EditalStructureValidator())->validate(['extraction_complete'=>'false']); }
}
