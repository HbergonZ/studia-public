<?php
namespace App\Services;

final class DailyPlanner
{
    public function reason(array $topic, string $date): string
    {
        $due = $topic['nextReviewAt'] ? substr($topic['nextReviewAt'], 0, 10) : null;
        if ($due !== null && $due < $date) return 'Revisão vencida em ' . implode('/', array_reverse(explode('-', $due)));
        if ($due === $date) return 'Revisão prevista para este dia';
        if ($topic['continuation']) return 'Continuar o assunto iniciado';
        return $due ? 'Revisão antecipada, escolhida por você' : 'Avançar no conteúdo da matéria';
    }
    /** @param list<array> $topics @return list<array> */
    public function suggest(array $topics, string $date, int $capacity, int $spent, int $duration, int $pause): array
    {
        $reviews = []; $new = [];
        foreach ($topics as $topic) {
            if (($topic['plannedEarlier'] ?? false) || ($topic['isSource'] ?? false)) continue;
            $due = $topic['nextReviewAt'] ? substr($topic['nextReviewAt'], 0, 10) : null;
            if ($due !== null && $due <= $date) {
                $topic['reason'] = $this->reason($topic, $date);
                $topic['rank'] = $due < $date ? 0 : 1;
                $reviews[] = $topic;
            } elseif ($topic['continuation'] || $due === null) {
                $topic['reason'] = $this->reason($topic, $date);
                $topic['rank'] = $topic['continuation'] ? 0 : 1;
                $new[] = $topic;
            }
        }
        $remaining = max(0, $capacity - $spent); $blocks = []; $allocated = []; $reviewRun = 0;
        while ($reviews || $new) {
            $isReview = count($reviews) > 0 && ($reviewRun < 2 || !$new);
            $pool = $isReview ? $reviews : $new;
            usort($pool, static function ($a, $b) use ($allocated) {
                $rank = $a['rank'] <=> $b['rank'];
                if ($rank !== 0) return $rank;
                $scoreA = ($a['weeklyMinutes'] + ($allocated[$a['subjectId']] ?? 0)) / max(1, $a['weight']);
                $scoreB = ($b['weeklyMinutes'] + ($allocated[$b['subjectId']] ?? 0)) / max(1, $b['weight']);
                return ($scoreA <=> $scoreB) ?: ($b['weight'] <=> $a['weight']) ?: (($a['order'] ?? 0) <=> ($b['order'] ?? 0)) ?: strcmp($a['id'], $b['id']);
            });
            $topic = array_shift($pool);
            if ($isReview) { $reviews = $pool; $reviewRun++; } else { $new = $pool; $reviewRun = 0; }
            $rest = count($blocks) > 0 ? $pause : 0;
            $minutes = min($duration, $remaining - $rest);
            if ($minutes < 5) break;
            $blocks[] = ['id' => bin2hex(random_bytes(12)), 'topicId' => $topic['id'], 'minutes' => $minutes, 'status' => 'planned', 'reason' => $topic['reason']];
            $remaining -= $minutes + $rest;
            $allocated[$topic['subjectId']] = ($allocated[$topic['subjectId']] ?? 0) + $minutes;
        }
        return $blocks;
    }

    public function reservedMinutes(array $blocks, int $pause): int
    {
        $active = array_values(array_filter($blocks, static fn ($b) => $b['status'] !== 'deferred'));
        return array_sum(array_column($active, 'minutes')) + max(0, count($active) - 1) * $pause;
    }
}
