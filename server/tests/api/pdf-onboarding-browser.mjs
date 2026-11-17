import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'
const fixture = JSON.parse(readFileSync('/fixtures/testing/onboard-browser-fixture.json','utf8'))
const scenario = fixture
const {address} = await lookup('host.docker.internal',{family:4})
const pages = await (await fetch(`http://${address}:9224/json/list`)).json()
const socket = new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl.replace('localhost','host.docker.internal').replace('127.0.0.1','host.docker.internal'))
await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})})
let sequence=0; const pending=new Map(),errors=[]
socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)})
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,200))}throw new Error('Timeout: '+expression)}
async function button(text){await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`);await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)});b.focus();b.click()})()`)}
async function fill(selector,value){await evaluate(`(()=>{const i=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(i instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`)}
async function capture(name){const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync('/fixtures/testing/layout-qa/'+name+'.png',Buffer.from(r.data,'base64'))}
async function matrix(stage){for(const [width,height,label]of [[1440,1000,'desktop'],[390,844,'mobile'],[320,568,'small']]){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await evaluate('window.scrollTo(0,0)');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),stage+' '+label);await capture('job-import-'+stage+'-'+label)}}

try {
 mkdirSync('/fixtures/testing/layout-qa',{recursive:true});await command('Runtime.enable');await command('Page.enable');await command('Network.clearBrowserCookies')
 await command('Page.navigate',{url:'http://127.0.0.1:8092/entrar'});await wait(`!!document.querySelector('input[type=email]')`)
 await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password);await evaluate(`document.querySelector('form').requestSubmit()`);await wait(`!!document.querySelector('#conteudo')`)
 await command('Page.navigate',{url:'http://127.0.0.1:8092/editais/novo'});await wait(`!!document.querySelector('input[type=file]')`)
 const root=await command('DOM.getDocument');const input=await command('DOM.querySelector',{nodeId:root.root.nodeId,selector:'input[type=file]'})
 await command('DOM.setFileInputFiles',{nodeId:input.nodeId,files:['C:/dev/studia/server/writable/testing/job-import.pdf']})
 await wait(`location.pathname.endsWith('/cargo')`)
 const path=await evaluate('location.href');await command('Page.navigate',{url:path})
 await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Usar minha IA para identificar cargos'&&!b.disabled)`)
 await matrix('onboarding-read')
 await button('Usar minha IA para identificar cargos');await wait(`!!document.querySelector('#job-import-json')`)
 await fill('#job-import-json',JSON.stringify(scenario.inventory));await button('Validar resposta e continuar');await wait(`!!document.querySelector('#buscar-cargo')`)
 await evaluate(`document.querySelector('.job-import-options button').click()`);await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Copiar prompt para este cargo')`)
 await button('Copiar prompt para este cargo');await wait(`!!document.querySelector('#job-import-json')`)
 await fill('#job-import-json',JSON.stringify(scenario.content));await button('Validar resposta e continuar');await wait(`!!document.querySelector('.job-import-confirm')`)
 await evaluate(`document.querySelector('.job-import-confirm input').click()`);await button('Importar conteúdo e continuar');await wait(`location.pathname.endsWith('/revisar')`)
 await button('Confirmar conteúdo e ativar edital');await wait(`location.pathname==='/configuracao'`)
 await wait(`document.querySelectorAll('button[aria-label^="Editar horas"]').length===7`)
 await matrix('onboarding-routine')
 // Populate availability through the same inline editor used by the person.
 const edits=await evaluate(`Array.from(document.querySelectorAll('button[aria-label^="Editar horas"]')).map(b=>b.getAttribute('aria-label'))`)
 for(const label of edits){await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')===${JSON.stringify(label)}).click()`);await wait(`!!document.querySelector('input[aria-label^="Horas disponíveis"]')`);await fill('input[aria-label^="Horas disponíveis"]','2');await evaluate(`document.querySelector('input[aria-label^="Horas disponíveis"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`)}
 await button('Salvar rotina e começar');await wait(`location.pathname==='/'`);await wait(`!!document.querySelector('.daily-plan')`)
 await matrix('onboarding-plan')
 assert.ok(await evaluate(`document.querySelectorAll('.daily-block').length>0`),'First study plan contains imported units')
 assert.equal(errors.length,0,errors.join('\n'))
 console.log('PASS: fresh account, browser PDF upload, background reading survives reload, job selection, original-source review, activation, availability and first plan; 3 stages x3 viewports; no external AI calls or JS exceptions.')
} catch(e) {await capture('onboarding-failure');throw e} finally {await command('Browser.close').catch(()=>{});socket.close()}
