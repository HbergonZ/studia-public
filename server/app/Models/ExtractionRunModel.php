<?php
namespace App\Models;
class ExtractionRunModel extends StudiaModel
{
    protected $table = 'extraction_runs'; protected $useTimestamps = false;
    protected $allowedFields = ['notice_id','status','model','prompt_version','request_id','input_tokens','output_tokens','error','raw_response','created_at','finished_at'];
}
