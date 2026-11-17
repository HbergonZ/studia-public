<?php
namespace App\Controllers\Api\V1;
final class MeController extends ApiController
{
    public function showMe() { $u = auth()->user(); return $this->respond(['id'=>$u->id,'email'=>$u->email ?? null,'username'=>$u->username ?? null]); }
}
