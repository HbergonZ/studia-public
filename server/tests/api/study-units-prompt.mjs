import assert from 'node:assert/strict'
import { assuntosParaOrganizar, promptOrganizacao } from '/app/studyUnits.ts'

const topic = (id, size = 50, organized = false) => ({ topic_id: String(id), title: 'Assunto', source: 'a'.repeat(size), subject: 'Saúde', group: 'Geral', sessions: 0, organized })
const topics = [topic(1), topic(2, 50, true), topic(3, 19950), topic(4)]
assert.deepEqual(assuntosParaOrganizar(topics).map(t => t.topic_id), ['1','3'])
assert.equal(assuntosParaOrganizar(Array.from({ length: 30 }, (_, i) => topic(i))).length, 20)
assert.deepEqual(assuntosParaOrganizar([topic(1, 100, true)]), [])
assert.equal(assuntosParaOrganizar([topic(1, 25000)]).length, 1)
const next = topics.map(t => ['1','3'].includes(t.topic_id) ? { ...t, organized: true } : t)
assert.deepEqual(assuntosParaOrganizar(next).map(t => t.topic_id), ['4'])
const data = { notice: { title: 'Edital' }, topics }
const prompt = promptOrganizacao(data, assuntosParaOrganizar(topics))
assert.ok(prompt.includes('"topic_id": "1"') && prompt.includes('"topic_id": "3"'))
assert.ok(!prompt.includes('"topic_id": "2"'))
console.log('PASS: automatic selection, bounded replies, next batch, organized units excluded, prompt preserves selected IDs.')
