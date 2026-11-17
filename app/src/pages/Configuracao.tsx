import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { RotinaEstudo } from '../context/EstudoContext'
import { useNavigate } from 'react-router-dom'
import { useEstudo } from '../context/EstudoContext'
import { SUBJECT_STYLES } from '../lib/subjectStyles'
import SliderDificuldade from '../components/SliderDificuldade'
import { IconClock, IconFlag, IconStar, IconAdjustments } from '../components/icons'
import type { Disponibilidade } from '../types'

const diasSemana: { chave: keyof Disponibilidade; label: string }[] = [
  { chave: 'segunda', label: 'Seg' },
  { chave: 'terca', label: 'Ter' },
  { chave: 'quarta', label: 'Qua' },
  { chave: 'quinta', label: 'Qui' },
  { chave: 'sexta', label: 'Sex' },
  { chave: 'sabado', label: 'Sáb' },
  { chave: 'domingo', label: 'Dom' },
]

function clamp(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor))
}

const MAX_HORAS_DIA = 24

function CartaoDisponibilidade({
  label,
  valor,
  onChange,
}: {
  label: string
  valor: number
  onChange: (v: number) => void
}) {
  const valorSeguro = Number.isFinite(valor) ? clamp(valor, 0, MAX_HORAS_DIA) : 0
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(String(valorSeguro))

  const valorExibido = editando ? clamp(Number(rascunho) || 0, 0, MAX_HORAS_DIA) : valorSeguro
  const raio = 30
  const circunferencia = 2 * Math.PI * raio
  const offset = circunferencia * (1 - valorExibido / MAX_HORAS_DIA)

  function iniciarEdicao() {
    setRascunho(String(valorSeguro))
    setEditando(true)
  }

  function confirmar() {
    onChange(clamp(Number(rascunho) || 0, 0, MAX_HORAS_DIA))
    setEditando(false)
  }

  return (
    <div className="flex w-28 flex-col items-center gap-3 rounded-lg border border-line bg-surface p-4">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <div className="relative h-[72px] w-[72px]">
        <svg width={72} height={72} viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
          <circle cx={36} cy={36} r={raio} fill="none" stroke="var(--color-line)" strokeWidth={7} />
          <circle
            cx={36}
            cy={36}
            r={raio}
            fill="none"
            stroke={valorExibido === 0 ? 'var(--color-line)' : 'var(--color-brand-400)'}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            style={{ transition: editando ? 'none' : 'stroke-dashoffset 200ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {editando ? (
            <input
              type="number"
              min={0}
              max={MAX_HORAS_DIA}
              value={rascunho}
              aria-label={`Horas disponíveis de ${label}`}
              step={0.25}
              autoFocus
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRascunho(e.target.value)}
              onBlur={confirmar}
              onKeyDown={(e) => e.key === 'Enter' && confirmar()}
              className="campo-tempo-pomodoro w-10 rounded bg-soft text-center font-display text-xl font-bold text-ink outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={iniciarEdicao}
              aria-label={`Editar horas de ${label}`}
              className="rounded font-display text-xl font-bold text-ink transition-colors hover:bg-line"
            >
              {valorSeguro}
            </button>
          )}
          <span className="mt-0.5 text-xs text-muted">horas</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(valorSeguro - 1, 0, MAX_HORAS_DIA))}
          aria-label={`Diminuir horas de ${label}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-soft text-ink transition-colors hover:bg-hover"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange(clamp(valorSeguro + 1, 0, MAX_HORAS_DIA))}
          aria-label={`Aumentar horas de ${label}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-soft text-ink transition-colors hover:bg-hover"
        >
          +
        </button>
      </div>
    </div>
  )
}

type Aba = 'disponibilidade' | 'metas' | 'dificuldade' | 'importancia'

