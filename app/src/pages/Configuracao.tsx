import { useState } from 'react'
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
    <div className="flex w-28 flex-col items-center gap-3 rounded-2xl border border-white/10 bg-navy-900 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="relative h-[72px] w-[72px]">
        <svg width={72} height={72} viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
          <circle cx={36} cy={36} r={raio} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
          <circle
            cx={36}
            cy={36}
            r={raio}
            fill="none"
            stroke={valorExibido === 0 ? 'rgba(255,255,255,0.15)' : 'var(--color-brand-400)'}
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
              autoFocus
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRascunho(e.target.value)}
              onBlur={confirmar}
              onKeyDown={(e) => e.key === 'Enter' && confirmar()}
              className="campo-tempo-pomodoro w-10 rounded bg-navy-850 text-center font-display text-xl font-bold text-white outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={iniciarEdicao}
              className="rounded font-display text-xl font-bold text-white transition-colors hover:bg-white/10"
            >
              {valorSeguro}
            </button>
          )}
          <span className="mt-0.5 text-[10px] text-slate-500">horas</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(valorSeguro - 1, 0, MAX_HORAS_DIA))}
          aria-label={`Diminuir horas de ${label}`}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/10 bg-navy-850 text-slate-300 transition-colors hover:bg-navy-800"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange(clamp(valorSeguro + 1, 0, MAX_HORAS_DIA))}
          aria-label={`Aumentar horas de ${label}`}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/10 bg-navy-850 text-slate-300 transition-colors hover:bg-navy-800"
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
    disponibilidade,
    setDisponibilidade,
    materias,
    atualizarDificuldadeTopico,
    atualizarPesoMateria,
    metas,
    setMetas,
    salvarConfiguracao,
  } = useEstudo()
  const navigate = useNavigate()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('disponibilidade')
  const [gerando, setGerando] = useState(false)
  const [erroConfiguracao, setErroConfiguracao] = useState('')
  const indiceAtual = ABAS.findIndex((a) => a.chave === abaAtiva)
  const ehUltima = indiceAtual === ABAS.length - 1

  async function irParaProxima() {
    setErroConfiguracao('')
    if (ehUltima) {
      setGerando(true)
      try {
        await salvarConfiguracao()
        setTimeout(() => navigate('/'), 800)
      } catch (erro) {
        setGerando(false)
        setErroConfiguracao(erro instanceof Error ? erro.message : 'Não foi possível salvar a configuração.')
      }
      return
    }
    setAbaAtiva(ABAS[indiceAtual + 1].chave)
  }

  if (gerando) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-navy-950">
        <svg width="150" height="130" viewBox="0 0 150 130">
          <g className="animate-carta-flutuar" style={{ animationDelay: '0s' }}>
            <rect x="18" y="88" width="30" height="22" rx="4" fill="#131933" stroke="rgba(255,255,255,0.12)" />
          </g>
          <g className="animate-carta-flutuar" style={{ animationDelay: '0.2s' }}>
            <rect x="102" y="88" width="30" height="22" rx="4" fill="#131933" stroke="rgba(255,255,255,0.12)" />
          </g>
          <g className="animate-carta-flutuar" style={{ animationDelay: '0.4s' }}>
            <rect x="60" y="94" width="30" height="22" rx="4" fill="#131933" stroke="rgba(255,255,255,0.12)" />
          </g>

          <g transform="translate(75 55)">
            <g className="animate-bichinho-balancar">
              <ellipse cx="0" cy="12" rx="34" ry="27" fill="var(--color-brand-500)" />
              <circle cx="-25" cy="-15" r="10" fill="var(--color-brand-500)" />
              <circle cx="25" cy="-15" r="10" fill="var(--color-brand-500)" />
              <circle cx="-25" cy="-15" r="5" fill="var(--color-brand-600)" />
              <circle cx="25" cy="-15" r="5" fill="var(--color-brand-600)" />
              <circle cx="-17" cy="18" r="4.5" fill="var(--color-brand-300)" opacity="0.5" />
              <circle cx="17" cy="18" r="4.5" fill="var(--color-brand-300)" opacity="0.5" />
              <path d="M-11 6 q6 6 12 0" stroke="#0f1428" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M5 6 q6 6 12 0" stroke="#0f1428" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M-4 20 q4 3 8 0" stroke="#0f1428" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </svg>

        <div className="text-center">
          <p className="font-display text-xl font-semibold text-white">Gerando seu cronograma…</p>
          <p className="mt-1 text-sm text-slate-400">
            Organizando os tópicos e as revisões de acordo com o que você configurou.
          </p>
        </div>
      </div>
    )
  }

  function irParaAnterior() {
    if (indiceAtual > 0) setAbaAtiva(ABAS[indiceAtual - 1].chave)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-24 md:pb-0">
      <div>
        <h1 className="text-xl font-semibold text-white">Configurar</h1>
        <p className="text-sm text-slate-400">
          Passe pelas etapas abaixo (ou pule as que não quiser ajustar agora) e gere o cronograma no final.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-navy-850 p-1 text-sm">
        {ABAS.map((aba) => (
          <button
            key={aba.chave}
            type="button"
            onClick={() => setAbaAtiva(aba.chave)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium transition-colors ${
              abaAtiva === aba.chave ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <aba.Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{aba.label}</span>
          </button>
        ))}
      </div>

      {abaAtiva === 'disponibilidade' && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <IconClock className="h-4 w-4" />
            Horas disponíveis por dia
          </h2>
          <p className="mb-3 text-xs text-slate-500">Clique no número pra digitar, ou use os botões − e +.</p>
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

      {abaAtiva === 'metas' && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <IconFlag className="h-4 w-4" />
            Metas semanais
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Questões por semana
              <input
                type="number"
                min={0}
                value={metas.questoesPorSemana}
                onChange={(e) => setMetas({ ...metas, questoesPorSemana: Number(e.target.value) })}
                className="rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-slate-100 transition-colors focus:border-brand-400/60 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Horas de estudo por semana
              <input
                type="number"
                min={0}
                step={0.5}
                value={metas.minutosPorSemana / 60}
                onChange={(e) => setMetas({ ...metas, minutosPorSemana: Math.round(Number(e.target.value) * 60) })}
                className="rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-slate-100 transition-colors focus:border-brand-400/60 focus:outline-none"
              />
            </label>
          </div>
        </section>
      )}

      {abaAtiva === 'dificuldade' && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <IconAdjustments className="h-4 w-4" />
            Dificuldade por tópico
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            0 = domino completamente, 10 = não conheço nada. Define em que ponto da curva de revisão o tópico
            começa.
          </p>
          <div className="max-h-[700px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {materias.map((materia) => {
                const estilo = SUBJECT_STYLES[materia.cor]
                return (
                  <div key={materia.id} className="rounded-2xl border border-white/10 bg-navy-900 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="flex items-center gap-2 font-medium text-slate-100">
                        <span className={`h-2 w-2 rounded-full ${estilo.dot}`} />
                        {materia.nome}
                      </p>
                      <span className="text-xs text-slate-500">{materia.topicos.length} tópicos</span>
                    </div>
                    <div className="flex h-[272px] flex-col gap-3 overflow-y-auto pr-1">
                      {materia.topicos.map((topico) => (
                        <div key={topico.id} className="shrink-0">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-slate-300">{topico.nome}</span>
                            <span className="text-xs font-medium text-slate-400">{topico.dificuldade}/10</span>
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
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <IconStar className="h-4 w-4" />
            Importância por matéria
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            0 = pouco relevante, 10 = altamente cobrada. Ajuda a priorizar o conteúdo novo quando falta tempo no
            dia.
          </p>
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {materias.map((materia) => {
                const estilo = SUBJECT_STYLES[materia.cor]
                return (
                  <div key={materia.id} className="rounded-2xl border border-white/10 bg-navy-900 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-100">
                        <span className={`h-2 w-2 rounded-full ${estilo.dot}`} />
                        {materia.nome}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{materia.peso}/10</span>
                    </div>
                    <SliderDificuldade
                      rotulo="Importância"
                      valor={materia.peso}
                      onChange={(v) => atualizarPesoMateria(materia.id, v)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-white/10 bg-navy-950/95 px-4 py-4 backdrop-blur md:static md:z-auto md:border-t md:bg-transparent md:px-0 md:pt-6 md:pb-0 md:backdrop-blur-none">
        <button
          type="button"
          onClick={irParaAnterior}
          disabled={indiceAtual === 0}
          className="rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Voltar
        </button>
        <div className="flex items-center gap-3">
          {!ehUltima && (
            <button
              type="button"
              onClick={() => void irParaProxima()}
              className="rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-white/5"
            >
              Pular
            </button>
          )}
          <button
            type="button"
            onClick={() => void irParaProxima()}
            className="rounded-xl bg-brand-600 px-6 py-3 font-medium text-white transition-all duration-150 hover:scale-[1.015] hover:bg-brand-500 active:scale-[0.985]"
          >
            {ehUltima ? 'Gerar cronograma' : 'Próximo'}
          </button>
        </div>
      </div>
      {erroConfiguracao && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {erroConfiguracao}
        </p>
      )}
    </div>
  )
}
