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
await anon('/v1/plano', 'GET', undefined, 401)
await api('/auth/login', 'POST', { email: fixture.email, password: fixture.password })
await api('/v1/plano', 'GET', undefined, 400)
const notice = await api('/v1/editais', 'POST', { title: 'Teste de plano diário', source: 'manual' }, 201)
const topics = []
for (const [i,name] of ['Português', 'Direito administrativo', 'Informática'].entries()) {
  const subject = await api(`/v1/editais/${notice.id}/materias`, 'POST', { name, weight: 5, color: i+1 }, 201)
  for (let n=0; n<10; n++) topics.push((await api(`/v1/materias/${subject.id}/topicos`, 'POST', { name: `${name}: assunto ${n+1}`, difficulty: 10 }, 201)).id)
}
await api(`/v1/editais/${notice.id}/ativar`, 'POST')
const availability = Object.fromEntries(Array.from({length:7},(_,i)=>[i,120]))
await api('/v1/configuracao', 'PUT', { availability, block_minutes:25, break_minutes:5, weekly_minutes_goal:600, weekly_question_goal:100 })
let plan = await api('/v1/plano')
const today = plan.today
const serialize = (p, blocks=p.blocks) => ({ date:p.date, noticeId:p.noticeId, version:p.version, blockMinutes:p.blockMinutes, breakMinutes:p.breakMinutes, blocks:blocks.map(({id,topicId,minutes,status})=>({id,topicId,minutes,status})) })
assert.equal(plan.capacityMinutes,120); assert.equal(plan.blocks.length,4); assert.equal(plan.id,null)
assert.equal(plan.blocks.reduce((s,b)=>s+b.minutes,0)+3*plan.breakMinutes,115)
assert.ok(new Set(plan.blocks.map(b=>b.topic.subjectId)).size>1)
await api('/v1/plano','PUT',serialize(plan),403,false)
plan = await api('/v1/plano','PUT',serialize(plan))
assert.ok(plan.id)
await api('/v1/plano','PUT',{...serialize(plan),version:0},409)
await api('/v1/plano','PUT',{...serialize(plan),blocks:plan.blocks.map(b=>({...b,minutes:180}))},400)
await api('/v1/plano','PUT',{...serialize(plan),blocks:plan.blocks.map((b,i)=>({...b,topicId:i===0?'999999999':b.topicId}))},400)
const order = [...plan.blocks].reverse()
plan = await api('/v1/plano','PUT',serialize(plan,order))
assert.deepEqual((await api('/v1/plano')).blocks.map(b=>b.id),order.map(b=>b.id))
const block = plan.blocks[0]
const session = { topic_id:block.topicId,minutes:25,correct_answers:0,wrong_answers:0,difficulty:10,completes_topic:false,request_key:randomUUID(),plan_id:plan.id,block_id:block.id }
await api('/v1/sessoes','POST',session,403,false)
const continued=await api('/v1/sessoes','POST',session,201)
assert.equal(continued.nextReviewAt,null)
assert.equal((await api('/v1/sessoes','POST',session,201)).repeated,true)
await api('/v1/sessoes','POST',{...session,minutes:26},400)
let dashboard=await api('/v1/dashboard')
let topic=dashboard.materias.flatMap(m=>m.topicos).find(t=>t.id===block.topicId)
assert.equal(topic.emAndamento,true); assert.equal(topic.ultimaRevisao,null); assert.equal(dashboard.sessoes.length,1)
assert.ok(dashboard.sessoes[0].materiaId)
plan=await api('/v1/plano')
assert.equal(plan.blocks[0].status,'completed');assert.equal(plan.spentMinutes,25)
await api('/v1/plano','PUT',serialize(plan,plan.blocks.slice(1)),400)
await api('/v1/plano','PUT',serialize(plan,plan.blocks.map((b,i)=>i===0?{...b,status:'planned'}:b)),400)
const complete=await api('/v1/sessoes','POST',{topic_id:block.topicId,minutes:25,correct_answers:10,wrong_answers:0,difficulty:10,completes_topic:true,request_key:randomUUID()},201)
const expected=new Date(today+'T12:00:00Z');expected.setUTCDate(expected.getUTCDate()+7)
assert.equal(complete.nextReviewAt.slice(0,10),expected.toISOString().slice(0,10))
dashboard=await api('/v1/dashboard');topic=dashboard.materias.flatMap(m=>m.topicos).find(t=>t.id===block.topicId)
assert.equal(topic.proximaRevisao,complete.nextReviewAt);assert.equal(topic.emAndamento,false);assert.equal(topic.posicaoCurva,1)
// Older entries must not move a recent completion backwards.
await api('/v1/sessoes','POST',{topic_id:block.topicId,minutes:5,correct_answers:0,wrong_answers:2,difficulty:10,completes_topic:true,studied_on:'2020-01-01',request_key:randomUUID()},201)
dashboard=await api('/v1/dashboard');topic=dashboard.materias.flatMap(m=>m.topicos).find(t=>t.id===block.topicId)
assert.equal(topic.proximaRevisao,complete.nextReviewAt)
const tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1)
const tomorrowKey=tomorrow.toISOString().slice(0,10)
const futureSuggestion=await api(`/v1/plano?date=${tomorrowKey}`)
assert.ok(futureSuggestion.blocks.every(b=>!plan.blocks.filter(p=>p.status==='planned').some(p=>p.topicId===b.topicId)))
await api('/v1/sessoes','POST',{...session,plan_id:undefined,block_id:undefined,request_key:randomUUID(),studied_on:tomorrowKey},400)
const weekday=(tomorrow.getUTCDay()+6)%7
await api('/v1/configuracao','PUT',{availability:{...availability,[weekday]:0}})
assert.deepEqual((await api(`/v1/plano?date=${tomorrowKey}`)).blocks,[])
const history=await api('/v1/plano?date=2020-01-01')
assert.deepEqual(history.blocks,[])
await api('/v1/plano','PUT',{...serialize(plan),date:'2020-01-01'},400)
const invited=await api('/v1/admin/users','POST',{email:`${fixture.prefix}-planner@example.com`},201)
const password=invited.message.match(/Senha temporária: (\S+)/)[1]
const replacement=randomUUID()+'Aa9!'
const other=client()
await other('/auth/login','POST',{email:`${fixture.prefix}-planner@example.com`,password})
await other('/auth/change-password','POST',{current_password:password,password:replacement,password_confirm:replacement})
await other('/v1/plano','PUT',serialize(plan),400)
assert.deepEqual(await other(`/v1/planos?from=${today}&to=${today}`),[])
// Leave a clean current plan for the browser flow; previous records stay isolated in this fixture.
await api('/v1/configuracao','PUT',{availability,block_minutes:25,break_minutes:5})
plan=await api('/v1/plano')
plan=await api('/v1/plano','PUT',serialize(plan,plan.blocks.map(b=>b.status==='planned'?{...b,status:'deferred'}:b)))
console.log('PASS: capacity/breaks, stable ordering, version conflicts, invalid topics, CSRF, continuation, idempotent save, review dates, historical entries, zero availability, completed blocks and user isolation.')
