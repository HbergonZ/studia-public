<?php
namespace App\Models;
class SubjectModel extends StudiaModel
{
    protected $table = 'subjects';
    protected $allowedFields = ['notice_id','study_area_id','content_group_id','name','weight','weight_override','color','sort_order'];
}
