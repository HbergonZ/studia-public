// Requires the isolated admin-users fixture. No credentials are printed.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json', 'utf8'))
const base = (process.env.TEST_BASE_URL ?? 'http://host.docker.internal:8088') + '/api'
function client() {
  const cookies = new Map(); let csrf = ''
  return async (path, method = 'GET', body, expected = 200, token = true) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...(token ? { 'X-CSRF-TOKEN': csrf } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
    for (const cookie of response.headers.getSetCookie()) { const pair=cookie.split(';')[0], i=pair.indexOf('='); cookies.set(pair.slice(0,i), pair.slice(i+1)) }
    const data = await response.json()
    if (response.headers.has('X-CSRF-TOKEN')) csrf = response.headers.get('X-CSRF-TOKEN')
    if (data.user?.csrfToken) csrf = data.user.csrfToken
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data.messages ?? data.message ?? '')}`)
    return data
  }
}

const api = client(), anon = client()
await anon('/v1/editais/1/organizacao','GET',undefined,401)
await api('/auth/login','POST',{email:fixture.email,password:fixture.password})
const source='Constitui??o: arts. 196 a 200; princ?pios e diretrizes do SUS; Lei 8.142/1990: participa??o e controle social.'
const units=[{title:'Constitui??o: sa?de',source:'Constitui??o: arts. 196 a 200;'},{title:'Princ?pios do SUS',source:'princ?pios e diretrizes do SUS;'},{title:'Participa??o e controle social',source:'Lei 8.142/1990: participa??o e controle social.'}]
const structured={study_units_version:1,title:'Edital de teste da organiza??o',has_study_syllabus:true,extraction_complete:true,options:[],groups:[{ref:'gerais',name:'Conhecimentos gerais',knowledge_type:'general',applies_to_all:true,applicability:[],subjects:[{name:'Legisla??o Sa?de',topics:[{title:'Legisla??o e Sa?de P?blica',source,units}]}]}],warnings:[]}
const before=(await api('/v1/editais')).length
const preview=await api('/v1/editais/prever-importacao','POST',{response:JSON.stringify(structured)})
assert.deepEqual(preview.summary,{subjects:1,sources:1,units:3,legacy:0})
assert.equal((await api('/v1/editais')).length,before,'Preview must not create a notice')
await api('/v1/editais/prever-importacao','POST',{response:JSON.stringify(structured)},403,false)
const imported=await api('/v1/editais','POST',{title:'Pr?via',source:'text'},201)
await api(`/v1/editais/${imported.id}/importar-resposta`,'POST',{response:JSON.stringify(structured)})
let board=await api(`/v1/dashboard?edital_id=${imported.id}`)
assert.equal(board.materias[0].topicos.length,3)
assert.equal(board.materias[0].topicos[1].textoOriginal,units[1].source)
assert.ok(board.materias[0].topicos.every(t=>t.origemId))
await api(`/v1/editais/${imported.id}/importar-resposta`,'POST',{response:JSON.stringify(structured)},400)
const legacy=await api('/v1/editais','POST',{title:'Conte?do existente com hist?rico',source:'manual'},201)
const subject=await api(`/v1/editais/${legacy.id}/materias`,'POST',{name:'Legisla??o Sa?de',weight:5,color:1},201)
const topic=await api(`/v1/materias/${subject.id}/topicos`,'POST',{name:source,difficulty:5},201)
const otherSubject=await api(`/v1/editais/${imported.id}/materias`,'POST',{name:'Outro cargo',weight:5,color:2},201)
const foreign=await api(`/v1/materias/${otherSubject.id}/topicos`,'POST',{name:'Outro conte?do'},201)
await api(`/v1/editais/${legacy.id}/ativar`,'POST')
await api('/v1/configuracao','PUT',{availability:Object.fromEntries(Array.from({length:7},(_,i)=>[i,120])),block_minutes:25,break_minutes:5})
let plan=await api('/v1/plano')
const yesterday=new Date(plan.today+'T12:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1)
await api('/v1/sessoes','POST',{topic_id:String(topic.id),minutes:40,correct_answers:8,wrong_answers:2,difficulty:5,completes_topic:false,studied_on:yesterday.toISOString().slice(0,10),request_key:randomUUID()},201)
const serialize=p=>({date:p.date,noticeId:p.noticeId,version:p.version,blockMinutes:p.blockMinutes,breakMinutes:p.breakMinutes,blocks:p.blocks.map(({id,topicId,minutes,status})=>({id,topicId,minutes,status}))})
plan=await api('/v1/plano','PUT',serialize(plan))
const snapshot=await api(`/v1/editais/${legacy.id}/organizacao`)
const response={version:1,topics:[{topic_id:String(topic.id),source,units}]}
const payload={revision:snapshot.revision,response:JSON.stringify(response)}
await api(`/v1/editais/${legacy.id}/organizacao/prever`,'POST',payload,403,false)
const result=await api(`/v1/editais/${legacy.id}/organizacao/prever`,'POST',payload)
assert.equal(result.topics[0].sessions,1)
assert.equal((await api(`/v1/editais/${legacy.id}/organizacao`)).originals.length,0)
for(const mutated of [
 {...response,topics:[{...response.topics[0],topic_id:String(foreign.id)}]},
 {...response,topics:[response.topics[0],response.topics[0]]},
 {...response,topics:[{...response.topics[0],units:units.slice(1)}]},
 {...response,topics:[{...response.topics[0],source:source+' inventado'}]},
 {...response,topics:[{...response.topics[0],units:[...units].reverse()}]},
])await api(`/v1/editais/${legacy.id}/organizacao/prever`,'POST',{...payload,response:JSON.stringify(mutated)},400)
await api(`/v1/editais/${legacy.id}/organizacao/aplicar`,'POST',{...payload,revision:'stale'},400)
await api(`/v1/editais/${legacy.id}/organizacao/aplicar`,'POST',payload,403,false)
assert.equal((await api(`/v1/editais/${legacy.id}/organizacao/aplicar`,'POST',payload)).units,3)
await api(`/v1/editais/${legacy.id}/organizacao/aplicar`,'POST',payload,400)
board=await api('/v1/dashboard')
assert.equal(board.materias[0].topicos.length,3)
assert.ok(board.materias[0].topicos.every(t=>t.ultimaRevisao===null && t.questoes.acertos===0))
assert.equal(board.sessoes.length,1);assert.equal(board.sessoes[0].tempoMinutos,40)
const organized=await api(`/v1/editais/${legacy.id}/organizacao`)
assert.equal(organized.originals.length,1);assert.equal(organized.originals[0].sessions,1)
const preserved=await api('/v1/plano')
assert.equal(preserved.blocks[0].topicId,String(topic.id));assert.equal(preserved.blocks[0].topic.isSource,true)
assert.ok(preserved.topics.every(t=>!t.isSource))
await api('/v1/plano','PUT',serialize(preserved))
await api('/v1/sessoes','POST',{topic_id:String(topic.id),minutes:25,correct_answers:1,wrong_answers:0,difficulty:5,completes_topic:false,request_key:randomUUID(),plan_id:preserved.id,block_id:preserved.blocks[0].id},201)
const tomorrow=new Date(plan.today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1)
const future=await api(`/v1/plano?date=${tomorrow.toISOString().slice(0,10)}`)
assert.equal(future.blocks.length,3)
assert.ok(future.blocks.every(b=>b.topicId!==String(topic.id)))
const leaf=board.materias[0].topicos[0]
await api('/v1/sessoes','POST',{topic_id:leaf.id,minutes:20,correct_answers:3,wrong_answers:1,difficulty:5,completes_topic:true,request_key:randomUUID()},201)
board=await api('/v1/dashboard')
assert.equal(board.materias[0].topicos.filter(t=>t.ultimaRevisao).length,1)
// Changes to the text must invalidate a previously generated prompt.
let revision=await api(`/v1/editais/${legacy.id}/organizacao`)
await api(`/v1/topicos/${leaf.id}`,'PATCH',{name:'T?tulo corrigido'})
await api(`/v1/editais/${legacy.id}/organizacao/prever`,'POST',{revision:revision.revision,response:JSON.stringify({version:1,topics:[{topic_id:leaf.id,source:units[0].source,units:[units[0]]}]})},400)
const outsider=client()
const created=await api('/v1/admin/users','POST',{name:'Outro usu?rio QA',email:fixture.prefix+'-org-'+randomUUID().slice(0,6)+'@example.com'},201)
const temporary=created.message.match(/Senha tempor\u00e1ria: (\S+)/)?.[1]
assert.ok(temporary)
await outsider('/auth/login','POST',{email:created.user.email,password:temporary})
await outsider('/auth/change-password','POST',{current_password:temporary,password:'OutraSenha!123456',password_confirm:'OutraSenha!123456'})
await outsider(`/v1/editais/${legacy.id}/organizacao`,'GET',undefined,404)
await outsider(`/v1/editais/${legacy.id}/organizacao/aplicar`,'POST',payload,404)
console.log('PASS: import preview is read-only; structured/legacy compatibility; source coverage; duplicate, omission, invention and scope rejection; CSRF; history and saved-plan preservation; independent review; replay/stale protection; cross-user isolation.')
