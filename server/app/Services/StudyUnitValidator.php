<?php
namespace App\Services;

use RuntimeException;

final class StudyUnitValidator
{
    public function json(string $response): array
    {
        if (strlen($response) > 1024 * 1024) throw new RuntimeException('A resposta deve ter no máximo 1 MB.');
        try { $value = json_decode(preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($response)), true, 64, JSON_THROW_ON_ERROR); }
        catch (\JsonException) { throw new RuntimeException('Cole um objeto JSON completo e válido.'); }
        if (!is_array($value) || array_is_list($value)) throw new RuntimeException('A resposta deve ser um objeto JSON.');
        return $value;
    }

    public function topic(mixed $topic): array
    {
        if (!is_array($topic)) throw new RuntimeException('Cada assunto organizado deve conter title, source e units.');
        $title = $this->text($topic['title'] ?? null, 180);
        $source = $this->text($topic['source'] ?? null, 20000);
        $units = $topic['units'] ?? null;
        if (!is_array($units) || !array_is_list($units) || count($units) < 1 || count($units) > 100) throw new RuntimeException('Cada assunto deve ter entre 1 e 100 unidades.');
        $result = []; $titles = []; $joined = '';
        foreach ($units as $index => $unit) {
            if (!is_array($unit)) throw new RuntimeException('Unidade de estudo inválida.');
            $name = $this->text($unit['title'] ?? null, 180);
            $excerpt = $this->text($unit['source'] ?? null, 20000);
            $key = mb_strtolower($name);
            if (isset($titles[$key])) throw new RuntimeException('O título "' . $name . '" se repete nas unidades ' . $titles[$key] . ' e ' . ($index + 1) . ' do assunto "' . $title . '". Peça à IA títulos específicos e únicos para cada foco, sem alterar os trechos originais.');
            $titles[$key] = $index + 1; $joined .= $excerpt;
            $result[] = ['title' => $name, 'source' => $excerpt];
        }
        if ($this->normalized($joined) !== $this->normalized($source)) throw new RuntimeException('Os trechos das unidades devem reproduzir todo o original, na mesma ordem e sem omissões ou duplicações: ' . $title);
        return ['title' => $title, 'source' => $source, 'units' => $result];
    }

    public function normalized(string $text): string { return preg_replace('/\s+/u', '', $text); }

    private function text(mixed $text, int $limit): string
    {
        if (!is_string($text) || trim($text) === '' || mb_strlen($text) > $limit) throw new RuntimeException('Título ou trecho vazio, inválido ou acima do limite (' . $limit . ' caracteres).');
        return trim($text);
    }

    public function summary(array $structure): array
    {
        $subjects = 0; $units = 0; $sources = 0; $legacy = 0;
        foreach ($structure['groups'] as $group) foreach ($group['subjects'] as $subject) {
            $subjects++;
            foreach ($subject['topics'] as $topic) {
                $sources++;
                if (is_string($topic)) { $legacy++; $units++; }
                else $units += count($topic['units']);
            }
        }
        return compact('subjects', 'sources', 'units', 'legacy');
    }
}
