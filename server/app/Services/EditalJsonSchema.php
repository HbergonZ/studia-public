<?php
namespace App\Services;

final class EditalJsonSchema
{
    public static function build():array
    {
        $option=['type'=>'object','properties'=>['ref'=>['type'=>'string','maxLength'=>80],'code'=>['type'=>['string','null'],'maxLength'=>80],'name'=>['type'=>'string','maxLength'=>240],'kind'=>['type'=>'string','enum'=>['job','employment','profile','specialty','area','emphasis','level','code','block','other']]],'required'=>['ref','code','name','kind'],'additionalProperties'=>false];
        $application=['type'=>'object','properties'=>['option_ref'=>['type'=>'string','maxLength'=>80],'weight'=>['type'=>['number','null'],'minimum'=>0]],'required'=>['option_ref','weight'],'additionalProperties'=>false];
        $subject=['type'=>'object','properties'=>['name'=>['type'=>'string','maxLength'=>240],'topics'=>['type'=>'array','minItems'=>1,'items'=>['type'=>'string','maxLength'=>5000]]],'required'=>['name','topics'],'additionalProperties'=>false];
        $group=['type'=>'object','properties'=>['ref'=>['type'=>'string','maxLength'=>80],'name'=>['type'=>'string','maxLength'=>240],'knowledge_type'=>['type'=>'string','enum'=>['general','specific','uncertain']],'applies_to_all'=>['type'=>'boolean'],'applicability'=>['type'=>'array','items'=>$application],'subjects'=>['type'=>'array','minItems'=>1,'items'=>$subject]],'required'=>['ref','name','knowledge_type','applies_to_all','applicability','subjects'],'additionalProperties'=>false];
        return ['name'=>'edital_structure_v4','strict'=>true,'schema'=>['type'=>'object','properties'=>['title'=>['type'=>['string','null'],'maxLength'=>180],'has_study_syllabus'=>['type'=>'boolean'],'extraction_complete'=>['type'=>'boolean'],'options'=>['type'=>'array','items'=>$option],'groups'=>['type'=>'array','items'=>$group],'warnings'=>['type'=>'array','items'=>['type'=>'string','maxLength'=>1500]]],'required'=>['title','has_study_syllabus','extraction_complete','options','groups','warnings'],'additionalProperties'=>false]];
    }
}
