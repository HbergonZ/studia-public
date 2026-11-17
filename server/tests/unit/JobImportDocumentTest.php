<?php
namespace Tests\Unit;
use App\Services\{JobImportDocument, EditalStructureValidator};
use CodeIgniter\Test\CIUnitTestCase;
use RuntimeException;
final class JobImportDocumentTest extends CIUnitTestCase
{
    private function document(): JobImportDocument { return new JobImportDocument("[[PAGE 1]]\n725 - Enfermeiro\n602 - Enfermeiro do Trabalho\n[[PAGE 2]]\nGerais de nivel superior\nPortugues\nInterpretacao de texto.\n[[PAGE 3]]\n725 - Enfermeiro\nBiosseguranca.\nSeguranca do paciente."); }
    private function inventory(): array
    {
        return $this->document()->validateInventory(['title' => 'Edital 2026', 'has_study_syllabus' => true, 'options' => [['ref' => '725 - Enfermeiro', 'code' => '725', 'name' => 'Enfermeiro', 'kind' => 'job', 'level' => 'Superior', 'source_line' => 2, 'general_expected' => true, 'specific_expected' => true]], 'syllabus_pages' => [2,3], 'warnings' => []]);
    }
    private function content(): array { return ['option_ref' => '725 - Enfermeiro', 'complete' => true, 'sections' => [['name' => 'Portugues', 'knowledge_type' => 'general', 'start_line' => 6, 'end_line' => 7, 'evidence_line' => 5], ['name' => 'Enfermagem', 'knowledge_type' => 'specific', 'start_line' => 9, 'end_line' => 11, 'evidence_line' => 9]], 'warnings' => []]; }
    public function testSourceComesFromOriginalLinesAndRoundTrips(): void
    {
        $document = $this->document(); $content = $this->content(); $content['sections'][1]['source'] = 'Inventado pela IA';
        $validated = $document->validateContent($this->inventory(), '725 - Enfermeiro', $content);
        $this->assertSame("725 - Enfermeiro\nBiosseguranca.\nSeguranca do paciente.", $validated['sections'][1]['source']);
        $structure = (new EditalStructureValidator())->fromJson(json_encode($document->structure($this->inventory(), $validated)));
        $this->assertCount(1, $structure['options']); $this->assertCount(2, $structure['groups']);
        $this->assertSame($validated['sections'][1]['source'], $structure['groups'][1]['subjects'][0]['topics'][0]['units'][0]['source']);
        $task = $document->contentTask($this->inventory(), '725 - Enfermeiro');
        $this->assertStringNotContainsString('[L3]', $task['messages'][1]['content']);
        $this->assertStringContainsString('[L11]', $task['messages'][1]['content']);
    }
    public function testMissingSpecificContentCannotPass(): void { $v = $this->content(); array_pop($v['sections']); $this->expectException(RuntimeException::class); $this->document()->validateContent($this->inventory(), $v['option_ref'], $v); }
    public function testNoSyllabusPreservesReasonAndPreventsContentExtraction(): void
    {
        $d = new JobImportDocument("[[PAGE 1]]\n1.3 Selecao exclusivamente por titulos e experiencia.");
        $v = $d->validateInventory(['title' => 'Selecao', 'has_study_syllabus' => false, 'options' => [], 'syllabus_pages' => [], 'warnings' => ['Item 1.3: titulos e experiencia, sem prova de conhecimentos.']]);
        $this->assertFalse($v['has_study_syllabus']);
        $this->assertCount(1, $v['warnings']);
        $this->expectException(RuntimeException::class);
        $d->contentTask($v, 'inventado');
    }
    public function testNoSyllabusRequiresAnExplanation(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Explique por que');
        $this->document()->validateInventory(['title' => 'Selecao', 'has_study_syllabus' => false, 'options' => [], 'syllabus_pages' => [], 'warnings' => []]);
    }
    public function testOverlappingRangesCannotPass(): void { $v = $this->content(); $v['sections'][] = $v['sections'][0]; $this->expectException(RuntimeException::class); $this->document()->validateContent($this->inventory(), $v['option_ref'], $v); }
    public function testOutOfDocumentRangeCannotPass(): void { $v = $this->content(); $v['sections'][1]['end_line'] = 1000; $this->expectException(RuntimeException::class); $this->document()->validateContent($this->inventory(), $v['option_ref'], $v); }
    public function testWrongJobCannotPass(): void { $v = $this->content(); $v['option_ref'] = '602'; $this->expectException(RuntimeException::class); $this->document()->validateContent($this->inventory(), '725 - Enfermeiro', $v); }
    public function testIncompleteContentCannotPass(): void { $v = $this->content(); $v['complete'] = false; $this->expectException(RuntimeException::class); $this->document()->validateContent($this->inventory(), $v['option_ref'], $v); }
    public function testUnsupportedPageCannotPass(): void { $v = $this->content(); $v['sections'][0]['start_line'] = 2; $this->expectException(RuntimeException::class); $this->document()->validateContent($this->inventory(), $v['option_ref'], $v); }
    public function testInventedJobHasNoEvidence(): void { $v = $this->inventory(); $v['options'][0]['name'] = 'Piloto de aviao'; $this->expectException(RuntimeException::class); $this->document()->validateInventory($v); }
    public function testExplicitGeneralCodeListCannotIncludeAnotherJob(): void
    {
        $d = new JobImportDocument("[[PAGE 1]]\n08 - Analista Tecnologia\n[[PAGE 2]]\nCONHECIMENTOS GERAIS\nPARA OS CODIGOS DE OPCAO: 01 - ANALISTA ADMINISTRATIVA e 02 - ANALISTA CONTABILIDADE\nPortugues\nInterpretacao.\n08 - Analista Tecnologia\nRedes.");
        $v = $this->inventory(); $v['options'][0] = ['ref' => '08', 'code' => '08', 'name' => 'Analista Tecnologia', 'kind' => 'job', 'level' => 'Superior', 'source_line' => 2, 'general_expected' => true, 'specific_expected' => true]; $v['syllabus_pages'] = [2]; $v = $d->validateInventory($v);
        $content = ['option_ref' => '08', 'complete' => true, 'sections' => [['name' => 'Portugues', 'knowledge_type' => 'general', 'start_line' => 4, 'end_line' => 7, 'evidence_line' => 4]], 'warnings' => []];
        $this->expectException(RuntimeException::class); $this->expectExceptionMessage('exclusivo de outros códigos'); $d->validateContent($v, '08', $content);
    }
    public function testHeaderImmediatelyAfterSectionStartBelongsToSelectedJob(): void
    {
        $d = new JobImportDocument("[[PAGE 1]]\n602 - Enfermeiro do Trabalho\n725 - Enfermeiro\n[[PAGE 2]]\n602 - Enfermeiro do Trabalho\nOcupacional.\nCONHECIMENTOS ESPECIFICOS\n725 - Enfermeiro\nBiosseguranca.");
        $v = $this->inventory(); $v['options'][0]['source_line'] = 3; $v['options'][0]['general_expected'] = false; $v['syllabus_pages'] = [2]; $v['options'][] = ['ref' => '602', 'code' => '602', 'name' => 'Enfermeiro do Trabalho', 'kind' => 'job', 'level' => 'Superior', 'source_line' => 2, 'general_expected' => false, 'specific_expected' => true]; $v = $d->validateInventory($v);
        $c = ['option_ref' => '725 - Enfermeiro', 'complete' => true, 'sections' => [['name' => 'Enfermagem', 'knowledge_type' => 'specific', 'start_line' => 7, 'end_line' => 9, 'evidence_line' => 8]], 'warnings' => []];
        $this->assertCount(1, $d->validateContent($v, $c['option_ref'], $c)['sections']);
    }
    public function testTableColumnsCanInterruptAnOfficialName(): void
    {
        $d = new JobImportDocument("[[PAGE 1]]\n08 Analista 40 horas\nPrevidenciario cargo superior\nTecnologia da Informacao\n[[PAGE 2]]\nPrograma");
        $v = $this->inventory(); $v['options'][0] = ['ref' => '08', 'code' => '08', 'name' => 'Analista Previdenciario Tecnologia da Informacao', 'kind' => 'job', 'level' => 'Superior', 'source_line' => 2, 'general_expected' => true, 'specific_expected' => true];
        $v['syllabus_pages'] = [2];
        $this->assertCount(1, $d->validateInventory($v)['options']);
    }
    public function testReadingHealthFlagsAnIntermediatePageWithoutReadableText(): void
    {
        $d = new JobImportDocument("[[PAGE 1]]\n" . str_repeat('Conteudo legivel completo. ', 4) . "\n[[PAGE 3]]\n" . str_repeat('Outro conteudo legivel. ', 4));
        $this->assertSame([2], $d->readingHealth()['pages_to_check']);
        $this->assertSame(2, $d->readingHealth()['text_pages']);
        $this->assertNotNull($d->readingHealth()['warning']);
    }
    public function testTitlesAndExperienceCannotBeMisclassifiedAsSyllabus(): void
    {
        $d = new JobImportDocument("[[PAGE 1]]\n1.3 A seleção de candidatos compreenderá a aplicação de avaliação de\ntítulos e experiência profissional, de caráter eliminatório.");
        $this->assertTrue($d->documentReview()['titles_only']);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('títulos e experiência');
        $d->validateInventory(['title' => 'Seleção', 'has_study_syllabus' => true, 'options' => [], 'syllabus_pages' => [1], 'warnings' => []]);
    }
    public function testGeneralContentFromAnotherEducationLevelIsRejected(): void
    {
        $d = new JobImportDocument("[[PAGE 1]]\n725 - Enfermeiro\n[[PAGE 2]]\nENSINO FUNDAMENTAL COMPLETO\nPortugues e interpretacao de textos.\n[[PAGE 3]]\nENSINO SUPERIOR\nPortugues superior e compreensao.");
        $v = $this->inventory(); $v['options'][0]['general_expected'] = true; $v['options'][0]['specific_expected'] = false;
        $v = $d->validateInventory($v);
        $this->expectException(RuntimeException::class); $this->expectExceptionMessage('outra escolaridade');
        $d->validateContent($v, $v['options'][0]['ref'], ['option_ref' => $v['options'][0]['ref'], 'complete' => true, 'sections' => [['name' => 'Portugues', 'knowledge_type' => 'general', 'start_line' => 5, 'end_line' => 5, 'evidence_line' => 4]], 'warnings' => []]);
    }
}
