<?php

namespace Tests\Unit;

use App\Services\EditalStructureValidator;
use CodeIgniter\Test\CIUnitTestCase;
use RuntimeException;

final class AutomaticEditalValidationTest extends CIUnitTestCase
{
    private function valid(): array
    {
        return [
            'title'=>'Universidade - Edital 01/2026', 'has_study_syllabus'=>true, 'extraction_complete'=>true,
            'options'=>[['ref'=>'cargo-1','code'=>null,'name'=>'Analista','kind'=>'job']],
            'groups'=>[['ref'=>'gerais','name'=>'Gerais','knowledge_type'=>'general','applies_to_all'=>true,'applicability'=>[],
                'subjects'=>[['name'=>'Português','topics'=>['1. Interpretação de texto']]]]],
            'warnings'=>[],
        ];
    }

    public function testAcceptsCompleteStructure(): void
    {
        $this->assertSame($this->valid(), (new EditalStructureValidator())->validateAutomatic($this->valid()));
    }

    public function testRejectsMalformedResponsesWithoutSilentlyDroppingContent(): void
    {
        $changes = [
            static function (&$d) { $d['has_study_syllabus']='true'; },
            static function (&$d) { $d['extraction_complete']=false; },
            static function (&$d) { $d['extraction_complete']='true'; },
            static function (&$d) { unset($d['title']); },
            static function (&$d) { $d['groups'][]=null; },
            static function (&$d) { $d['groups'][0]['subjects'][]=['name'=>'Matemática','topics'=>[]]; },
            static function (&$d) { $d['groups'][0]['subjects'][0]['topics'][]=12; },
            static function (&$d) { $d['groups'][0]['subjects'][0]['topics'][]=' '; },
            static function (&$d) { $d['groups'][0]['subjects'][0]['topics']=['x'=>'Texto']; },
            static function (&$d) { $d['groups'][0]['applies_to_all']='false'; },
            static function (&$d) { $d['groups'][0]['applies_to_all']=false; },
            static function (&$d) { $d['groups'][0]['knowledge_type']='uncertain'; },
            static function (&$d) { $d['options'][]='invalid'; },
            static function (&$d) { $d['warnings']=[null]; },
            static function (&$d) { $d['unknown']='unexpected'; },
        ];
        foreach ($changes as $i=>$change) {
            $data=$this->valid(); $change($data);
            try { (new EditalStructureValidator())->validateAutomatic($data); $this->fail('Caso inválido aceito: '.$i); }
            catch (RuntimeException $e) { $this->assertNotEmpty($e->getMessage()); }
        }
    }

    public function testRejectsUncoveredOption(): void
    {
        $data=$this->valid();
        $data['options'][]=['ref'=>'cargo-2','code'=>null,'name'=>'Técnico','kind'=>'job'];
        $data['groups'][0]['applies_to_all']=false;
        $data['groups'][0]['applicability']=[['option_ref'=>'cargo-1','weight'=>null]];
        $this->expectException(RuntimeException::class);
        (new EditalStructureValidator())->validateAutomatic($data);
    }

    public function testRejectsStringWeight(): void
    {
        $data=$this->valid();
        $data['groups'][0]['applies_to_all']=false;
        $data['groups'][0]['applicability']=[['option_ref'=>'cargo-1','weight'=>'2']];
        $this->expectException(RuntimeException::class);
        (new EditalStructureValidator())->validateAutomatic($data);
    }

    public function testAcceptsDocumentWithoutSyllabusOnlyWithExplanation(): void
    {
        $data=['title'=>null,'has_study_syllabus'=>false,'extraction_complete'=>true,'options'=>[],'groups'=>[],'warnings'=>['O documento não prevê prova de conhecimentos.']];
        $this->assertFalse((new EditalStructureValidator())->validateAutomatic($data)['has_study_syllabus']);
        $data['warnings']=[];
        $this->expectException(RuntimeException::class);
        (new EditalStructureValidator())->validateAutomatic($data);
    }

    public function testManualImportKeepsBackwardCompatibility(): void
    {
        $data=$this->valid(); unset($data['title']); $data['groups'][0]['applies_to_all']=false;
        $this->assertTrue((new EditalStructureValidator())->validate($data)['groups'][0]['applies_to_all']);
    }
}
