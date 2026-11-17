<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Security\Exceptions\SecurityException;

final class ApiCsrfFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (in_array(strtoupper($request->getMethod()), ['GET', 'HEAD', 'OPTIONS'], true)) return;
        $type = strtolower($request->getHeaderLine('Content-Type'));
        $multipart = str_contains($type, 'multipart/form-data');
        $empty = trim((string) $request->getBody()) === '';
        try { $valid = $empty || $multipart || (str_contains($type, 'application/json') && str_starts_with(ltrim((string) $request->getBody()), '{') && is_array($request->getJSON(true))); }
        catch (\Throwable) { $valid = false; }
        if (!$valid) {
            return service('response')->setStatusCode(400)
                ->setHeader('X-CSRF-TOKEN', csrf_hash())
                ->setJSON(['message' => 'Informe os dados em um objeto JSON.']);
        }
        try {
            service('security')->verify($request);
        } catch (SecurityException) {
            return service('response')->setStatusCode(403)
                ->setHeader('X-CSRF-TOKEN', csrf_hash())
                ->setJSON(['message' => 'Atualize a página e tente novamente.']);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        $response->setHeader('X-CSRF-TOKEN', csrf_hash());
        $response->setHeader('Cache-Control', 'no-store');
    }
}
