export interface UnidadeEstudo { title: string; source: string }
export interface AssuntoOrganizado { title: string; source: string; units: UnidadeEstudo[] }
export interface PreviaImportacao {
  summary: { subjects: number; sources: number; units: number; legacy: number }
  structure: { title: string | null; warnings: string[]; groups: { ref: string; name: string; subjects: { name: string; topics: (string | AssuntoOrganizado)[] }[] }[] }
}
export interface AssuntoOrigem { topic_id: string; title: string; source: string; subject: string; group: string; sessions: number; organized?: boolean }
export interface OrganizacaoEdital { notice: { id: string; title: string }; revision: string; topics: AssuntoOrigem[]; originals: AssuntoOrigem[] }

export const REGRAS_UNIDADES = `Faça a organização pedagógica automaticamente nesta mesma resposta. Não peça ao usuário para escolher como dividir assuntos, definir quantas unidades criar ou configurar cada tópico. Entregue as unidades prontas para entrar no planejamento; a conferência humana é opcional para ajustes, não uma etapa de montagem do conteúdo.
Organize cada assunto em unidades de estudo com foco claro, sem supor que uma unidade inteira cabe em 25 minutos. Use títulos específicos de até 180 caracteres. Separe conteúdos extensos por conceito ou seção explícita. Não crie uma unidade por palavra ou frase sem contexto. Não invente capítulos, artigos, páginas, materiais, metas de questões ou informações que não estejam na origem.
Estrutura obrigatória: matéria em subjects[].name; título curto do assunto em topics[].title; texto original integral em topics[].source; focos de estudo em topics[].units[].title e topics[].units[].source. Não copie o parágrafo inteiro para um title: deixe a descrição completa em source. Não repita o título do assunto em todas as unidades. Não acrescente outro nível de subtópicos ou campos fora do formato pedido.
Dentro de cada array units, todos os title devem ser únicos, inclusive ao comparar sem diferenças de maiúsculas/minúsculas ou espaços nas extremidades. Títulos iguais em assuntos diferentes são permitidos. Cada título deve identificar o recorte real da unidade; não use títulos genéricos repetidos como "Operações básicas", "Conceitos gerais" ou "Estudo do assunto". Não resolva a repetição apenas acrescentando números ou "Parte 1/Parte 2"; use o conceito ou o contexto que distingue os trechos, sem inventar conteúdo.
Exemplo de estrutura para uma origem que realmente diga "Operações básicas: adição, subtração, multiplicação e divisão. Potenciação e Radiciação.": units=[{"title":"Adição e subtração","source":"Operações básicas: adição, subtração,"},{"title":"Multiplicação e divisão","source":"multiplicação e divisão."},{"title":"Potenciação","source":"Potenciação e"},{"title":"Radiciação","source":"Radiciação."}]. Os títulos explicam o foco; os trechos preservam até conectivos e pontuação para manter a cobertura literal. Este exemplo ilustra o formato, não deve ser acrescentado ao edital.
Não devolva um bloco extenso como uma única unidade quando ele listar assuntos independentes. Por exemplo, se a origem reunir Constituição arts. 196 a 200, princípios do SUS, Lei 8.080, Lei 8.142, APS e vigilância epidemiológica, organize esses focos em unidades distintas, usando os trechos que realmente constam na origem. Não copie este exemplo como conteúdo adicional. Uma referência isolada a uma lei ou guia sem detalhamento pode ocupar várias sessões; não invente seu índice para simular uma divisão.
Preserve o texto integral de cada assunto em source. Cada unidade deve ter title e source, sendo source um trecho literal e contíguo desse original. A concatenação dos source de todas as unidades, na ordem, deve reproduzir integralmente o source do assunto, ignorando apenas espaços e quebras de linha. Inclua pontuação e numeração nos trechos; não acrescente rótulos neles. Não omita cabeçalhos: mantenha-os no primeiro trecho. Não repita o original inteiro em cada unidade. Um assunto já específico pode ter apenas uma unidade. Títulos podem esclarecer o contexto, mas os trechos devem permanecer literais.
Antes de entregar o JSON, valide silenciosamente cada assunto: (1) title do assunto e de cada unidade com até 180 caracteres; (2) nenhum título de unidade repetido dentro do mesmo units; (3) unidades com recortes específicos e na ordem original; (4) concatenação dos trechos igual ao source integral, ignorando somente espaços e quebras de linha; (5) nenhuma omissão, duplicação ou informação inventada. Se encontrar falha, corrija a resposta antes de enviá-la. Entregue apenas o JSON final completo, sem a lista de verificações.`

// Keep replies manageable and select the next unfinished batch without manual setup.
export function assuntosParaOrganizar(topics: AssuntoOrigem[]): AssuntoOrigem[] {
  const result: AssuntoOrigem[] = []
  let characters = 0
  for (const topic of topics) {
    if (topic.organized) continue
    if (result.length && (characters + topic.source.length > 20000 || result.length >= 20)) break
    result.push(topic)
    characters += topic.source.length
  }
  return result
}

export function promptOrganizacao(data: OrganizacaoEdital, topics: AssuntoOrigem[]) {
  return `Organize os assuntos abaixo para estudar para concursos. A resposta será importada no Studia. Não altere topic_id e não crie novas matérias ou cargos. Responda exclusivamente com um objeto JSON completo, sem Markdown.
${REGRAS_UNIDADES}
Use exatamente: {"version":1,"topics":[{"topic_id":"ID recebido","source":"texto original integral","units":[{"title":"Foco específico","source":"trecho literal"}]}]}.
Devolva todos os assuntos desta seleção. Não é necessário reproduzir nomes de matérias ou grupos na resposta. Se a resposta ficar grande, avise para selecionar menos assuntos; não devolva JSON truncado.
Edital: ${data.notice.title}
Assuntos selecionados:
${JSON.stringify(topics.map(({ topic_id, subject, group, source }) => ({ topic_id, subject, group, source })), null, 2)}`
}
