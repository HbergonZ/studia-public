<?php
namespace App\Controllers\Api\V1;
use App\Models\{ContentGroupModel,ExtractionRunModel,NoticeModel,SelectableOptionModel,StudyAreaModel,SubjectModel,TopicModel};
use App\Services\{EditalStructureValidator,AiEditalExtractor,OpenRouterExtractionException,PdfTextExtractor};
use Throwable;

final class NoticesController extends ApiController
{
    public function index() { return $this->respond((new NoticeModel())->select('id,title,status,source,original_filename,created_at,confirmed_at')->where('user_id',$this->userId())->orderBy('id','DESC')->findAll()); }
    public function delete($id=null) {
        $model=new NoticeModel();
        if(!$model->where(['id'=>$id,'user_id'=>$this->userId()])->first())return $this->failNotFound();
        $model->delete($id);
        return $this->respondDeleted(['id'=>$id]);
    }
    public function show($id=null) {
        $notice=(new NoticeModel())->where(['id'=>$id,'user_id'=>$this->userId()])->first(); if(!$notice)return $this->failNotFound();
        $subjects=(new SubjectModel())->where('notice_id',$id)->orderBy('sort_order')->findAll(); $tm=new TopicModel();
        foreach($subjects as &$s)$s['topics']=$tm->where('subject_id',$s['id'])->orderBy('sort_order')->findAll();
        $notice['subjects']=$subjects; return $this->respond($notice);
    }
    public function create() {
        $data=$this->body();
        if(!is_string($data['title']??null)||trim($data['title'])===''||mb_strlen(trim($data['title']))>180)return $this->failValidationErrors('Informe um nome com até 180 caracteres.');
        if(!in_array($data['source']??'manual',['manual','pdf','text'],true))return $this->failValidationErrors('Origem inválida.');
        $id=(new NoticeModel())->insert(['user_id'=>$this->userId(),'title'=>trim($data['title']),'source'=>$data['source']??'manual','status'=>'draft'],true);
        return $this->respondCreated(['id'=>$id]);
    }
    public function update($id=null) {
        $m=new NoticeModel(); if(!$m->where(['id'=>$id,'user_id'=>$this->userId()])->first())return $this->failNotFound();
        $title=$this->body()['title']??null;
        if(!is_string($title)||trim($title)===''||mb_strlen(trim($title))>180)return $this->failValidationErrors('Informe um nome com até 180 caracteres.');
        $m->update($id,['title'=>trim($title)]); return $this->respondUpdated(['id'=>$id,'title'=>trim($title)]);
    }
    public function confirm($id) {
        $m=new NoticeModel(); if(!$m->where(['id'=>$id,'user_id'=>$this->userId()])->first())return $this->failNotFound();
        $notice=$m->find($id);if($notice['has_study_syllabus']===false||$notice['has_study_syllabus']==='f')return $this->failValidationErrors('Este edital não possui conteúdo programático estudável.');
        $invalid=db_connect()->query("SELECT COUNT(DISTINCT s.id) subjects, COUNT(t.id) topics, COUNT(DISTINCT s.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM topics tx WHERE tx.subject_id=s.id)) empty_subjects FROM subjects s JOIN content_groups g ON g.id=s.content_group_id LEFT JOIN topics t ON t.subject_id=s.id WHERE s.notice_id=? AND (g.applies_to_all=TRUE OR EXISTS (SELECT 1 FROM option_content_groups oc JOIN selectable_options o ON o.id=oc.option_id WHERE oc.content_group_id=g.id AND o.is_selected=TRUE))",[$id])->getRowArray();
        if((int)$invalid['subjects']===0||(int)$invalid['topics']===0||(int)$invalid['empty_subjects']>0)return $this->failValidationErrors('Adicione pelo menos uma matéria e um tópico em cada matéria.');
        $options=(new SelectableOptionModel())->where('notice_id',$id)->findAll();
        if($options!==[]&&!array_filter($options,static fn(array $option):bool=>in_array($option['is_selected'],[true,1,'1','t','true'],true)))return $this->failValidationErrors('Selecione pelo menos uma opção de cargo, perfil ou especialidade.');
        $db=db_connect(); $db->transException(true)->transStart();
        $m->where('user_id',$this->userId())->where('id !=',$id)->where('status','confirmed')->set(['status'=>'inactive'])->update();
        $m->update($id,['status'=>'confirmed','confirmed_at'=>date('Y-m-d H:i:s')]);
        $db->transComplete(); return $this->respond(['status'=>'confirmed']);
    }
    public function deactivate($id) {
        $m=new NoticeModel(); $notice=$m->where(['id'=>$id,'user_id'=>$this->userId()])->first(); if(!$notice)return $this->failNotFound();
        if($notice['status']!=='inactive')$m->update($id,['status'=>'inactive']);
        return $this->respond(['status'=>'inactive']);
    }
    public function finish($id) {
        $model=new NoticeModel();
        $notice=$model->where(['id'=>$id,'user_id'=>$this->userId()])->first();
        if(!$notice)return $this->failNotFound();
        if(!in_array($notice['status'],['confirmed','inactive','completed'],true)||!$notice['confirmed_at'])return $this->failValidationErrors('Ative o edital antes de finalizá-lo.');
        $model->update($id,['status'=>'completed']);
        return $this->respond(['status'=>'completed']);
    }
    public function extract($id) {
        $nm=new NoticeModel(); $notice=$nm->where(['id'=>$id,'user_id'=>$this->userId()])->first(); if(!$notice)return $this->failNotFound();
        $text=trim((string)($this->request->getPost('text')??'')); $file=$this->request->getFile('file');
        $attempts=[]; $transaction=false; $db=db_connect(); $startedAt=date('Y-m-d H:i:s');
        try {
            if($file && $file->isValid()) { if($file->getSize()>15*1024*1024||$file->getMimeType()!=='application/pdf')return $this->failValidationErrors('Envie um PDF de até 15 MB.');
                $directory=WRITEPATH.'uploads/editais'; if(!is_dir($directory)&&!mkdir($directory,0700,true)&&!is_dir($directory)) throw new \RuntimeException('Não foi possível preparar o armazenamento do edital.');
                $name=$file->getRandomName(); $file->move($directory,$name); $path=$directory.'/'.$name;
                $nm->update($id,['source'=>'pdf','original_filename'=>$file->getClientName(),'stored_path'=>$path,'status'=>'processing']); $text=(new PdfTextExtractor())->extract($path);
            } elseif($text!=='') $nm->update($id,['source'=>'text','status'=>'processing']); else return $this->failValidationErrors('Informe texto ou PDF.');
            $result=(new AiEditalExtractor())->extract($text);
            $attempts=$result['attempts'];
            $db->transException(true)->transBegin(); $transaction=true;
            $this->replaceStructure((int)$id,$result['structure']);
            (new ExtractionRunModel())->insert(['notice_id'=>$id,'status'=>'completed','model'=>mb_substr($result['model'],0,80),'prompt_version'=>'ai-fallback-v2','request_id'=>is_string($result['request_id'])?mb_substr($result['request_id'],0,120):null,'raw_response'=>json_encode(['response'=>$result['raw'],'attempts'=>$attempts],JSON_THROW_ON_ERROR),'created_at'=>$startedAt,'finished_at'=>date('Y-m-d H:i:s')]);
            $nm->update($id,['title'=>$result['structure']['title']??$notice['title'],'status'=>'extracted','has_study_syllabus'=>$result['structure']['has_study_syllabus'],'extraction_error'=>null]);
            if(!$db->transStatus())throw new \RuntimeException('Não foi possível salvar a importação.');
            $db->transCommit(); $transaction=false;
            return $this->respond(['status'=>'extracted','model'=>$result['model'],'attempts'=>$attempts]);
        } catch(Throwable $e) {
            if($transaction)$db->transRollback();
            if($e instanceof OpenRouterExtractionException)$attempts=$e->getAttempts();
            $message=$e instanceof \RuntimeException && !$transaction ? $e->getMessage() : 'Não foi possível concluir a importação. Tente novamente.';
            $nm->update($id,['status'=>'failed','extraction_error'=>$message]);
            (new ExtractionRunModel())->insert(['notice_id'=>$id,'status'=>'failed','prompt_version'=>'ai-fallback-v2','error'=>$message,'raw_response'=>json_encode(['attempts'=>$attempts],JSON_THROW_ON_ERROR),'created_at'=>$startedAt,'finished_at'=>date('Y-m-d H:i:s')]);
            log_message('error','Extração do edital {id} falhou após {attempts} tentativa(s).',['id'=>$id,'attempts'=>count($attempts)]);
            return $this->respond(['status'=>'failed','message'=>$message,'attempts'=>$attempts],422);
        }
    }

