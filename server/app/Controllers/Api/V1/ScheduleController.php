<?php
namespace App\Controllers\Api\V1;
use App\Models\TopicModel;
final class ScheduleController extends ApiController
{
    public function index(){ $date=$this->request->getGet('date')?:date('Y-m-d'); $parsed=\DateTimeImmutable::createFromFormat('!Y-m-d',$date); if(!$parsed||$parsed->format('Y-m-d')!==$date)return $this->failValidationErrors('Data inválida. Use YYYY-MM-DD.'); $db=db_connect();
        $rows=$db->table('topics t')->select('t.*,s.name subject_name,s.weight,s.color,n.id notice_id')->join('subjects s','s.id=t.subject_id')->join('content_groups g','g.id=s.content_group_id')->join('notices n','n.id=s.notice_id')->where('n.user_id',$this->userId())->where('n.status','confirmed')->where('n.deleted_at',null)->groupStart()->where('g.applies_to_all',true)->orWhere('EXISTS (SELECT 1 FROM option_content_groups oc JOIN selectable_options o ON o.id=oc.option_id WHERE oc.content_group_id=g.id AND o.is_selected=TRUE)',null,false)->groupEnd()->groupStart()->where('t.next_review_at <=',$date.' 23:59:59')->orWhere('t.next_review_at',null)->groupEnd()->orderBy("CASE WHEN t.next_review_at < '{$date}' THEN 0 WHEN t.next_review_at IS NOT NULL THEN 1 ELSE 2 END",'',false)->orderBy('s.weight','DESC')->get()->getResultArray(); return $this->respond($rows); }
}
