<?php
namespace App\Models;
class TopicModel extends StudiaModel
{
    protected $table = 'topics';
    protected $allowedFields = ['subject_id','name','difficulty','curve_position','first_reviewed_at','last_reviewed_at','next_review_at','sort_order'];
}
