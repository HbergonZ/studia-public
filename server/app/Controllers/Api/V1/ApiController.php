<?php
namespace App\Controllers\Api\V1;
use CodeIgniter\RESTful\ResourceController;
abstract class ApiController extends ResourceController
{
    protected $format = 'json';
    protected function userId(): int { return (int) auth()->id(); }
    protected function body(): array { return $this->request->getJSON(true) ?? $this->request->getPost(); }
}
