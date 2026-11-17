<?php
namespace App\Controllers\Api\V1;
final class MeController extends ApiController
{
    public function showMe()
    {
        return $this->respond(\App\Libraries\AuthUserPayload::from(auth()->user()))
            ->setHeader('Cache-Control', 'no-store');
    }
}
