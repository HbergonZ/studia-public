<?php

namespace App\Models;

final class StudyAreaModel extends StudiaModel
{
    protected $table = 'study_areas';
    protected $allowedFields = ['notice_id', 'name', 'knowledge_type', 'is_selected', 'sort_order'];
}
