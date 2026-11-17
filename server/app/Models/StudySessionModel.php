<?php
namespace App\Models;
class StudySessionModel extends StudiaModel
{
    protected $table = 'study_sessions'; protected $useTimestamps = false;
    protected $allowedFields = ['user_id','topic_id','studied_on','minutes','correct_answers','wrong_answers','difficulty','created_at'];
}