    public function importResponse($id) {
        $nm=new NoticeModel(); $notice=$nm->where(['id'=>$id,'user_id'=>$this->userId()])->first(); if(!$notice)return $this->failNotFound();
        $response=trim((string)($this->body()['response']??''));
        if($response==='')return $this->failValidationErrors('Cole a resposta JSON antes de importar.');
        if(strlen($response)>1024*1024)return $this->failValidationErrors('A resposta deve ter no máximo 1 MB.');
        try {
            $structure=(new EditalStructureValidator())->fromJson($response); $db=db_connect(); $db->transException(true)->transStart();
            $this->replaceStructure((int)$id,$structure);
            (new ExtractionRunModel())->insert(['notice_id'=>$id,'status'=>'completed','model'=>'manual/chatgpt','prompt_version'=>'import-v1','raw_response'=>$response,'created_at'=>date('Y-m-d H:i:s'),'finished_at'=>date('Y-m-d H:i:s')]);
            $nm->update($id,['title'=>$structure['title']??$notice['title'],'source'=>'text','status'=>'extracted','has_study_syllabus'=>$structure['has_study_syllabus'],'extraction_error'=>null]); $db->transComplete(); return $this->respond(['status'=>'extracted']);
        } catch(Throwable $e){log_message('error','Importação da resposta do edital {id}: {error}',['id'=>$id,'error'=>$e->getMessage()]); return $this->fail($e->getMessage(),422);}
    }

