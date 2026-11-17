<?php
namespace App\Controllers\Api\V1;
use App\Models\{StudySessionModel,TopicModel};
use App\Services\ReviewScheduleService;
use DateTimeImmutable;
final class SessionsController extends ApiController
{
    public function create(){ $d=$this->body(); $topic=(new TopicModel())->select('topics.*')->join('subjects','subjects.id=topics.subject_id')->join('notices','notices.id=subjects.notice_id')->where(['topics.id'=>(int)($d['topic_id']??0),'notices.user_id'=>$this->userId(),'notices.status'=>'confirmed','notices.deleted_at'=>null])->first(); if(!$topic)return $this->failNotFound();
        $studied=$d['studied_on']??date('Y-m-d'); $correct=(int)($d['correct_answers']??0);$wrong=(int)($d['wrong_answers']??0);$schedule=(new ReviewScheduleService())->afterSession((int)$topic['curve_position'],$correct,$wrong,new DateTimeImmutable($studied));$now=date('Y-m-d H:i:s');$db=db_connect();$db->transStart();
        $id=(new StudySessionModel())->insert(['user_id'=>$this->userId(),'topic_id'=>$topic['id'],'studied_on'=>$studied,'minutes'=>(int)($d['minutes']??0),'correct_answers'=>$correct,'wrong_answers'=>$wrong,'difficulty'=>(int)($d['difficulty']??$topic['difficulty']),'created_at'=>$now],true);
        (new TopicModel())->update($topic['id'],['difficulty'=>(int)($d['difficulty']??$topic['difficulty']),'curve_position'=>$schedule['position'],'first_reviewed_at'=>$topic['first_reviewed_at']?:$now,'last_reviewed_at'=>$now,'next_review_at'=>$schedule['nextReviewAt']]);$db->transComplete();return $this->respondCreated(['id'=>$id]+$schedule); }
}
