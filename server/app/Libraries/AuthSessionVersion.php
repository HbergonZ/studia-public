<?php
namespace App\Libraries;
final class AuthSessionVersion
{
    public static function current(int $id): int { return (int) (db_connect()->table('users')->select('auth_version')->where('id', $id)->get()->getRowArray()['auth_version'] ?? 0); }
    public static function remember(int $id): void { session()->set('studia_auth_version', self::current($id)); }
    public static function revoke(int $id): void { db_connect()->table('users')->where('id', $id)->set('auth_version', 'auth_version + 1', false)->update(); }
}
