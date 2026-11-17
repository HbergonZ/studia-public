<?php
namespace App\Models;
final class ContentGroupModel extends StudiaModel
{
    protected $table='content_groups';
    protected $allowedFields=['notice_id','external_ref','name','knowledge_type','applies_to_all','sort_order'];
}
