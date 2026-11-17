<?php
namespace App\Models;
final class SelectableOptionModel extends StudiaModel
{
    protected $table='selectable_options';
    protected $allowedFields=['notice_id','external_ref','code','name','kind','is_selected','sort_order'];
}
