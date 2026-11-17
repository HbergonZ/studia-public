<?php
namespace App\Services;

/** Exact consecutive source slices. No model-generated transcription. */
final class StudyUnitSplitter
{
    public function split(string $title, string $source): array
    {
        $source = trim($source); $pieces = []; $start = 0;
        // Decimal numbers and legislation identifiers have no whitespace after their dot.
        preg_match_all('/[.;!?]\s+(?=[\p{Lu}\d])/u', $source, $matches, PREG_OFFSET_CAPTURE);
        foreach ($matches[0] as [$separator, $offset]) {
            $end = $offset + 1;
            if (mb_strlen(substr($source, $start, $end - $start)) < 180) continue;
            // Avoid splitting after short abbreviations (art., nº., e.g.).
            if (preg_match('/(?:\b\pL{1,3})\.$/u', substr($source, max(0, $end - 10), min(10, $end)))) continue;
            $pieces[] = trim(substr($source, $start, $end - $start)); $start = $end;
            if (count($pieces) >= 79) break;
        }
        if (trim(substr($source, $start)) !== '') $pieces[] = trim(substr($source, $start));
        $units = [];
        foreach ($pieces as $index => $piece) {
            $label = preg_replace('/\s+/u', ' ', $piece);
            $units[] = ['title' => ($index + 1) . '. ' . mb_substr($label, 0, 150), 'source' => $piece];
        }
        return (new StudyUnitValidator())->topic(['title' => $title, 'source' => $source, 'units' => $units]);
    }
}
