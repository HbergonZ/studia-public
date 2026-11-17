// Requires the isolated admin-users fixture. No credentials are printed.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
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

const api=client()
await api('/auth/login','POST',{email:fixture.email,password:fixture.password})
const cases=JSON.parse(readFileSync('/fixtures/testing/editais-reais/cases.json','utf8'))
const reports=[]
const selectedSubjects=(response,ref)=>response.groups.flatMap(g=>g.applies_to_all || g.applicability.some(a=>a.option_ref===ref) ? g.subjects.map(s=>[g.name,s.name].join('|')) : []).sort()
for(const testCase of cases){
  const response=testCase.response
  const raw=JSON.stringify(response)
  const started=Date.now()
  const preview=await api('/v1/editais/prever-importacao','POST',{response:raw})
  const notice=await api('/v1/editais','POST',{title:response.title,source:'text'},201)
  await api(`/v1/editais/${notice.id}/importar-resposta`,'POST',{response:raw})
  let board=await api(`/v1/dashboard?edital_id=${notice.id}`)
  assert.equal(board.edital.temConteudoProgramatico,response.has_study_syllabus)
  const total=board.materias.flatMap(m=>m.topicos).length
  assert.equal(total,preview.summary.units)
  if(!response.has_study_syllabus){
    assert.equal(total,0);assert.equal(board.opcoes.length,0)
    await api(`/v1/editais/${notice.id}/ativar`,'POST',undefined,400)
    reports.push({...testCase,response:undefined,id:notice.id,subjects:0,units:0,result:'PASS: no syllabus, no invented subjects, activation blocked',milliseconds:Date.now()-started})
    continue
  }
  // All imported excerpts and unique titles must survive storage unchanged.
  for(const group of response.groups)for(const subject of group.subjects){
    const stored=board.materias.find(m=>m.grupoNome===group.name && m.nome===subject.name)
    assert.ok(stored)
    assert.deepEqual(stored.topicos.map(t=>[t.nome,t.textoOriginal]),subject.topics.flatMap(t=>t.units.map(u=>[u.title,u.source])))
    assert.ok(stored.topicos.every(t=>t.origemId))
  }
  await api(`/v1/editais/${notice.id}/ativar`,'POST',undefined,400)
  const first=board.opcoes[0], second=board.opcoes[1]
  await api(`/v1/editais/${notice.id}/opcoes/${first.id}`,'PATCH',{selected:true})
  await api(`/v1/editais/${notice.id}/ativar`,'POST')
  board=await api('/v1/dashboard')
  assert.deepEqual(board.materias.filter(m=>m.selecionada).map(m=>[m.grupoNome,m.nome].join('|')).sort(),selectedSubjects(response,first.codigo))
  if(testCase.file==='edital5.pdf'){
    assert.deepEqual(board.materias.filter(m=>m.tipoConhecimento==='specific').map(m=>m.peso),[1,2,1,1,5])
  }
  await api('/v1/configuracao','PUT',{availability:Object.fromEntries(Array.from({length:7},(_,i)=>[i,120])),block_minutes:25,break_minutes:5})
  let plan=await api('/v1/plano')
  const weightsBySubject=new Map(board.materias.filter(m=>m.selecionada).map(m=>[m.id,m.peso]))
  for(const t of plan.topics)assert.equal(t.weight,weightsBySubject.get(t.subjectId),'Planner must use selected option weight')
  const schedule=await api('/v1/cronograma')
  for(const t of schedule)assert.equal(Number(t.weight),weightsBySubject.get(String(t.subject_id)))
  assert.ok(plan.blocks.length>0 && plan.blocks.length<=4)
  assert.ok(plan.blocks.every(b=>b.topic && !b.topic.isSource))
  const reserved=plan.blocks.reduce((s,b)=>s+b.minutes,0)+Math.max(0,plan.blocks.length-1)*5
  assert.ok(reserved+plan.spentMinutes<=120)
  const body={date:plan.date,noticeId:plan.noticeId,version:plan.version,blockMinutes:25,breakMinutes:5,blocks:plan.blocks.map(({id,topicId,minutes,status})=>({id,topicId,minutes,status}))}
  plan=await api('/v1/plano','PUT',body)
  const block=plan.blocks[0]
  const continued=await api('/v1/sessoes','POST',{topic_id:block.topicId,minutes:5,correct_answers:2,wrong_answers:1,difficulty:5,completes_topic:false,request_key:randomUUID(),plan_id:plan.id,block_id:block.id},201)
  assert.equal(continued.nextReviewAt,null)
  board=await api('/v1/dashboard')
  assert.ok(board.materias.flatMap(m=>m.topicos).find(t=>t.id===block.topicId).emAndamento)
  const completed=await api('/v1/sessoes','POST',{topic_id:block.topicId,minutes:5,correct_answers:3,wrong_answers:0,difficulty:5,completes_topic:true,request_key:randomUUID()},201)
  assert.ok(completed.nextReviewAt)
  board=await api('/v1/dashboard')
  assert.equal(board.materias.flatMap(m=>m.topicos).filter(t=>t.ultimaRevisao).length,1)
  assert.equal(board.sessoes.length,2)
  const report={...testCase,response:undefined,id:notice.id,subjects:board.materias.length,units:total,blocks:plan.blocks.length,firstOption:first.codigo,firstOptionId:first.id,secondOptionId:second.id,nextReviewAt:completed.nextReviewAt,milliseconds:Date.now()-started}
  // Switching the option must not leak scoped general or specific subjects.
  await api(`/v1/editais/${notice.id}/opcoes/${first.id}`,'PATCH',{selected:false})
  await api(`/v1/editais/${notice.id}/opcoes/${second.id}`,'PATCH',{selected:true})
  board=await api('/v1/dashboard')
  assert.deepEqual(board.materias.filter(m=>m.selecionada).map(m=>[m.grupoNome,m.nome].join('|')).sort(),selectedSubjects(response,second.codigo))
  if(testCase.file==='edital2.pdf' || testCase.file==='edital3.pdf')assert.ok(board.materias.filter(m=>m.selecionada).every(m=>m.nome!=='No??es de Inform?tica'))
  if(testCase.file==='edital5.pdf')assert.deepEqual(board.materias.filter(m=>m.tipoConhecimento==='specific').map(m=>m.peso),[2,3,2,1,2])
  const switched=await api('/v1/plano')
  const eligible=new Set(board.materias.filter(m=>m.selecionada).flatMap(m=>m.topicos.map(t=>t.id)))
  assert.ok(switched.blocks.filter(b=>b.status==='planned').every(b=>eligible.has(b.topicId)))
  await api(`/v1/editais/${notice.id}/opcoes/${second.id}`,'PATCH',{selected:false})
  await api(`/v1/editais/${notice.id}/opcoes/${first.id}`,'PATCH',{selected:true})
  reports.push({...report,result:'PASS: preview, import, exact excerpts, profile selection, bounded plan, continuation, independent review, switching scope'})
  console.log(testCase.file,total+' units','PASS')
}
const notices=await api('/v1/editais')
assert.equal(notices.filter(n=>n.status==='confirmed').length,1)
writeFileSync('/fixtures/testing/real-editais-results.json',JSON.stringify(reports,null,2))
console.log('PASS: all five real-PDF sample cases imported and verified; active notice isolation; no external AI request made.')
