// Requer o site local e um navegador de teste com --remote-debugging-port=9223.
// Execute: node server/tests/api/editais-browser.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const pages = await (await fetch('http://localhost:9223/json/list')).json()
const page = pages.find((p) => p.url === 'about:blank')
assert(page, 'Abra uma aba about:blank no navegador de teste.')
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
let sequence = 0, userId
const pending = new Map()
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (!message.id) return
  const handler = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) handler.reject(new Error(JSON.stringify(message.error)))
  else handler.resolve(message.result)
})
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function waitFor(expression) {
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`A tela não chegou ao estado esperado: ${expression}`)
}

try {
  await command('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false })
  await command('Page.navigate', { url: 'http://localhost:8088/entrar' })
  await waitFor("location.pathname === '/entrar' && document.querySelector('input') !== null")
  userId = await evaluate(`(async () => {
    const password = crypto.randomUUID() + 'aA1!';
    const response = await fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email: 'teste-ui-' + crypto.randomUUID().slice(0,8) + '@example.com', password, password_confirm: password}) });
    const data = await response.json(); if (!response.ok) throw new Error(JSON.stringify(data)); return Number(data.user.id);
  })()`)
  await command('Page.navigate', { url: 'http://localhost:8088/editais' })
  await waitFor("document.querySelector('h1')?.textContent === 'Editais'")
  await evaluate("document.querySelector('a[href=\"/editais/novo\"]').click()")
  await waitFor("document.querySelector('h1')?.textContent === 'Enviar edital'")
  await evaluate(`(() => {
    const input = document.querySelector('input:not([type=file])');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Edital do navegador');
    input.dispatchEvent(new Event('input',{bubbles:true}));
  })()`)
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Prefiro')).click()")
  await waitFor("document.querySelector('h1')?.textContent === 'Edital do navegador'")
  const noticeId = await evaluate("location.pathname.split('/')[2]")
  assert.match(noticeId, /^\d+$/)
  assert.equal(await evaluate("document.querySelector('input[name=nome]').value"), 'Edital do navegador')
  await evaluate(`(() => {
    const input = document.querySelector('input[name=nome]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Edital com nome editado');
    input.dispatchEvent(new Event('input',{bubbles:true}));
  })()`)
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Salvar nome').click()")
  await waitFor("document.querySelector('h1')?.textContent === 'Edital com nome editado'")
  await evaluate(`(async () => {
    const post = async (url, body) => { const r = await fetch('/api/v1/' + url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!r.ok)throw new Error(await r.text()); return r.json(); };
    const subject = await post('editais/${noticeId}/materias',{name:'Matéria de teste'});
    await post('materias/'+subject.id+'/topicos',{name:'Tópico de teste'});
  })()`)
  await command('Page.reload')
  await waitFor("[...document.querySelectorAll('input')].some(input => input.value === 'Matéria de teste')")
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Confirmar conteúdo')).click()")
  await waitFor("location.pathname === '/configuracao' && document.querySelector('a[href=\"/editais\"]') !== null")
  await evaluate("document.querySelector('a[href=\"/editais\"]').click()")
  await waitFor("document.querySelector('article')?.innerText.includes('Ativo')")
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Finalizar').click()")
  await waitFor("document.querySelector('[role=dialog]') !== null")
  await evaluate("document.querySelector('[role=dialog] button[type=submit]').click()")
  await waitFor("!document.querySelector('[role=dialog]') && document.querySelector('article')?.innerText.includes('Finalizado')")
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Reativar').click()")
  await waitFor("document.querySelector('[role=dialog]') !== null")
  await evaluate("document.querySelector('[role=dialog] button[type=submit]').click()")
  await waitFor("!document.querySelector('[role=dialog]') && document.querySelector('article')?.innerText.includes('Ativo')")
  await evaluate("document.querySelector('a[href=\"/editais/novo\"]').click()")
  await waitFor("document.querySelector('h1')?.textContent === 'Enviar edital'")
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Prefiro')).click()")
  await waitFor("document.querySelector('h1')?.textContent === 'Meu plano de estudos'")
  const active = await evaluate("fetch('/api/v1/dashboard').then(r=>r.json()).then(d=>String(d.edital.id))")
  assert.equal(active, noticeId, 'Novo edital não substitui o ativo')
  await evaluate("[...document.querySelectorAll('a')].find(a=>a.textContent === 'Voltar aos editais').click()")
  await waitFor("document.querySelectorAll('article').length === 2")
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true)
  const screenshot = await command('Page.captureScreenshot', { format: 'png' })
  const output = join(tmpdir(), 'studia-editais-desktop.png')
  writeFileSync(output, Buffer.from(screenshot.data, 'base64'))
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, 'Sem overflow horizontal no celular')
  console.log(`OK: cadastro manual, revisão, ativação, finalização, reativação e importação com edital ativo. Captura: ${output}`)
} finally {
  if (Number.isSafeInteger(userId) && userId > 0) {
    execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'sh', '-c', 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'], {
      input: `DELETE FROM users WHERE id = ${userId} AND username LIKE 'teste_ui_%';`, stdio: ['pipe','pipe','pipe'],
    })
  }
  await command('Browser.close')
  socket.close()
}
