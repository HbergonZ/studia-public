<?php
namespace App\Services;
use JsonException;use RuntimeException;
final class EditalStructureValidator
{
    /** Validate automatic extraction without coercing types or discarding malformed items. */
    public function validateAutomatic(mixed $value): array
    {
        $this->requireFields($value, ['title','has_study_syllabus','extraction_complete','options','groups','warnings']);
        if (!is_bool($value['has_study_syllabus']) || $value['extraction_complete'] !== true) {
            throw new RuntimeException('A análise não confirmou a extração completa do edital.');
        }
        if ($value['title'] !== null) $this->requireText($value['title'], 180);
        foreach (['options','groups','warnings'] as $key) $this->requireList($value[$key]);
        foreach ($value['warnings'] as $warning) $this->requireText($warning, 1500);
        foreach ($value['options'] as $option) {
            $this->requireFields($option, ['ref','code','name','kind']);
            $this->requireText($option['ref'], 80);
            $this->requireText($option['name'], 240);
            $this->requireText($option['kind'], 20);
            if ($option['code'] !== null) $this->requireText($option['code'], 80);
        }
        $covered = [];
        $global = false;
        foreach ($value['groups'] as $group) {
            $this->requireFields($group, ['ref','name','knowledge_type','applies_to_all','applicability','subjects']);
            $this->requireText($group['ref'], 80);
            $this->requireText($group['name'], 240);
            if (!in_array($group['knowledge_type'], ['general','specific'], true)) {
                throw new RuntimeException('A análise não definiu o tipo de conhecimento de todos os blocos.');
            }
            if (!is_bool($group['applies_to_all'])) throw new RuntimeException('Aplicabilidade inválida na resposta da IA.');
            $this->requireList($group['applicability']);
            $this->requireList($group['subjects']);
            if (!$group['applies_to_all'] && $group['applicability'] === []) {
                throw new RuntimeException('A análise deixou um bloco sem aplicabilidade.');
            }
            if ($group['applies_to_all'] && $group['applicability'] !== []) {
                throw new RuntimeException('A análise retornou aplicabilidade contraditória.');
            }
            $global = $global || $group['applies_to_all'];
            $seen = [];
            foreach ($group['applicability'] as $application) {
                $this->requireFields($application, ['option_ref','weight']);
                $this->requireText($application['option_ref'], 80);
                $ref = trim($application['option_ref']);
                if (isset($seen[$ref])) throw new RuntimeException('A análise repetiu a aplicabilidade de um bloco.');
                $seen[$ref] = $covered[$ref] = true;
                $weight = $application['weight'];
                if ($weight !== null && ((!is_int($weight) && !is_float($weight)) || !is_finite((float)$weight) || $weight < 0)) {
                    throw new RuntimeException('Peso inválido na resposta da IA.');
                }
            }
            foreach ($group['subjects'] as $subject) {
                $this->requireFields($subject, ['name','topics']);
                $this->requireText($subject['name'], 240);
                $this->requireList($subject['topics']);
                if ($subject['topics'] === []) throw new RuntimeException('A análise retornou uma matéria sem tópicos.');
                foreach ($subject['topics'] as $topic) $this->requireText($topic, 5000);
            }
        }
        if (!$value['has_study_syllabus'] && ($value['options'] !== [] || $value['warnings'] === [])) {
            throw new RuntimeException('A análise sem conteúdo estudável deve justificar a ausência e retornar listas vazias.');
        }
        if ($value['has_study_syllabus'] && !$global) {
            foreach ($value['options'] as $option) {
                if (!isset($covered[trim($option['ref'])])) throw new RuntimeException('A análise deixou uma opção sem conteúdo associado.');
            }
        }
        return $this->validate($value);
    }

    private function requireFields(mixed $value, array $fields): void
    {
        if (!is_array($value) || array_is_list($value) || array_diff($fields, array_keys($value)) !== [] || array_diff(array_keys($value), $fields) !== []) {
            throw new RuntimeException('A resposta da IA não corresponde aos campos esperados.');
        }
    }

    private function requireList(mixed $value): void
    {
        if (!is_array($value) || !array_is_list($value)) throw new RuntimeException('A resposta da IA contém uma lista inválida.');
    }

    private function requireText(mixed $value, int $max): void
    {
        if (!is_string($value) || trim($value) === '' || mb_strlen($value) > $max) {
            throw new RuntimeException('A resposta da IA contém texto vazio, inválido ou acima do limite.');
        }
    }

