<?php

namespace App\Controllers\Api\V1;

final class UsersController extends ApiController
{
    public function resetAccess($id)
    {
        if (!auth()->user()->inGroup('admin', 'superadmin')) return $this->failForbidden('Acesso restrito ao administrador.');
        $users = model(setting('Auth.userProvider')); $user = $users->findById((int) $id);
        if (!$user) return $this->failNotFound('Conta não encontrada.');
        if ((int) $id === $this->userId() || $user->inGroup('admin', 'superadmin')) return $this->failForbidden('Use a recuperação assistida para contas de administrador.');
        $db = db_connect(); $db->transBegin();
        try {
            $db->query('SELECT pg_advisory_xact_lock(?)', [(int) $id]);
            $password = bin2hex(random_bytes(12)) . 'Aa1!'; $user->password = $password;
            if (!$users->save($user)) throw new \RuntimeException('Save failed');
            $user->forcePasswordReset(); \App\Libraries\AuthSessionVersion::revoke((int) $id);
            if (!$db->transStatus()) throw new \RuntimeException('Transaction failed');
            $db->transCommit();
            log_message('notice', 'Acesso redefinido pelo administrador {admin} para conta {id}.', ['admin' => $this->userId(), 'id' => (int) $id]);
            $url = rtrim(config('App')->baseURL, '/') . '/entrar';
            return $this->respond(['message' => "Seu acesso ao Studia foi redefinido.\n\nAcesso: {$url}\nLogin: {$user->email}\nSenha temporária: {$password}\n\nEntre e escolha uma nova senha. As sessões anteriores foram encerradas."])->setHeader('Cache-Control', 'no-store');
        } catch (\Throwable $e) { $db->transRollback(); return $this->failServerError('Não foi possível redefinir o acesso. Tente novamente.'); }
    }

    public function index()
    {
        if (! auth()->user()->inGroup('admin', 'superadmin')) {
            return $this->failForbidden('Acesso restrito ao administrador.');
        }
        $users = model(setting('Auth.userProvider'))->orderBy('id', 'DESC')->findAll();
        return $this->respond(array_map(static fn ($user) => [
            'id' => $user->id,
            'email' => $user->email,
            'isAdmin' => $user->inGroup('admin', 'superadmin'),
            'mustChangePassword' => $user->requiresPasswordReset(),
        ], $users))->setHeader('Cache-Control', 'no-store');
    }

    public function create()
    {
        if (! auth()->user()->inGroup('admin', 'superadmin')) {
            return $this->failForbidden('Acesso restrito ao administrador.');
        }
        $data = $this->request->getJSON(true);
        if (! is_array($data)) {
            return $this->failValidationErrors('Informe os dados da conta em JSON.');
        }
        $email = $data['email'] ?? null;
        if (! is_string($email) || strlen($email = trim($email)) > 254
            || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->failValidationErrors('Informe um e-mail válido.');
        }
        $email = strtolower($email);
        $users = model(setting('Auth.userProvider'));
        if ($users->findByCredentials(['email' => $email]) !== null) {
            return $this->failResourceExists('Este e-mail já está cadastrado.');
        }
        $password = bin2hex(random_bytes(12)) . 'Aa1!';
        $user = $users->createNewUser([
            'username' => 'usuario_' . bin2hex(random_bytes(8)),
            'email' => $email,
            'password' => $password,
        ]);
        $db = db_connect();
        $db->transBegin();
        try {
            if (! $users->save($user)) {
                $db->transRollback();
                return $this->failValidationErrors('Não foi possível criar a conta. Verifique o e-mail.');
            }
            $user = $users->findById($users->getInsertID());
            $user->addGroup('user');
            $user->activate();
            $user->forcePasswordReset();
            if (! $db->transStatus()) {
                throw new \RuntimeException('Falha ao criar a conta.');
            }
            $db->transCommit();
        } catch (\Throwable $error) {
            $db->transRollback();
            log_message('error', 'Falha ao criar usuário: {type}', ['type' => get_class($error)]);
            return $this->failServerError('Não foi possível criar a conta. Tente novamente.');
        }
        $url = rtrim(config('App')->baseURL, '/') . '/entrar';
        $message = "Olá! Criei sua conta no Studia.\n\nAcesso: {$url}\nLogin: {$email}\nSenha temporária: {$password}\n\nNo primeiro acesso, você precisará escolher uma nova senha. Não compartilhe seus dados de acesso.";
        return $this->respondCreated([
            'user' => ['id' => $user->id, 'email' => $email, 'isAdmin' => false, 'mustChangePassword' => true],
            'message' => $message,
        ])->setHeader('Cache-Control', 'no-store');
    }
}
