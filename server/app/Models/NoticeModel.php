<?php
namespace App\Models;
class NoticeModel extends StudiaModel
{
    protected $table = 'notices'; protected $useSoftDeletes = true;
    protected $allowedFields = ['user_id','title','status','source','original_filename','stored_path','extraction_error','confirmed_at','has_study_syllabus','import_request_key'];
}
