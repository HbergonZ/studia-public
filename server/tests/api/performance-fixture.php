<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('FCPATH', dirname(__DIR__,2) . '/public/'); define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development'); chdir(FCPATH);
require FCPATH . '../app/Config/Paths.php'; $paths = new Config\Paths(); require $paths->systemDirectory . '/Boot.php'; CodeIgniter\Boot::bootConsole($paths);
$fixture = json_decode(file_get_contents(WRITEPATH . 'testing/admin-users.json'),true,512,JSON_THROW_ON_ERROR);
if (!preg_match('/^studia-admin-test-[a-f0-9]{16}$/',$fixture['prefix'])) throw new RuntimeException('Temporary fixture required.');
$user = model(setting('Auth.userProvider'))->findByCredentials(['email' => $fixture['email']]);
if (!$user) throw new RuntimeException('Fixture account not found.');
$db = db_connect(); $uid = (int) $user->id;
$db->transStart();
$notice = (new App\Models\NoticeModel())->insert(['user_id' => $uid,'title' => 'Carga isolada de desempenho','source' => 'manual','status' => 'extracted'],true);
$group = (new App\Models\ContentGroupModel())->insert(['notice_id' => $notice,'external_ref' => 'performance','name' => 'Conhecimentos gerais','knowledge_type' => 'general','applies_to_all' => true],true);
$subject = (new App\Models\SubjectModel())->insert(['notice_id' => $notice,'content_group_id' => $group,'name' => 'Matéria de teste','weight' => 5,'color' => 1],true);
$topics = []; for ($i=0;$i<5000;$i++) $topics[]=['subject_id' => $subject,'name' => 'Unidade de teste ' . $i,'difficulty' => 10,'sort_order' => $i];
$db->table('topics')->insertBatch($topics, null, 500);
$ids = array_column($db->table('topics')->select('id')->where('subject_id',$subject)->get()->getResultArray(),'id');
$sessions = []; foreach ($ids as $id) for ($n=0;$n<2;$n++) $sessions[]=['user_id' => $uid,'topic_id' => $id,'studied_on' => '2025-01-01','minutes' => 10,'correct_answers' => 1,'wrong_answers' => 1,'difficulty' => 10,'completes_topic' => false];
$db->table('study_sessions')->insertBatch($sessions,null,500);
$db->transComplete();
$timings = [];
for ($i=0;$i<5;$i++) { $start=microtime(true); $data=(new App\Services\DashboardData())->load($uid,(int)$notice); $timings[]=round((microtime(true)-$start)*1000,1); }
$result=['topics'=>count($data['materias'][0]['topicos']),'sessions'=>count($data['sessoes']),'payloadBytes'=>strlen(json_encode($data,JSON_THROW_ON_ERROR)),'loadMilliseconds'=>$timings];
if ($result['topics']!==5000 || $result['sessions']!==10000) throw new RuntimeException('Incomplete benchmark data.');
file_put_contents(WRITEPATH.'testing/performance-result.json',json_encode($result,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR)); echo json_encode($result,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;
