<?php
// Isolated DB queue recovery regression. No provider calls.
if (PHP_SAPI !== 'cli') exit(2);
define('FCPATH', dirname(__DIR__, 2) . '/public/'); define('ENVIRONMENT', getenv('CI_ENVIRONMENT') ?: 'development');
chdir(FCPATH); require FCPATH . '../app/Config/Paths.php'; $paths = new Config\Paths(); require $paths->systemDirectory . '/Boot.php'; CodeIgniter\Boot::bootConsole($paths);
$fixture = json_decode(file_get_contents(WRITEPATH . 'testing/admin-users.json'), true);
$db = db_connect(); $uid = $db->table('auth_identities')->where(['type' => 'email_password', 'secret' => $fixture['email']])->get()->getRow('user_id');
if (!$uid || !str_starts_with($fixture['email'], $fixture['prefix'])) throw new RuntimeException('Missing isolated fixture');
$notice = (new App\Models\NoticeModel())->insert(['user_id' => $uid, 'title' => 'Queue regression', 'source' => 'pdf', 'status' => 'draft'], true);
$text = "[[PAGE 1]]\n725 - Enfermeiro\n[[PAGE 2]]\nCONHECIMENTOS ESPECIFICOS\n725 - Enfermeiro\nBiosseguranca e seguranca do paciente.";
$db->table('notice_import_drafts')->insert(['notice_id' => $notice, 'source_text' => $text, 'source_hash' => hash('sha256',$text), 'status' => 'inventory_processing']);
$inventory = ['title' => 'Teste', 'has_study_syllabus' => true, 'options' => [['ref'=>'725','code'=>'725','name'=>'Enfermeiro','kind'=>'job','level'=>null,'source_line'=>2,'general_expected'=>false,'specific_expected'=>true]], 'syllabus_pages'=>[2], 'warnings'=>[]];
$jobs = new App\Services\ImportJobs(static fn($source,$task) => ($task['validate'])($inventory));
$jobs->enqueue($notice, 1, 'inventory'); $jobs->processOne($notice);
$row = $db->table('notice_import_drafts')->where('notice_id',$notice)->get()->getRowArray();
if ($row['status'] !== 'inventory_ready') throw new RuntimeException('Worker failed to save a valid task');
$saved = $row['inventory'];
$db->table('notice_import_drafts')->where('notice_id',$notice)->update(['revision'=>2,'status'=>'inventory_processing']);
$jobs->enqueue($notice, 2, 'inventory');
(new App\Services\ImportJobs(static function ($source,$task) use ($db,$notice,$inventory) {
    $db->table('notice_import_drafts')->where('notice_id',$notice)->update(['revision'=>3,'status'=>'cancelled']);
    $db->table('notice_import_jobs')->where('notice_id',$notice)->where('status','running')->update(['status'=>'cancelled']);
    return ($task['validate'])($inventory);
}))->processOne($notice);
$row = $db->table('notice_import_drafts')->where('notice_id',$notice)->get()->getRowArray();
if ($row['status'] !== 'cancelled' || $row['inventory'] !== $saved || (int)$row['revision'] !== 3) throw new RuntimeException('Cancelled in-flight response overwrote progress');
$jobs->enqueue($notice, 3, 'inventory');
$db->table('notice_import_jobs')->where('notice_id',$notice)->where('status','queued')->update(['status'=>'running','started_at'=>'2000-01-01 00:00:00+00']);
$jobs->processOne($notice);
$row = $db->table('notice_import_drafts')->where('notice_id',$notice)->get()->getRowArray();
if ($row['status'] !== 'interrupted' || $row['inventory'] !== $saved) throw new RuntimeException('Expired lease did not preserve progress');
echo "PASS: background task commit, in-flight cancellation, stale response rejection, expired lease recovery, accepted inventory preserved. No external AI calls.\n";
