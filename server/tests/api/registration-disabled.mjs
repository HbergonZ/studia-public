import assert from 'node:assert/strict'

const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:8088'

const registration = await fetch(`${baseUrl}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
})
assert.equal(registration.status, 403, 'O cadastro deve ser bloqueado antes de validar os dados.')
assert.match(JSON.stringify(await registration.json()), /cadastro.*desabilitado/i)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
})
assert.equal(login.status, 400, 'O login deve continuar disponível e validar os campos obrigatórios.')
console.log('OK: cadastro bloqueado na API; login disponível.')
