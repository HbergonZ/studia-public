<?php
namespace App\Controllers\Api\V1;
final class DashboardController extends ApiController
{
    public function index()
    {
        $id = $this->request->getGet('edital_id');
        if ($id !== null && (!is_scalar($id) || !ctype_digit((string) $id))) return $this->failValidationErrors('Edital inválido.');
        try { return $this->respond((new \App\Services\DashboardData())->load($this->userId(), $id === null ? null : (int) $id)); }
        catch (\OutOfBoundsException $e) { return $this->failNotFound($e->getMessage()); }
    }
}
