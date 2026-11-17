import type { Sessao } from '../types'
import { lerData } from '../lib/datas'
import { useMemo, useState } from 'react'

export default function HistoricoSessoes({ sessoes, onCorrigir }: { sessoes: Sessao[]; onCorrigir: (sessao: Sessao) => void }) {
  const [pagina, setPagina] = useState(1)
  const ordenadas = useMemo(() => [...sessoes].sort((a,b) => b.data.localeCompare(a.data) || Number(b.id) - Number(a.id)), [sessoes])
  const paginas = Math.max(1, Math.ceil(ordenadas.length / 30))
  const atual = Math.min(pagina, paginas)
  if (!sessoes.length) return <p className="text-sm text-muted">Nenhum registro nesta seção.</p>
  return <div><p className="mt-3 text-sm text-muted">Mais recentes primeiro · {sessoes.length} registros</p><ul className="divide-y divide-line">{ordenadas.slice((atual-1)*30,atual*30).map(s => {
    const total = s.acertos + s.erros
    return <li key={s.id} className="py-3"><p className="font-medium">{lerData(s.data).toLocaleDateString('pt-BR')} · {s.tempoMinutos} min</p><p className="text-sm text-muted">{s.concluiuAssunto ? 'Conclusão do estudo ou revisão' : 'Continuação'}{s.corrigida ? ' · registro corrigido' : ''}</p><p className="mt-1 text-sm">{s.acertos} acertos de {total} questões{total ? ` · ${Math.round(s.acertos / total * 100)}%` : ' · sem questões registradas'}</p><button type="button" className="quiet-link mt-2" onClick={() => onCorrigir(s)}>Corrigir registro</button></li>
  })}</ul>{paginas > 1 && <div className="library-pagination"><button disabled={atual === 1} onClick={() => setPagina(p => p-1)}>Anteriores</button><span>Página {atual} de {paginas}</span><button disabled={atual === paginas} onClick={() => setPagina(p => p+1)}>Próximos registros</button></div>}</div>
}
