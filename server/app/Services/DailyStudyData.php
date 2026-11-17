<?php
namespace App\Services;

use DateTimeImmutable;
use DateTimeZone;

final class DailyStudyData
{
    public static function boolean(mixed $value): bool { return in_array($value, [true, 1, '1', 't', 'true'], true); }

    public function today(int $userId): string
    {
        $profile = db_connect()->table('study_profiles')->where('user_id', $userId)->get()->getRowArray();
        return (new DateTimeImmutable('now', new DateTimeZone($profile['timezone'] ?? 'America/Manaus')))->format('Y-m-d');
    }

    public function context(int $userId, string $date): array
    {
        $db = db_connect();
        $notice = $db->table('notices')->where(['user_id' => $userId, 'status' => 'confirmed', 'deleted_at' => null])->get()->getRowArray();
        if (!$notice) throw new \InvalidArgumentException('Ative um edital antes de organizar os estudos.');
        $rows = $db->query("SELECT t.*,s.name subject_name,s.id subject_id,s.weight,s.color,COALESCE(s.weight_override,(SELECT MAX(ocw.weight) FROM option_content_groups ocw JOIN selectable_options ow ON ow.id=ocw.option_id WHERE ocw.content_group_id=g.id AND ow.is_selected=TRUE),s.weight) selected_weight FROM topics t
            JOIN subjects s ON s.id=t.subject_id JOIN content_groups g ON g.id=s.content_group_id
            WHERE s.notice_id=? AND (g.applies_to_all=TRUE OR EXISTS (SELECT 1 FROM option_content_groups oc
                JOIN selectable_options o ON o.id=oc.option_id WHERE oc.content_group_id=g.id AND o.is_selected=TRUE))
            ORDER BY s.sort_order,t.sort_order,t.id", [$notice['id']])->getResultArray();
        $start = (new DateTimeImmutable($date))->modify('monday this week')->format('Y-m-d');
        $weekly = $db->query('SELECT s.id,SUM(ss.minutes) minutes FROM study_sessions ss JOIN topics t ON t.id=ss.topic_id JOIN subjects s ON s.id=t.subject_id WHERE ss.user_id=? AND s.notice_id=? AND ss.studied_on>=? AND ss.studied_on<=? GROUP BY s.id', [$userId, $notice['id'], $start, $date])->getResultArray();
        $weeklyBySubject = array_column($weekly, 'minutes', 'id');
        $topics = [];
        foreach ($rows as $t) $topics[(string) $t['id']] = [
            'id' => (string) $t['id'], 'subjectId' => (string) $t['subject_id'], 'title' => self::boolean($t['is_source']) ? mb_substr($t['name'],0,180) : $t['name'], 'sourceText' => $t['source_text'], 'isSource' => self::boolean($t['is_source']), 'subjectName' => $t['subject_name'],
            'weight' => (float) $t['selected_weight'], 'color' => (int) $t['color'], 'difficulty' => (int) $t['difficulty'],
            'nextReviewAt' => $t['next_review_at'], 'continuation' => self::boolean($t['needs_continuation']),
            'weeklyMinutes' => (int) ($weeklyBySubject[$t['subject_id']] ?? 0),
            'order' => count($topics),
        ];
        // Do not book the same pending work in several future days. A missed plan
        // becomes eligible again when its date is in the past, so work is not lost.
        $today = $this->today($userId);
        if ($date > $today) {
            $earlierPlans = $db->table('daily_study_plans')->where(['user_id' => $userId, 'notice_id' => $notice['id']])
                ->where('study_date >=', $today)->where('study_date <', $date)->get()->getResultArray();
            foreach ($earlierPlans as $earlier) foreach (json_decode($earlier['blocks'], true, 512, JSON_THROW_ON_ERROR) as $block) {
                if ($block['status'] !== 'planned' || !isset($topics[$block['topicId']])) continue;
                $topics[$block['topicId']]['plannedEarlier'] = true;
                if ($earlier['study_date'] >= $start) $topics[$block['topicId']]['weeklyMinutes'] += $block['minutes'];
            }
        }
        $profile = $db->table('study_profiles')->where('user_id', $userId)->get()->getRowArray();
        $weekday = (int) (new DateTimeImmutable($date))->format('N') - 1;
        $availability = $db->table('availabilities')->where(['user_id' => $userId, 'weekday' => $weekday])->get()->getRowArray();
        // Availability is shared across notices, so all study time reduces today's remaining budget.
        $spent = $db->table('study_sessions')->selectSum('minutes')->where(['user_id' => $userId, 'studied_on' => $date])->get()->getRowArray();
        return ['noticeId' => (int) $notice['id'], 'topics' => $topics, 'capacityMinutes' => (int) ($availability['minutes'] ?? 0),
            'spentMinutes' => (int) ($spent['minutes'] ?? 0), 'blockMinutes' => (int) ($profile['block_minutes'] ?? 25), 'breakMinutes' => (int) ($profile['break_minutes'] ?? 5)];
    }

    public function present(?array $row, array $context, string $date): array
    {
        $blocks = $row ? json_decode($row['blocks'], true, 512, JSON_THROW_ON_ERROR) : ($date < $this->today((int) auth()->id()) ? [] : (new DailyPlanner())->suggest(array_values($context['topics']), $date, $context['capacityMinutes'], $context['spentMinutes'], $context['blockMinutes'], $context['breakMinutes']));
        foreach ($blocks as &$block) {
            $topic = $context['topics'][$block['topicId']] ?? null;
            $block['topic'] = $topic;
            if (!$topic && $block['status'] === 'planned') $block['status'] = 'deferred';
        }
        unset($block);
        return ['id' => $row ? (string) $row['id'] : null, 'date' => $date, 'noticeId' => (string) $context['noticeId'],
            'version' => (int) ($row['version'] ?? 0), 'blockMinutes' => (int) ($row['block_minutes'] ?? $context['blockMinutes']),
            'breakMinutes' => (int) ($row['break_minutes'] ?? $context['breakMinutes']), 'capacityMinutes' => $context['capacityMinutes'],
            'spentMinutes' => $context['spentMinutes'], 'blocks' => $blocks, 'topics' => array_values(array_filter($context['topics'], static fn($t) => !$t['isSource'])), 'today' => $this->today((int) ($row['user_id'] ?? auth()->id()))];
    }
}
