<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

final class NormalizeAvailabilityWeekdays extends Migration
{
    public function up(): void
    {
        // Versões anteriores enviavam segunda como 1 e domingo como 7, embora
        // o banco aceite apenas 0 a 6. Converte somente usuários no formato legado.
        $this->db->query(<<<'SQL'
WITH legacy AS (
    DELETE FROM availabilities a
    WHERE NOT EXISTS (
        SELECT 1 FROM availabilities first_day
        WHERE first_day.user_id = a.user_id AND first_day.weekday = 0
    )
    RETURNING user_id, weekday, minutes, created_at, updated_at
)
INSERT INTO availabilities (user_id, weekday, minutes, created_at, updated_at)
SELECT user_id, weekday - 1, minutes, created_at, updated_at FROM legacy
SQL);
    }

    public function down(): void
    {
        // A normalização corrige dados ambíguos e não deve recriar o formato inválido.
    }
}
