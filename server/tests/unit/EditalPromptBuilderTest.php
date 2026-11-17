<?php
use App\Services\EditalPromptBuilder;use CodeIgniter\Test\CIUnitTestCase;
final class EditalPromptBuilderTest extends CIUnitTestCase
{
 public function testKeepsCompleteDocumentRegardlessOfAnnexNumber():void{$m=(new EditalPromptBuilder())->build('ANEXO II - CONTEÚDO PROGRAMÁTICO conteúdo ANEXO III');$this->assertStringContainsString('ANEXO II',$m[1]['content']);$this->assertStringContainsString('ANEXO III',$m[1]['content']);}
 public function testExplainsSemanticScopeAndMissingSyllabus():void{$m=(new EditalPromptBuilder())->build('texto');$this->assertStringContainsString('has_study_syllabus=false',$m[0]['content']);$this->assertStringContainsString('applies_to_all',$m[0]['content']);$this->assertStringContainsString('General não significa necessariamente todos',$m[0]['content']);}
 public function testRejectsOversizedDocumentWithoutSilentTruncation():void{$this->expectException(\RuntimeException::class);(new EditalPromptBuilder())->build(str_repeat('a',500001));}
 public function testDistinguishesCurriculumAssessmentFromKnowledgeExam():void
 {
  $prompt=(new EditalPromptBuilder())->build('Seleção por avaliação curricular.')[0]['content'];
  $this->assertStringContainsString('Primeiro identifique o método de seleção',$prompt);
  $this->assertStringContainsString('entrevista sem prova de conhecimentos',$prompt);
  $this->assertStringContainsString('options=[], groups=[]',$prompt);
  $this->assertStringContainsString('warning fundamentado no item ou página',$prompt);
  $this->assertStringContainsString('cursos pontuáveis, certificações ou prova de títulos',$prompt);
  $this->assertStringContainsString('A ocorrência isolada da palavra prova',$prompt);
  $this->assertStringContainsString('prova de conhecimentos acompanhada de avaliação de títulos, preserve',$prompt);
 }
 public function testConfirmedMissingSyllabusCanBeCompleteExtraction():void
 {
  $prompt=(new EditalPromptBuilder())->build('Documento completo.')[0]['content'];
  $this->assertStringContainsString('Ausência de conteúdo programático não significa extração incompleta',$prompt);
  $this->assertStringContainsString('extraction_complete=true quando a análise do documento completo confirmar essa ausência',$prompt);
  $this->assertStringContainsString('páginas faltantes ou ilegíveis, marque extraction_complete=false',$prompt);
 }
}
