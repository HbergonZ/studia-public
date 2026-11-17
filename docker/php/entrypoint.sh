#!/bin/sh
set -eu

if [ ! -f vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist
fi

mkdir -p writable/cache writable/debugbar writable/logs writable/session writable/uploads
chmod -R u+rwX,g+rwX writable

encryption_key="$(printenv 'encryption.key' || true)"
if [ -z "$encryption_key" ]; then
    encryption_key="hex2bin:$(php -r 'echo bin2hex(random_bytes(32));')"
    echo 'Chave de criptografia temporária gerada para esta execução.'
fi

php spark migrate --all

exec env "encryption.key=$encryption_key" "$@"
