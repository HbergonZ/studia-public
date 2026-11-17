<?php
namespace Tests\Unit;
use App\Services\EditalStructureValidator;use CodeIgniter\Test\CIUnitTestCase;use RuntimeException;
final class EditalStructureValidatorTest extends CIUnitTestCase
{
 private EditalStructureValidator $validator;
 protected function setUp():void{parent::setUp();$this->validator=new EditalStructureValidator();}
 public function testNormalizesNoticeTitle():void{$d=$this->valid();$d['title']='  Universidade - Edital 01/2026  ';$this->assertSame('Universidade - Edital 01/2026',$this->validator->validate($d)['title']);}
 public function testAcceptsLegacyResponseWithoutTitle():void{$this->assertNull($this->validator->validate($this->valid())['title']);}
 public function testAcceptsEmptyOrUnknownTitle():void{foreach([null,'   '] as $title){$d=$this->valid();$d['title']=$title;$this->assertNull($this->validator->validate($d)['title']);}}
 public function testRejectsInvalidTitleType():void{$d=$this->valid();$d['title']=['nome'];$this->expectException(RuntimeException::class);$this->validator->validate($d);}
 public function testRejectsOversizedTitle():void{$d=$this->valid();$d['title']=str_repeat('á',181);$this->expectException(RuntimeException::class);$this->validator->validate($d);}
 private function valid():array{return ['has_study_syllabus'=>true,'extraction_complete'=>true,'options'=>[['ref'=>'cargo-1','code'=>'01','name'=>'Cargo 1','kind'=>'job']],'groups'=>[['ref'=>'gerais','name'=>'Conhecimentos gerais do cargo','knowledge_type'=>'general','applies_to_all'=>false,'applicability'=>[['option_ref'=>'cargo-1','weight'=>null]],'subjects'=>[['name'=>'Português','topics'=>['1 Interpretação']]]]],'warnings'=>[]];}
 public function testValidatesScopedGeneralKnowledge():void{$v=$this->validator->validate($this->valid());$this->assertSame('general',$v['groups'][0]['knowledge_type']);$this->assertSame('cargo-1',$v['groups'][0]['applicability'][0]['option_ref']);}
 public function testAcceptsSharedGroupAndWeight():void{$d=$this->valid();$d['options'][]=['ref'=>'cargo-2','code'=>'02','name'=>'Cargo 2','kind'=>'job'];$d['groups'][0]['applicability'][]=['option_ref'=>'cargo-2','weight'=>2.5];$v=$this->validator->validate($d);$this->assertCount(2,$v['groups'][0]['applicability']);$this->assertSame(2.5,$v['groups'][0]['applicability'][1]['weight']);}
 public function testAcceptsEditalWithoutStudySyllabus():void{$v=$this->validator->validate(['has_study_syllabus'=>false,'extraction_complete'=>true,'options'=>[],'groups'=>[],'warnings'=>['Sem prova de conhecimentos.']]);$this->assertFalse($v['has_study_syllabus']);}
 public function testRejectsUnknownOptionReference():void{$d=$this->valid();$d['groups'][0]['applicability'][0]['option_ref']='missing';$this->expectException(RuntimeException::class);$this->validator->validate($d);}
 public function testRejectsDuplicateOptionRefs():void{$d=$this->valid();$d['options'][]=$d['options'][0];$this->expectException(RuntimeException::class);$this->validator->validate($d);}
 public function testRejectsGroupWithoutTopics():void{$d=$this->valid();$d['groups'][0]['subjects'][0]['topics']=[];$this->expectException(RuntimeException::class);$this->validator->validate($d);}
 public function testNormalizesUnscopedGeneralGroupAsGlobal():void{$d=$this->valid();$d['groups'][0]['applicability']=[];$v=$this->validator->validate($d);$this->assertTrue($v['groups'][0]['applies_to_all']);}
 public function testRejectsUnscopedSpecificGroupWhenThereAreManyOptions():void{$d=$this->valid();$d['options'][]=['ref'=>'cargo-2','code'=>'02','name'=>'Cargo 2','kind'=>'job'];$d['groups'][0]['knowledge_type']='specific';$d['groups'][0]['applicability']=[];$this->expectException(RuntimeException::class);$this->expectExceptionMessage('Conhecimentos gerais do cargo');$this->validator->validate($d);}
 public function testRejectsInvalidJson():void{$this->expectException(RuntimeException::class);$this->validator->fromJson('{');}
}
