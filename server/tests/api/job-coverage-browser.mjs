import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json','utf8'))
const scenario = JSON.parse(readFileSync('/fixtures/testing/coverage-browser-fixture.json','utf8'))
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

const path=`http://127.0.0.1:8092/editais/${scenario.id}/cargo`
try {
 mkdirSync('/fixtures/testing/layout-qa',{recursive:true});await command('Runtime.enable');await command('Page.enable');await command('Network.clearBrowserCookies')
 await command('Page.navigate',{url:'http://127.0.0.1:8092/entrar'});await wait(`!!document.querySelector('input[type=email]')`)
 await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password);await evaluate(`document.querySelector('form').requestSubmit()`);await wait(`!!document.querySelector('#conteudo')`)
 await command('Page.navigate',{url:path});await wait(`!!document.querySelector('.job-import-pending')`)
 await evaluate(`document.querySelector('.job-import-pending details').open=true`)
 await matrix('pending')
 assert.ok(await evaluate(`document.querySelector('.job-import-pending pre').textContent.includes('usando BPMN.')`))
 await evaluate(`document.querySelector('.job-import-confirm input').click()`)
 assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Importar conteúdo e continuar').disabled`),true,'Pending content cannot be applied')
 await button('Este trecho não pertence ao meu cargo');await wait(`!!document.querySelector('#coverage-reason')`)
 assert.equal(await evaluate(`document.querySelector('.modal-footer button').disabled`),true)
 await fill('#coverage-reason','Conferência explícita de teste, sem registrar decisão sobre o edital real.')
 assert.equal(await evaluate(`document.querySelector('.modal-footer button').disabled`),false)
 await matrix('decision')
 await button('Registrar minha decisão');await wait(`!document.querySelector('.job-import-pending')&&!document.querySelector('[role=dialog]')`)
 await evaluate(`Array.from(document.querySelectorAll('details')).find(d=>d.querySelector('summary')?.textContent.includes('Decisões de conferência')).open=true`)
 await button('Reabrir conferência');await wait(`!!document.querySelector('.job-import-pending')`)
 await button('Conferir pendências com minha IA');await wait(`!!document.querySelector('#job-import-json')`)
 assert.ok(await evaluate(`document.querySelector('textarea[readonly]').value.length<8000`),'Localized prompt stays small')
 await fill('#job-import-json',JSON.stringify(scenario.repair));await button('Validar resposta e continuar');await wait(`!document.querySelector('.job-import-pending')&&!document.querySelector('[role=dialog]')`)
 await matrix('repaired')
 assert.ok(await evaluate(`document.querySelector('.job-import-sources').textContent.includes('Gestão e Governança de TI')`))
 await command('Page.navigate',{url:path});await wait(`!!document.querySelector('.job-import-confirm')`)
 assert.equal(await evaluate(`!!document.querySelector('.job-import-pending')`),false,'Repair survives reload')
 await evaluate(`document.querySelector('.job-import-confirm input').click()`);await button('Importar conteúdo e continuar');await wait(`location.pathname.endsWith('/revisar')`)
 assert.equal(errors.length,0,errors.join('\n'))
 console.log('PASS: known omission blocks import; original context includes short final line; explicit decision modal; small repair prompt; manual correction retains sections and survives reload; import after correction; 3 stages x3 viewports; zero JS exceptions. No external AI call.')
} catch(e) {await capture('coverage-failure');throw e} finally {await command('Browser.close').catch(()=>{});socket.close()}
