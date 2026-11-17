<?php
namespace App\Services;

final class DashboardData
{
    public function load(int $uid, ?int $noticeId): array
    {
        $db = db_connect();
        $query = $db->table('notices')->where(['user_id' => $uid, 'deleted_at' => null]);
        $notice = ($noticeId === null ? $query->where('status', 'confirmed') : $query->where('id', $noticeId))->get()->getRowArray();
        if ($noticeId !== null && !$notice) throw new \OutOfBoundsException('Edital não encontrado.');
        $subjects = []; $options = []; $sessions = []; $sources = [];
        if ($notice) {
            $optionRows = $db->table('selectable_options')->where('notice_id', $notice['id'])->orderBy('sort_order')->orderBy('id')->get()->getResultArray();
            foreach ($optionRows as $o) $options[] = ['id' => (string) $o['id'], 'codigo' => $o['code'], 'nome' => $o['name'], 'tipo' => $o['kind'], 'selecionada' => DailyStudyData::boolean($o['is_selected'])];
            $applications = $db->query('SELECT oc.*,o.is_selected FROM option_content_groups oc JOIN selectable_options o ON o.id=oc.option_id WHERE o.notice_id=?', [$notice['id']])->getResultArray();
            $byGroup = []; foreach ($applications as $a) $byGroup[$a['content_group_id']][] = $a;
            $rows = $db->query('SELECT s.*,g.name group_name,g.knowledge_type,g.applies_to_all FROM subjects s JOIN content_groups g ON g.id=s.content_group_id WHERE s.notice_id=? ORDER BY s.sort_order,s.id', [$notice['id']])->getResultArray();
            $topics = $db->query('SELECT t.*,COALESCE(q.correct,0) correct,COALESCE(q.wrong,0) wrong FROM topics t JOIN subjects s ON s.id=t.subject_id LEFT JOIN (SELECT topic_id,SUM(correct_answers) correct,SUM(wrong_answers) wrong FROM study_sessions WHERE user_id=? GROUP BY topic_id) q ON q.topic_id=t.id WHERE s.notice_id=? ORDER BY t.sort_order,t.id', [$uid,$notice['id']])->getResultArray();
            $bySubject = [];
            foreach ($topics as $t) {
                $topic = ['id' => (string) $t['id'], 'nome' => $t['name'], 'textoOriginal' => $t['source_text'], 'origemId' => $t['parent_topic_id'] === null ? null : (string) $t['parent_topic_id'], 'dificuldade' => (int) $t['difficulty'], 'posicaoCurva' => (int) $t['curve_position'], 'primeiraRevisao' => $t['first_reviewed_at'], 'ultimaRevisao' => $t['last_reviewed_at'], 'proximaRevisao' => $t['next_review_at'], 'emAndamento' => DailyStudyData::boolean($t['needs_continuation']), 'questoes' => ['acertos' => (int) $t['correct'], 'erros' => (int) $t['wrong']]];
                if (DailyStudyData::boolean($t['is_source'])) $sources[] = $topic + ['materiaId' => (string) $t['subject_id']];
                else $bySubject[$t['subject_id']][] = $topic;
            }
            foreach ($rows as $s) {
                $apps = $byGroup[$s['content_group_id']] ?? [];
                $selected = array_filter($apps, static fn ($a) => DailyStudyData::boolean($a['is_selected']));
                $weights = array_filter(array_column($selected, 'weight'), static fn ($w) => $w !== null);
                $defaultWeight = (float) ($weights ? max($weights) : $s['weight']);
                $subjects[] = ['id' => (string) $s['id'], 'areaId' => (string) $s['content_group_id'], 'nome' => $s['name'], 'grupoNome' => $s['group_name'], 'tipoConhecimento' => $s['knowledge_type'], 'aplicaATodos' => DailyStudyData::boolean($s['applies_to_all']), 'selecionada' => DailyStudyData::boolean($s['applies_to_all']) || count($selected) > 0, 'opcaoIds' => array_map('strval', array_column($apps, 'option_id')), 'peso' => (float) ($s['weight_override'] ?? $defaultWeight), 'pesoPadrao' => $defaultWeight, 'pesoPersonalizado' => $s['weight_override'] !== null, 'cor' => (int) $s['color'], 'topicos' => $bySubject[$s['id']] ?? []];
            }
            $sessionRows = $db->query('SELECT ss.*,s.id subject_id FROM study_sessions ss JOIN topics t ON t.id=ss.topic_id JOIN subjects s ON s.id=t.subject_id WHERE ss.user_id=? AND s.notice_id=? ORDER BY ss.studied_on,ss.id', [$uid,$notice['id']])->getResultArray();
            foreach ($sessionRows as $s) $sessions[] = ['id' => (string) $s['id'], 'materiaId' => (string) $s['subject_id'], 'topicoId' => (string) $s['topic_id'], 'data' => $s['studied_on'], 'tempoMinutos' => (int) $s['minutes'], 'acertos' => (int) $s['correct_answers'], 'erros' => (int) $s['wrong_answers'], 'dificuldade' => (int) $s['difficulty'], 'concluiuAssunto' => DailyStudyData::boolean($s['completes_topic']), 'corrigida' => $s['corrected_at'] !== null];
        }
        $availability = array_fill_keys(['segunda','terca','quarta','quinta','sexta','sabado','domingo'], 0);
        $keys = array_keys($availability);
        foreach ($db->table('availabilities')->where('user_id', $uid)->get()->getResultArray() as $a) $availability[$keys[(int) $a['weekday']]] = (int) $a['minutes'] / 60;
        $profile = $db->table('study_profiles')->where('user_id', $uid)->get()->getRowArray();
        return ['edital' => $notice ? ['id' => $notice['id'], 'nome' => $notice['title'], 'status' => $notice['status'], 'temConteudoProgramatico' => $notice['has_study_syllabus'] === null ? null : DailyStudyData::boolean($notice['has_study_syllabus'])] : null, 'opcoes' => $options, 'areas' => $options, 'materias' => $subjects, 'origens' => $sources, 'sessoes' => $sessions, 'configuracao' => ['disponibilidade' => $availability, 'blocoMinutos' => (int) ($profile['block_minutes'] ?? 25), 'pausaMinutos' => (int) ($profile['break_minutes'] ?? 5), 'hoje' => (new DailyStudyData())->today($uid), 'timezone' => $profile['timezone'] ?? 'America/Manaus', 'metas' => ['questoesPorSemana' => (int) ($profile['weekly_question_goal'] ?? 0), 'minutosPorSemana' => (int) ($profile['weekly_minutes_goal'] ?? 0)]]];
    }
}
