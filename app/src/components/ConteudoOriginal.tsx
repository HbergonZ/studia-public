export default function ConteudoOriginal({ texto, rotulo = 'Trecho do edital', sempreVisivel = false }: { texto?: string | null; rotulo?: string; sempreVisivel?: boolean }) {
  if (!texto) return null
  if (sempreVisivel) return <section className="unit-source agenda-source"><h3>{rotulo}</h3><p tabIndex={0}>{texto}</p></section>
  return <details className="unit-source"><summary>{rotulo}</summary><p>{texto}</p></details>
}
