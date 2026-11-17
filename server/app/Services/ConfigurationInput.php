<?php
namespace App\Services;

final class ConfigurationInput
{
    public function validate(array $body, ?array $existing): array
    {
        $profile = [];
        foreach (['block_minutes' => [5,180,25], 'break_minutes' => [0,30,5], 'weekly_question_goal' => [0,100000,0], 'weekly_minutes_goal' => [0,10080,0]] as $field => [$min,$max,$default]) {
            $value = $body[$field] ?? (int) ($existing[$field] ?? $default);
            if (!is_int($value) || $value < $min || $value > $max) throw new \InvalidArgumentException('Revise a duração dos blocos, pausas e metas. Use números inteiros dentro dos limites.');
            $profile[$field] = $value;
        }
        $zone = $body['timezone'] ?? ($existing['timezone'] ?? 'America/Manaus');
        if (!is_string($zone) || !in_array($zone, \DateTimeZone::listIdentifiers(), true)) throw new \InvalidArgumentException('Escolha um fuso horário válido.');
        $profile['timezone'] = $zone;
        $availability = $body['availability'] ?? [];
        if (!is_array($availability)) throw new \InvalidArgumentException('Informe a disponibilidade por dia.');
        foreach ($availability as $day => $minutes) if (!ctype_digit((string) $day) || (int) $day > 6 || !is_int($minutes) || $minutes < 0 || $minutes > 1440) throw new \InvalidArgumentException('Informe de 0 a 1440 minutos para cada dia da semana.');
        return [$profile, $availability];
    }
}
