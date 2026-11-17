<?php
namespace App\Models;
class AvailabilityModel extends StudiaModel
{
    protected $table = 'availabilities';
    protected $allowedFields = ['user_id','weekday','minutes'];
}
