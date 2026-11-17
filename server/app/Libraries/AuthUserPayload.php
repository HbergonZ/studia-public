<?php

namespace App\Libraries;

use CodeIgniter\Shield\Entities\User;

final class AuthUserPayload
{
    public static function from(User $user): array
    {
        return [
            'id' => $user->id,
            'email' => $user->email,
            'username' => $user->username,
            'isAdmin' => $user->inGroup('admin', 'superadmin'),
            'mustChangePassword' => $user->requiresPasswordReset(),
            'hasActiveNotice' => (new \App\Models\NoticeModel())->select('id')->where(['user_id' => $user->id, 'status' => 'confirmed'])->first() !== null,
            'csrfToken' => csrf_hash(),
        ];
    }
}
