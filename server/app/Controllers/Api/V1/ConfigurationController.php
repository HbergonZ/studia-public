<?php
namespace App\Controllers\Api\V1;
use App\Models\{AvailabilityModel,StudyProfileModel};
final class ConfigurationController extends ApiController
{
    public function showConfig(){return $this->respond(['profile'=>(new StudyProfileModel())->find($this->userId()),'availability'=>(new AvailabilityModel())->where('user_id',$this->userId())->orderBy('weekday')->findAll()]);}
    public function save()
    {
        $uid = $this->userId(); $db = db_connect(); $db->transBegin();
        try {
            $db->query('SELECT pg_advisory_xact_lock(?)', [$uid]);
            $pm = new StudyProfileModel(); $existing = $pm->find($uid);
            [$profile, $availability] = (new \App\Services\ConfigurationInput())->validate($this->body(), $existing);
            $profile['user_id'] = $uid;
            $existing ? $pm->update($uid, $profile) : $pm->insert($profile, false);
            $am = new AvailabilityModel();
            foreach ($availability as $day => $minutes) {
                $row = $am->where(['user_id' => $uid, 'weekday' => (int) $day])->first();
                $values = ['user_id' => $uid, 'weekday' => (int) $day, 'minutes' => $minutes];
                $row ? $am->update($row['id'], $values) : $am->insert($values);
            }
            if (!$db->transStatus()) throw new \RuntimeException('Transaction failed');
            $db->transCommit(); return $this->respondUpdated(['saved' => true]);
        } catch (\InvalidArgumentException $e) { $db->transRollback(); return $this->failValidationErrors($e->getMessage()); }
        catch (\Throwable $e) { $db->transRollback(); return $this->failServerError('Não foi possível salvar a rotina. Nenhuma alteração foi aplicada.'); }
    }
}
