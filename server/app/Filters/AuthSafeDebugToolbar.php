<?php

namespace App\Filters;

use CodeIgniter\Filters\DebugToolbar;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

final class AuthSafeDebugToolbar extends DebugToolbar
{
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        if (str_starts_with(ltrim($request->getUri()->getPath(), '/'), 'api/')) {
            $response->removeHeader('Debugbar-Link'); $response->removeHeader('Debugbar-Time');
            return null;
        }
        if (str_starts_with(ltrim(service('router')->controllerName(), '\\'), 'App\\Controllers\\Api\\')) return null;
        if (in_array(ltrim(service('router')->controllerName(), '\\'), [
            'App\\Controllers\\Api\\AuthController',
            'App\\Controllers\\Api\\V1\\UsersController',
            'App\\Controllers\\Api\\V1\\MeController',
        ], true)) {
            return null;
        }
        return parent::after($request, $response, $arguments);
    }
}