    private function replaceStructure(int $noticeId,array $structure): void {
        $om=new SelectableOptionModel();$gm=new ContentGroupModel();$sm=new SubjectModel();$tm=new TopicModel();$om->where('notice_id',$noticeId)->delete();$gm->where('notice_id',$noticeId)->delete();(new StudyAreaModel())->where('notice_id',$noticeId)->delete();$optionIds=[];
        foreach($structure['options'] as $i=>$option)$optionIds[$option['ref']]=$om->insert(['notice_id'=>$noticeId,'external_ref'=>$option['ref'],'code'=>$option['code'],'name'=>$option['name'],'kind'=>$option['kind'],'is_selected'=>false,'sort_order'=>$i],true);
        $db=db_connect();$subjectOrder=0;foreach($structure['groups'] as $gi=>$group){$gid=$gm->insert(['notice_id'=>$noticeId,'external_ref'=>$group['ref'],'name'=>$group['name'],'knowledge_type'=>$group['knowledge_type'],'applies_to_all'=>$group['applies_to_all'],'sort_order'=>$gi],true);foreach($group['applicability'] as $application)$db->table('option_content_groups')->insert(['option_id'=>$optionIds[$application['option_ref']],'content_group_id'=>$gid,'weight'=>$application['weight']]);foreach($group['subjects'] as $subject){$sid=$sm->insert(['notice_id'=>$noticeId,'content_group_id'=>$gid,'name'=>$subject['name'],'weight'=>1,'color'=>($subjectOrder%6)+1,'sort_order'=>$subjectOrder++],true);foreach($subject['topics'] as $ti=>$topic)$tm->insert(['subject_id'=>$sid,'name'=>$topic,'sort_order'=>$ti]);}}
    }
}
