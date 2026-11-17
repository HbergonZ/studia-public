<?php
namespace App\Controllers\Api\V1;
use App\Models\{AvailabilityModel,StudyProfileModel};
final class ConfigurationController extends ApiController
{
    public function showConfig(){return $this->respond(['profile'=>(new StudyProfileModel())->find($this->userId()),'availability'=>(new AvailabilityModel())->where('user_id',$this->userId())->orderBy('weekday')->findAll()]);}
    public function save(){ $d=$this->body(); $pm=new StudyProfileModel(); $profile=['user_id'=>$this->userId(),'weekly_question_goal'=>(int)($d['weekly_question_goal']??150),'weekly_minutes_goal'=>(int)($d['weekly_minutes_goal']??900),'timezone'=>$d['timezone']??'America/Manaus'];
        $pm->where('user_id',$this->userId())->first()?$pm->update($this->userId(),$profile):$pm->insert($profile,false); $am=new AvailabilityModel();
        foreach($d['availability']??[] as $day=>$minutes){$weekday=(int)$day;if($weekday<0||$weekday>6)continue;$row=$am->where(['user_id'=>$this->userId(),'weekday'=>$weekday])->first();$values=['user_id'=>$this->userId(),'weekday'=>$weekday,'minutes'=>max(0,min(1440,(int)$minutes))];$row?$am->update($row['id'],$values):$am->insert($values);}
        return $this->respondUpdated(['saved'=>true]); }
}
