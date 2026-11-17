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
        if (!is_array($data) || !is_string($data['email'] ?? null) || !is_string($data['password'] ?? null) || strlen($data['email']) > 254 || strlen($data['password']) > 72) return $this->failValidationErrors('Informe e-mail e senha válidos.');
        $email = trim($data['email']);
        $password = $data['password'];
        if ($email === '' || $password === '') {
            return $this->failValidationErrors('Informe e-mail e senha.');
        }

        $throttler = service('throttler');
        if (!$throttler->check('studia-login-ip-' . hash('sha256', $this->request->getIPAddress()),100,300)) return $this->respond(['message' => 'Muitas tentativas de acesso. Aguarde antes de tentar novamente.'],429)->setHeader('Retry-After','30');
        $bucket = 'studia-login-' . hash('sha256', strtolower($email) . '|' . $this->request->getIPAddress());
        if (!$throttler->check($bucket, 10, 300)) return $this->respond(['message' => 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.'], 429)->setHeader('Retry-After', (string) max(1, $throttler->getTokenTime()));

        $authenticator = auth('session')->getAuthenticator();
        $result = $authenticator->attempt(['email' => $email, 'password' => $password]);
        if (! $result->isOK()) {
            return $this->failUnauthorized('E-mail ou senha incorretos.');
        }

        \App\Libraries\AuthSessionVersion::remember((int) auth()->id());
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

    public function changePassword()
    {
        $data = $this->request->getJSON(true) ?? [];
        if (! is_array($data)) {
            return $this->failValidationErrors('Informe os dados da troca de senha em JSON.');
        }
        $current = $data['current_password'] ?? null;
        $password = $data['password'] ?? null;
        $confirmation = $data['password_confirm'] ?? null;
        if (! is_string($current) || ! is_string($password) || ! is_string($confirmation)) {
            return $this->failValidationErrors('Informe a senha atual e confirme a nova senha.');
        }
        $user = auth()->user();
        $passwords = service('passwords');
        if (! $passwords->verify($current, $user->password_hash)) {
            return $this->failValidationErrors('A senha atual não confere.');
        }
        if ($password !== $confirmation || $password === $current) {
            return $this->failValidationErrors('Confirme uma nova senha diferente da atual.');
        }
        if (strlen($password) > 72 || strlen($password) < 8) {
            return $this->failValidationErrors('Use uma senha entre 8 e 72 bytes.');
        }
        $result = $passwords->check($password, $user);
        if (! $result->isOK()) {
            return $this->failValidationErrors($result->reason());
        }
        $users = model(setting('Auth.userProvider'));
        $db = db_connect();
        $db->transBegin();
        try {
            $user->password = $password;
            if (! $users->save($user)) {
                $db->transRollback();
                return $this->failValidationErrors('Não foi possível salvar a nova senha.');
            }
            $user->undoForcePasswordReset();
            \App\Libraries\AuthSessionVersion::revoke((int) $user->id);
            if (! $db->transStatus()) {
                throw new \RuntimeException('Falha ao atualizar a senha.');
            }
            $db->transCommit();
        } catch (\Throwable $error) {
            $db->transRollback();
            log_message('error', 'Falha na troca de senha: {type}', ['type' => get_class($error)]);
            return $this->failServerError('Não foi possível trocar a senha. Tente novamente.');
        }
        session()->regenerate(true);
        \App\Libraries\AuthSessionVersion::remember((int) $user->id);
        return $this->respond(['user' => $this->userPayload($users->findById($user->id))])
            ->setHeader('Cache-Control', 'no-store');
    }

    private function userPayload($user): array
    {
        return \App\Libraries\AuthUserPayload::from($user);
    }
}
