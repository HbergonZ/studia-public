<?php

// Fixture local para o teste HTTP. Nunca executar por uma requisição web.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

define('FCPATH', dirname(__DIR__, 2) . '/public/');
define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development');
chdir(FCPATH);
require FCPATH . '../app/Config/Paths.php';
$paths = new Config\Paths();
require $paths->systemDirectory . '/Boot.php';
CodeIgniter\Boot::bootConsole($paths);

$file = WRITEPATH . 'testing/admin-users.json';
$users = model(setting('Auth.userProvider'));
$action = $argv[1] ?? '';
if ($action === 'setup') {
    if (is_file($file)) {
        throw new RuntimeException('Remova a fixture anterior com cleanup antes de continuar.');
    }
    $prefix = 'studia-admin-test-' . bin2hex(random_bytes(8));
    $password = bin2hex(random_bytes(16)) . 'Aa1!';
    $email = $prefix . '-admin@example.com';
    if (! is_dir(dirname($file))) mkdir(dirname($file), 0700, true);
    file_put_contents($file, json_encode(compact('prefix', 'email', 'password'), JSON_THROW_ON_ERROR));
    chmod($file, 0600);
    $user = $users->createNewUser(['username' => 'teste_' . bin2hex(random_bytes(8)), 'email' => $email, 'password' => $password]);
    if (! $users->save($user)) throw new RuntimeException('Não foi possível criar a fixture.');
    $user = $users->findById($users->getInsertID());
    $user->activate();
    $user->addGroup('admin');
    echo "Fixture temporária criada.\n";
} elseif ($action === 'cleanup') {
    if (! is_file($file)) exit;
    $fixture = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
    $prefix = $fixture['prefix'];
    if (! preg_match('/^studia-admin-test-[a-f0-9]{16}$/', $prefix)) throw new RuntimeException('Prefixo inválido.');
    $identities = db_connect()->table('auth_identities')->where('type', 'email_password')
        ->like('secret', $prefix . '-', 'after')->get()->getResultArray();
    foreach ($identities as $identity) $users->delete((int) $identity['user_id'], true);
    unlink($file);
    echo "Contas e credenciais temporárias removidas.\n";
} else {
    throw new InvalidArgumentException('Use setup ou cleanup.');
}