const ABAS: { chave: Aba; label: string; Icon: typeof IconClock }[] = [
  { chave: 'disponibilidade', label: 'Disponibilidade', Icon: IconClock },
  { chave: 'metas', label: 'Metas', Icon: IconFlag },
  { chave: 'dificuldade', label: 'Dificuldade', Icon: IconAdjustments },
  { chave: 'importancia', label: 'Importância', Icon: IconStar },
]

export default function Configuracao() {
  const {
    disponibilidade: disponibilidadeSalva,
    blocoMinutos: blocoSalvo, pausaMinutos: pausaSalva, timezone: fusoSalvo,
    materias,
    atualizarDificuldadeTopico,
    atualizarPesoMateria,
    metas: metasSalvas, restaurarPesoMateria,
    salvarConfiguracao,
  } = useEstudo()
  const { usuario } = useAuth()
  const chaveRascunho = `studia:rotina:${usuario?.id}`
  const [original] = useState<RotinaEstudo>({ disponibilidade: disponibilidadeSalva, blocoMinutos: blocoSalvo, pausaMinutos: pausaSalva, metas: metasSalvas, timezone: fusoSalvo })
  const [rascunho] = useState<RotinaEstudo>(() => {
    try { const value = JSON.parse(sessionStorage.getItem(chaveRascunho) ?? 'null'); if (value?.disponibilidade && value?.metas && typeof value.blocoMinutos === 'number' && typeof value.pausaMinutos === 'number' && typeof value.timezone === 'string') return value } catch { /* Storage may be unavailable. */ }
    return original
  })
  const [disponibilidade, setDisponibilidade] = useState(rascunho.disponibilidade)
  const [blocoMinutos, setBlocoMinutos] = useState(rascunho.blocoMinutos)
  const [pausaMinutos, setPausaMinutos] = useState(rascunho.pausaMinutos)
  const [metas, setMetas] = useState(rascunho.metas)
  const [timezone, setTimezone] = useState(rascunho.timezone)
  const rotina = { disponibilidade, blocoMinutos, pausaMinutos, metas, timezone }
  const alterada = JSON.stringify(rotina) !== JSON.stringify(original)
  const confirmou = useRef(false)
  useEffect(() => {
    try { if (alterada && !confirmou.current) sessionStorage.setItem(chaveRascunho, JSON.stringify({ disponibilidade, blocoMinutos, pausaMinutos, metas, timezone })); else sessionStorage.removeItem(chaveRascunho) } catch { /* Keep the form usable without storage. */ }
  }, [alterada, disponibilidade, blocoMinutos, pausaMinutos, metas, timezone, chaveRascunho])
  const navigate = useNavigate()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('disponibilidade')
  const [gerando, setGerando] = useState(false)
  const [erroConfiguracao, setErroConfiguracao] = useState('')
  const indiceAtual = ABAS.findIndex((a) => a.chave === abaAtiva)
  const ehUltima = indiceAtual === ABAS.length - 1

  async function salvarRotina() {
    if (gerando) return
    setErroConfiguracao('')
    if (!Object.values(disponibilidade).some(h => h > 0)) { setErroConfiguracao('Informe tempo disponível em pelo menos um dia da semana.'); setAbaAtiva('disponibilidade'); return }
    setGerando(true)
    try { await salvarConfiguracao(rotina); confirmou.current = true; try { sessionStorage.removeItem(chaveRascunho) } catch { /* Saved on server. */ } navigate('/') }
    catch (e) { setErroConfiguracao(e instanceof Error ? e.message : 'Não foi possível salvar a rotina.') }
    finally { setGerando(false) }
  }

  async function irParaProxima() {
    if (ehUltima) { await salvarRotina(); return }
    setAbaAtiva(ABAS[indiceAtual + 1].chave)
  }

  function irParaAnterior() {
    if (indiceAtual > 0) setAbaAtiva(ABAS[indiceAtual - 1].chave)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-24 md:pb-0" aria-busy={gerando}>
      <fieldset className="contents" disabled={gerando}>
      <div>
        <h1 className="text-xl font-semibold text-ink">Configurar</h1>
        <p className="text-sm text-muted">
          Defina seu tempo e a duração dos blocos. Metas, dificuldade e importância podem ser ajustadas depois.
        </p>
      </div>

      <div className="routine-tabs grid grid-cols-2 gap-1 rounded-lg bg-soft p-1 text-sm sm:flex" role="group" aria-label="Seções de configuração">
        {ABAS.map((aba) => (
          <button
            key={aba.chave}
            aria-label={aba.label}
            aria-pressed={abaAtiva === aba.chave}
            type="button"
            onClick={() => setAbaAtiva(aba.chave)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium transition-colors ${
              abaAtiva === aba.chave ? 'bg-brand-600 text-on-brand' : 'text-muted hover:text-ink'
            }`}
          >
            <aba.Icon className="h-4 w-4 shrink-0" />
            <span>{aba.label}</span>
          </button>
        ))}
      </div>

      {abaAtiva === 'disponibilidade' && (
        <section>
          {alterada && <p role="status" className="daily-hint">Rotina em edição. Ela só será usada no plano depois de salvar. O rascunho fica disponível nesta aba.</p>}
          <div className="routine-block-settings">
            <label>Fuso horário<select value={timezone} onChange={e => setTimezone(e.target.value)}>{Array.from(new Set([fusoSalvo,'America/Manaus','America/Sao_Paulo','America/Cuiaba','America/Rio_Branco','America/Porto_Velho','America/Belem','America/Fortaleza','America/Recife','America/Bahia','America/Noronha','Europe/Lisbon','UTC'])).map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</select></label>
            <label>Bloco de estudo (min)<input type="number" min={5} max={180} value={blocoMinutos} onChange={e => setBlocoMinutos(Number(e.target.value))} /></label>
            <label>Pausa entre blocos (min)<input type="number" min={0} max={30} value={pausaMinutos} onChange={e => setPausaMinutos(Number(e.target.value))} /></label>
            <p>O plano reserva esse tempo de pausa. Um mesmo assunto pode precisar de vários blocos.</p>
          </div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
            <IconClock className="h-4 w-4" />
            Horas disponíveis por dia
          </h2>
          <p className="mb-3 text-xs text-muted">Clique no número pra digitar, ou use os botões − e +.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {diasSemana.map(({ chave, label }) => (
              <CartaoDisponibilidade
                key={chave}
                label={label}
                valor={disponibilidade[chave]}
                onChange={(v) => setDisponibilidade({ ...disponibilidade, [chave]: v })}
              />
            ))}
          </div>
        </section>
      )}

      {abaAtiva === 'disponibilidade' && <div><button type="button" className="daily-button daily-button-primary" disabled={gerando} onClick={() => void salvarRotina()}>{gerando ? 'Salvando...' : 'Salvar rotina e começar'}</button></div>}

      {abaAtiva === 'metas' && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
            <IconFlag className="h-4 w-4" />
            Metas semanais
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-ink">
              Questões por semana
              <input
                type="number"
                min={0}
                value={metas.questoesPorSemana}
                onChange={(e) => setMetas({ ...metas, questoesPorSemana: Number(e.target.value) })}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-ink transition-colors focus:border-brand-400/60 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink">
              Horas de estudo por semana
              <input
                type="number"
                min={0}
                step={0.5}
                value={metas.minutosPorSemana / 60}
                onChange={(e) => setMetas({ ...metas, minutosPorSemana: Math.round(Number(e.target.value) * 60) })}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-ink transition-colors focus:border-brand-400/60 focus:outline-none"
              />
            </label>
          </div>
        </section>
      )}

      {abaAtiva === 'dificuldade' && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
            <IconAdjustments className="h-4 w-4" />
            Dificuldade por tópico
          </h2>
          <p className="mb-3 text-xs text-muted">
            0 = domino completamente, 10 = não conheço nada. Define em que ponto da curva de revisão o tópico
            começa.
          </p>
          <div className="max-h-[700px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {materias.map((materia) => {
                const estilo = SUBJECT_STYLES[materia.cor]
                return (
                  <div key={materia.id} className="rounded-lg border border-line bg-surface p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        <span className={`h-2 w-2 rounded-full ${estilo.dot}`} />
                        {materia.nome}
                      </p>
                      <span className="text-xs text-muted">{materia.topicos.length} tópicos</span>
                    </div>
                    <div className="flex h-[272px] flex-col gap-3 overflow-y-auto pr-1">
                      {materia.topicos.map((topico) => (
                        <div key={topico.id} className="shrink-0">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-ink">{topico.nome}</span>
                            <span className="text-xs font-medium text-muted">{topico.dificuldade}/10</span>
                          </div>
                          <SliderDificuldade
                            valor={topico.dificuldade}
                            onChange={(v) => atualizarDificuldadeTopico(materia.id, topico.id, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {abaAtiva === 'importancia' && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
            <IconStar className="h-4 w-4" />
            Importância por matéria
          </h2>
          <p className="mb-3 text-xs text-muted">
            0 = pouco relevante, 100 = altamente cobrada. O peso do edital é usado como padrão; seu ajuste tem preferência. Ajuda a priorizar o conteúdo novo quando falta tempo no
            dia.
          </p>
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {materias.map((materia) => {
                const estilo = SUBJECT_STYLES[materia.cor]
                return (
                  <div key={materia.id} className="rounded-lg border border-line bg-surface p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <span className={`h-2 w-2 rounded-full ${estilo.dot}`} />
                        {materia.nome}
                      </span>
                      <span className="text-xs font-medium text-muted">{materia.peso}/100</span>
                    </div>
                    <SliderDificuldade
                      rotulo={`Importância de ${materia.nome}`} maximo={100}
                      valor={materia.peso}
                      onChange={(v) => atualizarPesoMateria(materia.id, v)}
                    />
                    <p className="mt-3 text-sm text-muted">{materia.pesoPersonalizado ? 'Preferência pessoal' : 'Padrão do edital'} · padrão {materia.pesoPadrao ?? materia.peso}/100</p>
                    {materia.pesoPersonalizado && <button type="button" className="quiet-link" onClick={() => restaurarPesoMateria(materia.id)}>Restaurar peso do edital</button>}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-line bg-canvas/95 px-4 py-4 backdrop-blur md:static md:z-auto md:border-t md:bg-transparent md:px-0 md:pt-6 md:pb-0 md:backdrop-blur-none">
        <button
          type="button"
          onClick={irParaAnterior}
          disabled={indiceAtual === 0}
          className="rounded-md border border-line px-4 py-3 font-medium text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-30"
        >
          Voltar
        </button>
        <div className="flex flex-wrap items-center justify-end gap-3">

          {!ehUltima && (
            <button
              type="button"
              onClick={() => void irParaProxima()}
              className="rounded-md border border-line px-4 py-3 font-medium text-ink transition-colors hover:bg-hover"
            >
              Pular
            </button>
          )}
          <button
            type="button"
            onClick={() => void irParaProxima()}
            className="rounded-md bg-brand-600 px-6 py-3 font-medium text-on-brand transition-all duration-150 hover:scale-[1.015] hover:bg-brand-500 active:scale-[0.985]"
          >
            {gerando ? 'Salvando...' : ehUltima ? 'Salvar rotina e ver meu plano' : 'Próximo'}
          </button>
        </div>
      </div>
      <button type="button" className="quiet-link" onClick={() => { confirmou.current = true; try { sessionStorage.removeItem(chaveRascunho) } catch { /* Saved on server. */ } navigate('/') }}>Descartar rascunho e voltar</button>
      {erroConfiguracao && (
        <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {erroConfiguracao}
        </p>
      )}
      </fieldset>
    </div>
  )
}
