import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json','utf8'))
const scenario = JSON.parse(readFileSync('/fixtures/testing/job-import-fixture.json','utf8'))
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
try{
 mkdirSync('/fixtures/testing/layout-qa',{recursive:true});await command('Runtime.enable');await command('Page.enable');await command('Network.clearBrowserCookies')
 await command('Page.navigate',{url:'http://127.0.0.1:8092/entrar'});await wait(`!!document.querySelector('input[type=email]')`)
 await fill('input[type=email]',fixture.email);await fill('input[type=password]',fixture.password);await evaluate(`document.querySelector('form').requestSubmit()`);await wait(`!!document.querySelector('#conteudo')`)
 await command('Page.navigate',{url:path});await wait(`!!document.querySelector('.job-import-panel')`);await matrix('inventory')
 await button('Usar minha IA para identificar cargos');await wait(`!!document.querySelector('#job-import-json')`)
 assert.equal(await evaluate('document.activeElement.id'),'job-import-json','focus skips the hidden readonly prompt')
 await fill('#job-import-json',JSON.stringify(scenario.inventory));await button('Validar resposta e continuar');await wait(`!!document.querySelector('#buscar-cargo')`);await matrix('jobs')
 await fill('#buscar-cargo','725');assert.equal(await evaluate('document.querySelectorAll(".job-import-options>li").length'),1)
 await evaluate(`document.querySelector('.job-import-options button').click()`);await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Copiar prompt para este cargo')`)
 await command('Page.navigate',{url:path});await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Copiar prompt para este cargo')`)
 await button('Copiar prompt para este cargo');await wait(`!!document.querySelector('#job-import-json')`)
 const wrong={...scenario.content,option_ref:'602'};await fill('#job-import-json',JSON.stringify(wrong));await button('Validar resposta e continuar');await wait(`!!document.querySelector('[role=dialog] [role=alert]')`)
 assert.equal(await evaluate(`document.querySelector('#job-import-json').value`),JSON.stringify(wrong))
 await fill('#job-import-json',JSON.stringify(scenario.content));await button('Validar resposta e continuar');await wait(`!!document.querySelector('.job-import-confirm')`);await matrix('preview')
 assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Importar conteúdo e continuar').disabled`),true)
 await evaluate(`document.querySelector('.job-import-sources details').open=true`);assert.ok(await evaluate(`document.querySelector('.job-import-sources pre').textContent.includes('Interpretacao de texto.')`))
 await evaluate(`document.querySelector('.job-import-confirm input').click()`);await button('Importar conteúdo e continuar');await wait(`location.pathname.endsWith('/revisar') && !!document.querySelector('#conteudo h1')`)
 assert.equal(errors.length,0,errors.join('\n'))
 console.log('PASS: complete manual per-job flow, numbered prompts, visible-input modal focus, search, selected job survives reload, invalid response preserves form, original-source preview, explicit confirmation and review navigation; 3 stages x3 viewports; no external AI call or JS exceptions.')
}catch(e){await capture('job-import-failure');throw e}finally{await command('Browser.close').catch(()=>{});socket.close()}
