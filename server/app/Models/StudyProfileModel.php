<?php
namespace App\Models;
class StudyProfileModel extends StudiaModel
{
    protected $table = 'study_profiles'; protected $primaryKey = 'user_id';
    protected $useAutoIncrement = false;
    protected $allowedFields = ['user_id','weekly_question_goal','weekly_minutes_goal','timezone','block_minutes','break_minutes'];
}
