<?php
namespace App\Filters;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

final class ApiSessionFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! auth()->loggedIn()) return service('response')->setStatusCode(401)->setJSON(['message'=>'Autenticação necessária.']);
    }
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null) {}
}
