// Real worker/HTTP integration, no external AI calls. Uses only temporary accounts.
import assert from 'node:assert/strict'
import {readFileSync, writeFileSync} from 'node:fs'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json','utf8'))
const cookies = new Map(); let csrf = ''
async function api(path, method='GET', body, expected=200, token=true) {
 const multipart=body instanceof FormData
 const r=await fetch('http://host.docker.internal:8088/api'+path,{method,headers:{Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(token?{'X-CSRF-TOKEN':csrf}:{}),...(multipart?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:multipart?body:JSON.stringify(body)})
 for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}
 const value=await r.json(); if(r.headers.has('X-CSRF-TOKEN'))csrf=r.headers.get('X-CSRF-TOKEN');if(value.user?.csrfToken)csrf=value.user.csrfToken
 assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value.message??value.messages??'')}`);return value
}
async function waitReady(endpoint){for(let i=0;i<120;i++){const state=await api(endpoint);if(!state.busy){assert.equal(state.error,null,state.error);return state}await new Promise(r=>setTimeout(r,500))}throw new Error('Worker did not complete reading')}
await api('/auth/login','POST',{email:fixture.email,password:fixture.password})
const notice=await api('/v1/editais','POST',{title:'Teste OCR recuperavel',source:'pdf'},201)
const endpoint=`/v1/editais/${notice.id}/importacao-cargo`
const form=new FormData();form.append('file',new Blob([readFileSync('/fixtures/testing/ocr-image.pdf')],{type:'application/pdf'}),'imagem.pdf');form.append('background','1')
let state=await api(endpoint+'/preparar','POST',form)
assert.equal(state.busy,true)
await api(endpoint+'/cancelar','POST',{revision:state.revision},403,false)
state=await api(endpoint+'/cancelar','POST',{revision:state.revision})
const cancelledRevision=state.revision;assert.equal(state.busy,false)
await new Promise(r=>setTimeout(r,2500));state=await api(endpoint)
assert.equal(state.revision,cancelledRevision,'An in-flight job cannot overwrite cancellation')
assert.equal(state.status,'cancelled')
if(!state.document)state=await api(endpoint+'/ler','POST',{revision:state.revision})
state=await waitReady(endpoint)
assert.equal(state.reading.total_pages,1);assert.equal(state.reading.pages[0].method,'ocr')
const prompt=await api(endpoint+'/prompt?stage=inventory')
assert.ok(prompt.prompt.toUpperCase().includes('ENFERMEIRO'))
// Normal text fixture allows exact manual source contracts, followed by routine/first plan.
const textNotice=await api('/v1/editais','POST',{title:'Conta nova, PDF ao plano',source:'pdf'},201)
const flow=`/v1/editais/${textNotice.id}/importacao-cargo`
const upload=new FormData();upload.append('file',new Blob([readFileSync('/fixtures/testing/job-import.pdf')],{type:'application/pdf'}),'teste.pdf');upload.append('background','1')
state=await api(flow+'/preparar','POST',upload);state=await waitReady(flow)
const source=await api(flow+'/prompt?stage=inventory')
const line=text=>{const m=source.prompt.match(new RegExp('\\[L(\\d+)\\] '+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.ok(m,text);return Number(m[1])}
const inventory={title:'Teste PDF ao plano',has_study_syllabus:true,options:[{ref:'725',code:'725',name:'Enfermeiro',kind:'job',level:'Superior',source_line:line('725 - Enfermeiro'),general_expected:true,specific_expected:true}],syllabus_pages:[2,3],warnings:[]}
state=await api(flow+'/inventory','POST',{revision:state.revision,response:JSON.stringify(inventory)})
state=await api(flow+'/selecionar','POST',{revision:state.revision,option_ref:'725'})
const selected=[...source.prompt.matchAll(/\[L(\d+)\] 725 - Enfermeiro/g)].at(-1)
const content={option_ref:'725',complete:true,sections:[{name:'Portugues',knowledge_type:'general',start_line:line('Portugues'),end_line:line('Interpretacao de texto.'),evidence_line:line('CONHECIMENTOS GERAIS - SUPERIOR')},{name:'Enfermagem',knowledge_type:'specific',start_line:Number(selected[1]),end_line:line('Biosseguranca. Seguranca do paciente.'),evidence_line:Number(selected[1])}],warnings:[]}
state=await api(flow+'/content','POST',{revision:state.revision,response:JSON.stringify(content)})
assert.ok(state.units_summary.units>=2)
if(state.document.needs_confirmation)state=await api(flow+'/confirmar-documento','POST',{revision:state.revision,confirmed:true})
await api(flow+'/aplicar','POST',{revision:state.revision,confirmed:true})
const before=await api('/v1/configuracao')
await api(`/v1/editais/${textNotice.id}/ativar`,'POST')
const after=await api('/v1/configuracao');assert.deepEqual(after,before,'Activating a new notice preserves the existing routine')
await api('/v1/configuracao','PUT',{availability:Object.fromEntries(Array.from({length:7},(_,i)=>[i,120])),block_minutes:25,break_minutes:5})
const plan=await api('/v1/plano');assert.ok(plan.blocks.length>0,'The imported notice generates a first study block')
writeFileSync('/fixtures/testing/processing-browser-fixture.json',JSON.stringify({id:textNotice.id,ocrId:notice.id}))
// A separate account with no notices for the complete browser onboarding.
const email=fixture.prefix+'-onboard-'+crypto.randomUUID().slice(0,6)+'@example.com'
const created=await api('/v1/admin/users','POST',{email},201)
const temporary=created.message.match(/Senha temporária: (\S+)/)[1]
const password=crypto.randomUUID()+'aA!9'
cookies.clear();csrf=''
await api('/auth/login','POST',{email,password:temporary})
await api('/auth/change-password','POST',{current_password:temporary,password,password_confirm:password})
const manual=JSON.parse(readFileSync('/fixtures/testing/job-import-fixture.json','utf8'))
writeFileSync('/fixtures/testing/onboard-browser-fixture.json',JSON.stringify({email,password,inventory:manual.inventory,content:manual.content}))
console.log('PASS: asynchronous PDF/OCR, cancellation invalidates in-flight results, resume, physical page diagnostics, original-source import, automatic unit summary, activation preserves routine, first plan generated. No external AI call.')
