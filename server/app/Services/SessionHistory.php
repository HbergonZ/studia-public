<?php
namespace App\Services;
use DateTimeImmutable;
final class SessionHistory
{
    public function rebuild(string $topicId): array
    {
        $db = db_connect(); $service = new ReviewScheduleService();
        $sessions = $db->table('study_sessions')->where('topic_id', $topicId)->orderBy('studied_on')->orderBy('id')->get()->getResultArray();
        $result = ['curve_position' => 0, 'first_reviewed_at' => null, 'last_reviewed_at' => null, 'next_review_at' => null, 'needs_continuation' => false];
        foreach ($sessions as $s) {
            $result['difficulty'] = (int) $s['difficulty'];
            $result['needs_continuation'] = !DailyStudyData::boolean($s['completes_topic']);
            if (!$result['needs_continuation']) {
                $position = $result['last_reviewed_at'] ? $result['curve_position'] : $service->initialPosition((int) $s['difficulty']);
                $schedule = $service->afterSession($position, (int) $s['correct_answers'], (int) $s['wrong_answers'], new DateTimeImmutable($s['studied_on']));
                $result['curve_position'] = $schedule['position']; $result['first_reviewed_at'] ??= $s['studied_on'] . ' 00:00:00';
                $result['last_reviewed_at'] = $s['studied_on'] . ' 00:00:00'; $result['next_review_at'] = $schedule['nextReviewAt'];
            }
        }
        $db->table('topics')->where('id', $topicId)->update($result); return $result;
    }
}
