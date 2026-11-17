// Requer a fixture admin-users e navegador isolado em CDP 9224.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'

const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json','utf8'))
const browserBase = process.env.BROWSER_BASE_URL ?? 'http://127.0.0.1:8092'
const apiBase = process.env.TEST_BASE_URL ?? 'http://host.docker.internal:8092'
const cookies = new Map(); let csrf = ''
async function api(path,method='GET',body,expected=200){
  const response=await fetch(apiBase+'/api'+path,{method,headers:{'Content-Type':'application/json','X-CSRF-TOKEN':csrf,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:body===undefined?undefined:JSON.stringify(body)})
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}
  const result=await response.json()
  if(response.headers.has('X-CSRF-TOKEN'))csrf=response.headers.get('X-CSRF-TOKEN')
  if(result.user?.csrfToken)csrf=result.user.csrfToken
  assert.equal(response.status,expected,`${method} ${path}`)
  return result
}
const {address}=await lookup('host.docker.internal',{family:4})
const pages=await(await fetch(`http://${address}:9224/json/list`)).json()
const page=pages.find(page=>page.type==='page')
const socket=new WebSocket(page.webSocketDebuggerUrl.replace('localhost','host.docker.internal').replace('127.0.0.1','host.docker.internal'))
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
let sequence=0
const pending=new Map(),errors=[],responses=[]
socket.addEventListener('message',({data})=>{
  const message=JSON.parse(data)
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text)
  if(message.method==='Network.responseReceived')responses.push({url:message.params.response.url,status:message.params.response.status})
  if(!message.id)return
  const handler=pending.get(message.id);pending.delete(message.id)
  if(message.error)handler.reject(new Error(message.error.message));else handler.resolve(message.result)
})
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value}
async function wait(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Estado não encontrado: '+expression)}
async function navigate(path,title){await command('Page.navigate',{url:browserBase+path});await wait(`location.pathname===${JSON.stringify(path)} && document.querySelector('#conteudo h1')?.textContent===${JSON.stringify(title)}`)}
async function fill(selector,value){await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`)}
async function capture(name){const {contentSize}=await command('Page.getLayoutMetrics');const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:contentSize.width,height:Math.min(contentSize.height,2100),scale:1}});writeFileSync('/fixtures/testing/layout-qa/'+name+'.png',Buffer.from(result.data,'base64'))}
async function button(text,root='document'){await evaluate(`Array.from(${root}.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`)}
async function ready(){await wait(`!!document.querySelector('.daily-plan') && !document.querySelector('.study-loading')`)}
async function reload(){await evaluate(`document.documentElement.dataset.reloading='true'`);await command('Page.navigate',{url:browserBase+'/'});await wait(`!document.documentElement.dataset.reloading && document.querySelector('#conteudo h1')?.textContent==='Hoje'`);await ready()}
async function idle(){await wait(`!Array.from(document.querySelectorAll('.daily-plan button')).some(b=>b.textContent.includes('Salvando')) && !document.querySelector('.daily-edit-form')`)}

await api('/auth/login','POST',{email:fixture.email,password:fixture.password})
const shortUnits=[{title:'Constituição: saúde',source:'Constituição: arts. 196 a 200;'},{title:'Princípios do SUS',source:'princípios e diretrizes do SUS;'},{title:'Controle social',source:'Lei 8.142/1990: participação e controle social.'}]
const shortSource=shortUnits.map(u=>u.source).join(' ')
const importedResponse={study_units_version:1,title:'Concurso de Saúde Pública 2026',has_study_syllabus:true,extraction_complete:true,options:[],groups:[{ref:'all',name:'Conhecimentos Gerais',knowledge_type:'general',applies_to_all:true,applicability:[],subjects:[{name:'Legislação Saúde',topics:[{title:'Legislação e Saúde Pública',source:shortSource,units:shortUnits}]}]}],warnings:[]}
const legacy=await api('/v1/editais','POST',{title:'Edital existente de Saúde Pública',source:'manual'},201)
const subject=await api(`/v1/editais/${legacy.id}/materias`,'POST',{name:'Legislação Saúde',weight:5,color:1},201)
const units=[{title:'Constituição: direito à saúde',source:'Constituição: artigos 196 a 200. '.repeat(15)},{title:'Princípios e organização do SUS',source:'Princípios, diretrizes e organização do SUS. '.repeat(15)},{title:'Participação e controle social',source:'Lei 8.142/1990: participação e controle social. '.repeat(15)}]
const source=units.map(u=>u.source).join('')
const topic=await api(`/v1/materias/${subject.id}/topicos`,'POST',{name:source,difficulty:5},201)
await api(`/v1/editais/${legacy.id}/ativar`,'POST')
await api('/v1/configuracao','PUT',{availability:Object.fromEntries(Array.from({length:7},(_,i)=>[i,120])),block_minutes:25,break_minutes:5})
await api('/v1/sessoes','POST',{topic_id:String(topic.id),minutes:15,correct_answers:3,wrong_answers:1,difficulty:5,completes_topic:false,request_key:crypto.randomUUID()},201)
const saved=await api('/v1/plano')
await api('/v1/plano','PUT',{date:saved.date,noticeId:saved.noticeId,version:saved.version,blockMinutes:25,breakMinutes:5,blocks:saved.blocks.map(({id,topicId,minutes,status})=>({id,topicId,minutes,status}))})
async function fit(label){assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),label+' page overflow');assert.ok(await evaluate(`!document.querySelector('[role=dialog]') || document.querySelector('[role=dialog]').querySelector('.modal-body').scrollWidth<=document.querySelector('[role=dialog]').querySelector('.modal-body').clientWidth+1`),label+' dialog overflow')}
try{
  mkdirSync('/fixtures/testing/layout-qa',{recursive:true})
  await command('Runtime.enable');await command('Page.enable');await command('Network.clearBrowserCookies')
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  await command('Page.navigate',{url:browserBase+'/entrar'})
  await wait(`!!document.querySelector('input[type=email]') && !document.querySelector('.study-loading')`)
  await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password)
  await evaluate(`document.querySelector('form').requestSubmit()`);await ready()
  await navigate('/editais/novo','Enviar edital')
  await button('Usar minha IA: copiar prompt e importar resposta')
  await wait(`!!document.querySelector('#resposta-ia')`)
  assert.ok(await evaluate(`document.querySelector('textarea[aria-label="Prompt de importação"]').value.includes('study_units_version')`))
  const count=(await api('/v1/editais')).length
  await fill('#resposta-ia','{"groups":')
  await button('Conferir organização');await wait(`!!document.querySelector('[role=dialog] [role=alert]')`)
  await fill('#resposta-ia',JSON.stringify(importedResponse))
  await button('Conferir organização');await wait(`!!document.querySelector('.unit-import-preview')`)
  assert.equal((await api('/v1/editais')).length,count)
  assert.ok(await evaluate(`document.querySelector('.unit-import-preview').textContent.includes('3 unidades')`))
  for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile'],[320,740,'small']]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    await fit('import '+label);await capture('units-import-'+label)
  }
  await button('Editar resposta');await wait(`!!document.querySelector('#resposta-ia')`)
  assert.equal(await evaluate(`document.querySelector('#resposta-ia').value`),JSON.stringify(importedResponse))
  await button('Conferir organização');await wait(`!!document.querySelector('.unit-import-preview')`)
  await button('Aplicar importação')
  await wait(`location.pathname.endsWith('/revisar') && document.querySelector('#conteudo h1')?.textContent==='Concurso de Saúde Pública 2026'`)
  const importedId=await evaluate(`location.pathname.split('/')[2]`)
  assert.equal((await api(`/v1/dashboard?edital_id=${importedId}`)).materias[0].topicos.length,3)
  await button('Confirmar conteúdo e ativar edital')
  await wait(`location.pathname==='/configuracao'`)
  await navigate('/','Hoje');await ready()
  await wait(`!!document.querySelector('.study-focus h2')`)
  assert.ok(await evaluate(`document.querySelector('.study-focus h2').textContent.length<180`))
  assert.ok(await evaluate(`!!document.querySelector('.study-focus .unit-source')`))
  await capture('units-focus-small')
  await button('Registrar estudo');await wait(`!!document.querySelector('[role=dialog]')`)
  await fit('registration small');await capture('units-registration-small')
  await button('Cancelar',"document.querySelector('[role=dialog]')")
  await navigate(`/editais/${legacy.id}/organizar`,'Organizar estudos')
  await wait(`!!document.querySelector('.organization-topics')`)
  assert.ok(await evaluate(`document.querySelector('textarea[aria-label="Prompt de organização"]').value.includes(${JSON.stringify(source.trim())})`))
  assert.equal(await evaluate(`document.querySelector('.organization-topics').parentElement.open`),false,'Manual selection should be optional and collapsed')
  const snapshot=await api(`/v1/editais/${legacy.id}/organizacao`)
  const response={version:1,topics:[{topic_id:String(topic.id),source:source.trim(),units:units.map(u=>({...u,source:u.source.trim()}))}]}
  await fill('#organization-response',JSON.stringify(response))
  await button('Conferir organização');await wait(`!!document.querySelector('.unit-preview')`)
  assert.equal((await api(`/v1/editais/${legacy.id}/organizacao`)).originals.length,0)
  for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile'],[320,740,'small']]){
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500})
    await fit('organization '+label);await capture('units-organization-'+label)
  }
  // A server failure must retain both the proposal and pasted response.
  let paused=null
  const listener=({data})=>{const m=JSON.parse(data);if(m.method==='Fetch.requestPaused')paused=m.params.requestId}
  socket.addEventListener('message',listener)
  await command('Fetch.enable',{patterns:[{urlPattern:'*/organizacao/aplicar',requestStage:'Request'}]})
  await button('Aplicar organização')
  for(let i=0;i<100&&!paused;i++)await new Promise(r=>setTimeout(r,50))
  assert.ok(paused)
  await command('Fetch.fulfillRequest',{requestId:paused,responseCode:500,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"message":"Falha simulada"}').toString('base64')})
  await command('Fetch.disable');socket.removeEventListener('message',listener)
  await wait(`document.querySelector('[role=alert]')?.textContent.includes('Falha simulada')`)
  assert.ok(await evaluate(`!!document.querySelector('.unit-preview')`))
  await button('Aplicar organização');await wait(`!!document.querySelector('.organization-page [role=status]')`)
  const after=await api(`/v1/editais/${legacy.id}/organizacao`)
  assert.equal(after.originals.length,1);assert.equal(after.originals[0].sessions,1);assert.equal(after.topics.length,3)
  assert.ok(after.topics.every(t=>t.organized))
  await wait(`document.querySelectorAll('.organization-topics input:checked').length===0`)
  await fit('success');await capture('units-success-small')
  await api(`/v1/editais/${legacy.id}/ativar`,'POST')
  await evaluate(`document.documentElement.dataset.reloading='true'`)
  await command('Page.navigate',{url:browserBase+'/'})
  await wait(`!document.documentElement.dataset.reloading && !!document.querySelector('.study-focus h2') && !document.querySelector('.study-loading')`)
  assert.ok(await evaluate(`document.querySelector('.study-focus h2').textContent.startsWith('Constitui')`),'Saved original block must remain usable after organization')
  await button('Registrar estudo');await wait(`!!document.querySelector('[role=dialog]')`)
  await fit('saved original registration');await capture('units-original-plan-small')
  await button('Cancelar',"document.querySelector('[role=dialog]')")
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('PASS: copyable prompt, invalid JSON feedback, preview without mutations, edit/retry response, import and activate, short focus title and source consultation, mobile registration, existing-notice organization, failed apply keeps proposal, history preserved, desktop/390/320 without overflow or JS exceptions.')
}catch(e){await capture('units-failure');console.log(await evaluate(`document.querySelector('#conteudo')?.innerText.slice(0,1500)`));throw e}finally{await command('Browser.close').catch(()=>{});socket.close()}
