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
        if ((int) (session()->get('studia_auth_version') ?? 0) !== \App\Libraries\AuthSessionVersion::current((int) auth()->id())) {
            auth()->logout();
            return service('response')->setStatusCode(401)->setJSON(['message' => 'Seu acesso foi redefinido. Entre com a nova senha.']);
        }
        $router = service('router');
        $controller = ltrim($router->controllerName(), '\\');
        $method = $router->methodName();
        $allowed = ($controller === 'App\\Controllers\\Api\\V1\\MeController' && $method === 'showMe')
            || ($controller === 'App\\Controllers\\Api\\AuthController' && in_array($method, ['changePassword', 'logout'], true));
        if (auth()->user()->requiresPasswordReset()
            && ! $allowed) {
            return service('response')->setStatusCode(403)->setJSON([
                'message' => 'Troque sua senha para continuar.',
                'code' => 'password_change_required',
            ]);
        }
    }
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null) { $response->setHeader('Cache-Control', 'no-store'); }
}