    public function fromJson(string $json):array{try{$parsed=json_decode((string)preg_replace('/^```(?:json)?\s*|\s*```$/i','',trim($json)),true,512,JSON_THROW_ON_ERROR);}catch(JsonException $e){throw new RuntimeException('A resposta informada não é um JSON válido.',0,$e);}return $this->validate($parsed);}
    public function validate(mixed $value):array
    {
        if(!is_array($value))throw new RuntimeException('A resposta não contém uma estrutura válida.');
        foreach (['options','groups','warnings'] as $field) $this->requireList($value[$field] ?? []);
        foreach (['has_study_syllabus','extraction_complete'] as $field) {
            if (isset($value[$field]) && !is_bool($value[$field])) throw new RuntimeException('Os indicadores de cobertura devem ser true ou false.');
        }
        foreach ($value['warnings'] ?? [] as $warning) $this->requireText($warning, 1500);
        foreach ($value['options'] ?? [] as $option) {
            if (!is_array($option)) throw new RuntimeException('Opção de cargo inválida.');
            $this->requireText($option['name'] ?? null, 240);
            $this->requireText($option['ref'] ?? null, 80);
        }
        foreach ($value['groups'] ?? [] as $group) {
            if (!is_array($group)) throw new RuntimeException('Bloco de conteúdo inválido.');
            $this->requireText($group['name'] ?? null, 240);
            $this->requireText($group['ref'] ?? null, 80);
            $this->requireList($group['applicability'] ?? []);
            $this->requireList($group['subjects'] ?? []);
            foreach ($group['applicability'] ?? [] as $application) {
                if (!is_array($application) || !is_string($application['option_ref'] ?? null)) throw new RuntimeException('Referência de cargo inválida.');
            }
            foreach ($group['subjects'] ?? [] as $subject) {
                if (!is_array($subject)) throw new RuntimeException('Matéria inválida.');
                $this->requireText($subject['name'] ?? null, 240);
                $this->requireList($subject['topics'] ?? []);
            }
        }
        $title=$value['title']??null;
        if($title!==null&&!is_string($title))throw new RuntimeException('O nome do edital deve ser um texto.');
        $title=$title===null?null:trim($title);
        if($title==='')$title=null;
        if($title!==null&&mb_strlen($title)>180)throw new RuntimeException('O nome do edital deve ter até 180 caracteres.');
        if(isset($value['study_units_version'])&&($value['study_units_version']!==1||($value['extraction_complete']??null)!==true))throw new RuntimeException('A organização precisa estar completa e usar study_units_version 1.');$has=(bool)($value['has_study_syllabus']??true);$complete=(bool)($value['extraction_complete']??false);$options=[];$optionRefs=[];
        foreach(($value['options']??[]) as $o){if(!is_array($o))continue;$ref=trim((string)($o['ref']??''));$name=trim((string)($o['name']??''));$kind=(string)($o['kind']??'other');if($ref===''||$name===''||isset($optionRefs[$ref]))throw new RuntimeException('As opções do edital possuem identificadores inválidos ou duplicados.');if(!in_array($kind,['job','employment','profile','specialty','area','emphasis','level','code','block','other'],true))throw new RuntimeException('Tipo de opção inválido.');$optionRefs[$ref]=true;$options[]=['ref'=>$ref,'code'=>trim((string)($o['code']??''))?:null,'name'=>$name,'kind'=>$kind];}
        $groups=[];$groupRefs=[];
        foreach(($value['groups']??[]) as $g){if(!is_array($g))continue;$ref=trim((string)($g['ref']??''));$name=trim((string)($g['name']??''));$type=(string)($g['knowledge_type']??'uncertain');if($ref===''||$name===''||isset($groupRefs[$ref]))throw new RuntimeException('Os blocos possuem identificadores inválidos ou duplicados.');if(!in_array($type,['general','specific','uncertain'],true))throw new RuntimeException('Tipo de conhecimento inválido.');$app=[];foreach(($g['applicability']??[]) as $a){$or=(string)($a['option_ref']??'');if(!isset($optionRefs[$or]))throw new RuntimeException('Um bloco referencia uma opção inexistente.');$app[]=['option_ref'=>$or,'weight'=>isset($a['weight'])&&is_numeric($a['weight'])?(float)$a['weight']:null];}$subjects=[];foreach(($g['subjects']??[]) as $s){$sn=trim((string)($s['name']??''));$topics=[];foreach(($s['topics']??[]) as $t){if(is_array($t)){$topics[]=(new StudyUnitValidator())->topic($t);}elseif(is_string($t)&&trim($t)!==''&&mb_strlen($t)<=20000){$topics[]=trim($t);}else throw new RuntimeException('Assunto inválido ou acima do limite.');}if($sn!==''&&$topics!==[])$subjects[]=['name'=>$sn,'topics'=>$topics];}if($subjects===[])throw new RuntimeException('Um bloco não contém disciplinas e tópicos válidos.');$appliesToAll=(bool)($g['applies_to_all']??false);if(!$appliesToAll&&$app===[]){if($type==='general'||$options===[])$appliesToAll=true;elseif(count($options)===1)$app[]=['option_ref'=>$options[0]['ref'],'weight'=>null];else throw new RuntimeException('O bloco "'.$name.'" não possui aplicabilidade definida.');}$groupRefs[$ref]=true;$groups[]=['ref'=>$ref,'name'=>$name,'knowledge_type'=>$type,'applies_to_all'=>$appliesToAll,'applicability'=>$app,'subjects'=>$subjects];}
        if(!$has&&$groups!==[])throw new RuntimeException('Um edital sem conteúdo estudável não pode conter blocos de estudo.');if($has&&$groups===[])throw new RuntimeException('Nenhum conteúdo programático válido foi identificado.');
        return ['title'=>$title,'has_study_syllabus'=>$has,'extraction_complete'=>$complete,'options'=>$options,'groups'=>$groups,'warnings'=>array_values(array_filter(array_map('strval',$value['warnings']??[])))];
    }
}
