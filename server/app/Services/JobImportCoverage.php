<?php
namespace App\Services;

/** Conservative local review of nearby uncovered text, never a completeness certificate. */
final class JobImportCoverage
{
    private array $lines;
    private array $pages = [];
    private array $repeated = [];

    public function __construct(string $text)
    {
        $this->lines = explode("\n", str_replace("\r\n", "\n", $text));
        $page = 1;
        foreach ($this->lines as $index => $line) {
            if (preg_match('/^\[\[PAGE (\d+)\]\]$/', trim($line), $match)) $page = (int) $match[1];
            $this->pages[$index + 1] = $page;
            $key = trim($line);
            if ($key !== '') $this->repeated[$key] = ($this->repeated[$key] ?? 0) + 1;
        }
    }

    private function boilerplate(int $line): bool
    {
        $text = trim($this->lines[$line - 1]);
        return $text === '' || preg_match('~^(?:\[\[PAGE |pcimarkpci|https?://|www\.|[\d\s]+$|P[áa]gina\s+\d)~iu', $text)
            || (mb_strlen($text) < 180 && ($this->repeated[$text] ?? 0) > 2);
    }

    private function boundary(int $line, array $inventory): bool
    {
        $text = trim($this->lines[$line - 1]);
        if (preg_match('/^(?:ANEXO\s+[IVX\d]|PERFIL\s+\d+\s*[:–-])/iu', $text)) return true;
        $normal = preg_replace('/[^\pL\pN]/u', '', mb_strtolower($text));
        foreach ($inventory['options'] as $option) {
            $name = preg_replace('/[^\pL\pN]/u', '', mb_strtolower($option['name']));
            if ($name === '' || !str_contains($normal, $name)) continue;
            // Only short headings, not a paragraph mentioning a profession.
            if (mb_strlen($text) < mb_strlen($option['name']) + 55
                && ($text === mb_strtoupper($text) || preg_match('/^(?:\d{2,4}\s|P[AE]S\s*-|PST\s*-|CARGO\s*:)/iu', $text))) return true;
        }
        return false;
    }

    private function gap(int $from, int $to, string $type, array $inventory): ?array
    {
        if ($to < $from || $to - $from > 100) return null;
        $useful = [];
        for ($line = $from; $line <= $to; $line++) {
            if ($this->boundary($line, $inventory)) return null;
            if (!$this->boilerplate($line) && preg_match_all('/\pL{3,}/u', $this->lines[$line - 1]) >= 3) $useful[] = $line;
        }
        if (!$useful) return null;
        $start = $useful[0]; $end = $useful[array_key_last($useful)];
        // Short final continuations such as "usando BPMN." still belong to the gap.
        for ($line = $end + 1; $line <= $to; $line++) if (!$this->boilerplate($line) && preg_match('/\pL/u', $this->lines[$line - 1])) $end = $line;
        $source = trim(implode("\n", array_slice($this->lines, $start - 1, $end - $start + 1)));
        if (mb_strlen($source) < 45) return null;
        return ['id' => hash('sha256', "$start:$end:$source"), 'start_line' => $start, 'end_line' => $end,
            'knowledge_type' => $type, 'page_start' => $this->pages[$start], 'page_end' => $this->pages[$end],
            'source' => $source, 'context' => trim(implode("\n", array_slice($this->lines, max(0, $start - 4), min(count($this->lines), $end + 3) - max(0, $start - 4))))];
    }

    public function analyze(array $inventory, array $content): array
    {
        $sections = $content['sections'];
        usort($sections, static fn($a, $b) => $a['start_line'] <=> $b['start_line']);
        $gaps = [];
        foreach ($sections as $index => $section) {
            $next = $sections[$index + 1] ?? null;
            if ($next) {
                $gap = $this->gap($section['end_line'] + 1, $next['start_line'] - 1, $section['knowledge_type'], $inventory);
                if ($gap) $gaps[$gap['id']] = $gap;
            }
            // Inspect the tail only when a definite next heading bounds it.
            // Never extend through another job or beyond the document.
            if ($section['knowledge_type'] !== 'specific') continue;
            $end = min(count($this->lines), $section['end_line'] + 100, $next ? $next['start_line'] - 1 : count($this->lines));
            for ($line = $section['end_line'] + 1; $line <= $end; $line++) {
                if (!$this->boundary($line, $inventory)) continue;
                $gap = $this->gap($section['end_line'] + 1, $line - 1, 'specific', $inventory);
                if ($gap) $gaps[$gap['id']] = $gap;
                break;
            }
        }
        $decisions = [];
        foreach ($content['coverage_decisions'] ?? [] as $decision) {
            if (isset($gaps[$decision['gap_id'] ?? '']) && ($decision['decision'] ?? '') === 'not_applicable'
                && is_string($decision['reason'] ?? null) && trim($decision['reason']) !== '') $decisions[$decision['gap_id']] = $decision;
        }
        $pending = array_values(array_filter($gaps, static fn($gap) => !isset($decisions[$gap['id']])));
        return ['status' => $pending ? 'needs_attention' : 'ready_for_review', 'pending' => $pending,
            'decisions' => array_values($decisions), 'checked_sections' => count($sections),
            'limitation' => 'A conferência procura lacunas próximas aos blocos encontrados. Compare também as matérias e os anexos com o PDF.'];
    }
}
