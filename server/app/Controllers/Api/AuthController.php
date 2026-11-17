<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Authentication\Authenticators\Session;
use CodeIgniter\Shield\Exceptions\ValidationException;

final class AuthController extends ResourceController
{
    protected $format = 'json';

    public function login()
    {
        $data = $this->request->getJSON(true) ?? [];
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        if ($email === '' || $password === '') {
            return $this->failValidationErrors('Informe e-mail e senha.');
        }

        $authenticator = auth('session')->getAuthenticator();
        $result = $authenticator->attempt(['email' => $email, 'password' => $password]);
        if (! $result->isOK()) {
            return $this->failUnauthorized($result->reason());
        }

        return $this->respond(['user' => $this->userPayload(auth()->user())]);
    }

    public function register()
    {
        if (! setting('Auth.allowRegistration')) {
            return $this->failForbidden('O cadastro está desabilitado.');
        }
        $data = $this->request->getJSON(true) ?? [];
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            return $this->failValidationErrors('Use um e-mail válido e uma senha com pelo menos 8 caracteres.');
        }
        if ($password !== (string) ($data['password_confirm'] ?? '')) {
            return $this->failValidationErrors('A confirmação da senha não confere.');
        }

        $users = model(setting('Auth.userProvider'));
        assert($users instanceof UserModel);
        if ($users->findByCredentials(['email' => $email]) !== null) {
            return $this->failResourceExists('Este e-mail já está cadastrado.');
        }

        $username = preg_replace('/[^a-z0-9_]/i', '_', strstr($email, '@', true) ?: 'usuario') . '_' . bin2hex(random_bytes(3));
        $user = $users->createNewUser(['username' => $username, 'email' => $email, 'password' => $password]);
        try {
            $users->save($user);
        } catch (ValidationException) {
            return $this->failValidationErrors($users->errors());
        }
        $user = $users->findById($users->getInsertID());
        $users->addToDefaultGroup($user);
        $user->activate();
        /** @var Session $authenticator */
        $authenticator = auth('session')->getAuthenticator();
        $authenticator->startLogin($user);
        $authenticator->completeLogin($user);

        return $this->respondCreated(['user' => $this->userPayload($user)]);
    }

    public function logout()
    {
        auth()->logout();
        return $this->respond(['ok' => true]);
    }

    private function userPayload($user): array
    {
        return ['id' => $user->id, 'email' => $user->email ?? null, 'username' => $user->username ?? null];
    }
}
