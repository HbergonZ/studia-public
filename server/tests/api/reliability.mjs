// Uses only temporary accounts created by admin-users-fixture.php.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json','utf8'))
const base = (process.env.TEST_BASE_URL ?? 'http://host.docker.internal:8088') + '/api'
function client() {
  const cookies=new Map();let csrf=''
  return async(path,method='GET',body,expected=200,token=true)=>{
    const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(token?{'X-CSRF-TOKEN':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)})
    for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}
    const raw=await r.text();let value={};try{value=raw?JSON.parse(raw):{}}catch{}
    if(r.headers.has('X-CSRF-TOKEN'))csrf=r.headers.get('X-CSRF-TOKEN')
    if(value.user?.csrfToken)csrf=value.user.csrfToken
    assert.equal(r.status,expected,`${method} ${path}: ${r.status}`)
    assert.ok(!r.headers.has('Debugbar-Link'),'Private API responses must not expose debug traces')
    return value
  }
}
const a=client(),b=client(),other=client()
await a('/auth/login','POST',{email:fixture.email,password:fixture.password})
await b('/auth/login','POST',{email:fixture.email,password:fixture.password})
const n=await a('/v1/editais','POST',{title:'Confiabilidade',source:'manual'},201)
const importKey=randomUUID()
const draft=await a('/v1/editais','POST',{title:'Importação com retry',source:'text',request_key:importKey},201)
const draftRetry=await a('/v1/editais','POST',{title:'Importação com retry',source:'text',request_key:importKey},201)
assert.equal(String(draftRetry.id),String(draft.id));assert.equal(draftRetry.repeated,true)
for(const [path,method,body]of [[`/v1/editais/${n.id}`,'PATCH',{title:'Não alterar'}],[`/v1/editais/${n.id}/materias`,'POST',{name:'Não criar'}],['/v1/configuracao','PUT',{}]])await a(path,method,body,403,false)
const s=await a(`/v1/editais/${n.id}/materias`,'POST',{name:'Português',weight:5,color:1},201)
const t=await a(`/v1/materias/${s.id}/topicos`,'POST',{name:'Interpretação de textos',difficulty:10},201)
const removable=await a(`/v1/materias/${s.id}/topicos`,'POST',{name:'Rascunho sem histórico'},201)
await a(`/v1/topicos/${removable.id}`,'DELETE')
await a(`/v1/topicos/${t.id}`,'PATCH',{name:['invalid']},400)
await a(`/v1/topicos/${t.id}`,'PATCH',{name:''},400)
await a(`/v1/topicos/${t.id}`,'PATCH',{difficulty:11},400)
await a(`/v1/materias/${s.id}`,'PATCH',{weight:101},400)
await a(`/v1/editais/${n.id}/ativar`,'POST')
const availability=Object.fromEntries(Array.from({length:7},(_,i)=>[i,120]))
await a('/v1/configuracao','PUT',{availability,block_minutes:25,break_minutes:5,weekly_question_goal:100,weekly_minutes_goal:600})
const beforeConfig=(await a('/v1/dashboard')).configuracao
await a('/v1/configuracao','PUT',[],400)
await a('/v1/configuracao','PUT',{availability:{0:5,1:-1},block_minutes:30},400)
assert.deepEqual((await a('/v1/dashboard')).configuracao,beforeConfig)
await a('/v1/configuracao','PUT',{timezone:'not/a-zone'},400)
assert.deepEqual((await a('/v1/dashboard')).configuracao,beforeConfig)
await a(`/v1/materias/${s.id}`,'PATCH',{weight:75})
assert.equal((await a('/v1/dashboard')).materias[0].peso,75)
assert.equal((await a('/v1/plano')).topics[0].weight,75)
await a(`/v1/materias/${s.id}`,'PATCH',{reset_weight:true})
assert.equal((await a('/v1/dashboard')).materias[0].peso,5)
let plan=await a('/v1/plano')
const spentBefore = plan.spentMinutes
const serialize=p=>({date:p.date,noticeId:p.noticeId,version:p.version,blockMinutes:p.blockMinutes,breakMinutes:p.breakMinutes,blocks:p.blocks.map(({id,topicId,minutes,status})=>({id,topicId,minutes,status}))})
plan=await a('/v1/plano','PUT',serialize(plan))
await a(`/v1/topicos/${t.id}`,'DELETE',undefined,409)
const input={topic_id:String(t.id),minutes:5,correct_answers:0,wrong_answers:0,difficulty:10,completes_topic:true,request_key:randomUUID(),plan_id:plan.id,block_id:plan.blocks[0].id}
const saved=await a('/v1/sessoes','POST',input,201)
const repeated=await a('/v1/sessoes','POST',input,201)
assert.equal(repeated.repeated,true);assert.equal(repeated.nextReviewAt,saved.nextReviewAt)
await a(`/v1/topicos/${t.id}`,'DELETE',undefined,409)
await a(`/v1/materias/${s.id}`,'DELETE',undefined,409)
await a(`/v1/editais/${n.id}/extrair`,'POST',{},409)
await a(`/v1/editais/${n.id}/importar-resposta`,'POST',{response:'{}'},400)
assert.equal((await a('/v1/dashboard')).sessoes.length,1)
const values={minutes:7,correct_answers:2,wrong_answers:1,difficulty:8,completes_topic:false}
const expected={minutes:5,correct_answers:0,wrong_answers:0,difficulty:10,completes_topic:true}
await a(`/v1/sessoes/${saved.id}`,'PATCH',{...values,expected,reason:'Correção de digitação'})
await a(`/v1/sessoes/${saved.id}`,'PATCH',{...values,expected,reason:'Reenvio após resposta perdida'})
let board=await a('/v1/dashboard')
assert.equal(board.sessoes[0].tempoMinutos,7);assert.equal(board.sessoes[0].corrigida,true)
assert.equal(board.materias[0].topicos[0].emAndamento,true);assert.equal(board.materias[0].topicos[0].ultimaRevisao,null)
plan=await a('/v1/plano');assert.equal(plan.spentMinutes,spentBefore+7);assert.equal(plan.blocks[0].actualMinutes,7)
await a(`/v1/sessoes/${saved.id}`,'PATCH',{...values,minutes:8,expected,reason:'Edição obsoleta'},409)
// Two sessions editing one plan: the stale version must be rejected.
const stale=await b('/v1/plano')
await a('/v1/plano','PUT',serialize(plan))
await b('/v1/plano','PUT',serialize(stale),409)
const email=`${fixture.prefix}-recovery@example.com`
const created=await a('/v1/admin/users','POST',{email},201)
const temporary=created.message.match(/Senha temporária: (\S+)/)?.[1];assert.ok(temporary)
await other('/auth/login','POST',{email,password:temporary})
const newPassword=randomUUID()+'Aa1!'
await other('/auth/change-password','POST',{current_password:temporary,password:newPassword,password_confirm:newPassword})
await other(`/v1/topicos/${t.id}`,'DELETE',undefined,404)
await other(`/v1/sessoes/${saved.id}`,'PATCH',{...values,expected:values,reason:'Não permitido'},404)
await other(`/v1/admin/users/${created.user.id}/reset-access`,'POST',{},403)
const reset=await a(`/v1/admin/users/${created.user.id}/reset-access`,'POST')
assert.ok(reset.message.match(/Senha temporária: (\S+)/)?.[1])
await other('/v1/me','GET',undefined,401)
await other('/auth/login','POST',{email,password:newPassword},401)
const replacement=reset.message.match(/Senha temporária: (\S+)/)[1]
assert.equal((await other('/auth/login','POST',{email,password:replacement})).user.mustChangePassword,true)
// A supplied cargo weight remains the default until the user explicitly overrides it.
const weighted=await a('/v1/editais','POST',{title:'Pesos por cargo',source:'text'},201)
const structure={title:'Pesos por cargo',has_study_syllabus:true,extraction_complete:true,options:[{ref:'cargo',code:'1',name:'Cargo',kind:'job'}],groups:[{ref:'grupo',name:'Específicos',knowledge_type:'specific',applies_to_all:false,applicability:[{option_ref:'cargo',weight:40}],subjects:[{name:'Matéria com peso',topics:['Assunto']}]}],warnings:[]}
await a(`/v1/editais/${weighted.id}/importar-resposta`,'POST',{response:JSON.stringify(structure)})
let weightedBoard=await a(`/v1/dashboard?edital_id=${weighted.id}`)
await a(`/v1/editais/${weighted.id}/opcoes/${weightedBoard.opcoes[0].id}`,'PATCH',{selected:true})
await a(`/v1/editais/${weighted.id}/ativar`,'POST')
weightedBoard=await a('/v1/dashboard');const weightedSubject=weightedBoard.materias[0].id
assert.equal(weightedBoard.materias[0].peso,40)
await a(`/v1/materias/${weightedSubject}`,'PATCH',{weight:75});assert.equal((await a('/v1/plano')).topics[0].weight,75)
await a(`/v1/materias/${weightedSubject}`,'PATCH',{reset_weight:true});assert.equal((await a('/v1/dashboard')).materias[0].peso,40)
await a(`/v1/admin/users/${created.user.id}/reset-access`,'POST',{},403,false)
const unknown=client();const rateEmail=`${fixture.prefix}-rate@example.com`
for(let i=0;i<10;i++)await unknown('/auth/login','POST',{email:rateEmail,password:'invalid'},401)
await unknown('/auth/login','POST',{email:rateEmail,password:'invalid'},429)
console.log('PASS: non-destructive removal, re-extraction guard, uniform CSRF, catalog validation, atomic routine, personal weight/reset, idempotent response, audited correction/replay, plan conflicts, user isolation, access reset/session revocation, login rate limit.')
