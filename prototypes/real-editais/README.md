# Ensaio com PDFs reais

As amostras são construídas a partir dos cinco arquivos de `exemplos_editais` para exercitar o fluxo de copiar/importar JSON sem uma API externa. Não constituem um extrator genérico nem comprovam que uma IA interpretaria o prompt corretamente.

Os recortes de cargos estão explícitos nas mensagens do JSON e no relatório. O programa dos demais cargos não é avaliado. Os números de linhas se referem à saída do `PdfTextExtractor` para essas versões específicas dos PDFs. Cabeçalhos e rodapés são removidos apenas nesta preparação controlada.

O gerador salva os JSONs e a identificação SHA-256 dos PDFs em `server/writable/testing/editais-reais`, fora do código de produção. A rotina usa uma conta temporária e não altera os editais dos usuários.

O teste verifica importação, correspondência dos trechos, títulos únicos, aplicabilidade entre os cargos da amostra, pesos por eixo do CNU, ativação, planejamento, continuação, conclusão e revisão. NAV Brasil é um controle negativo: não deve gerar matérias nem permitir ativação de um programa inexistente.

## Saúde de Porto Velho

`porto-velho-todos-cargos.json` permite selecionar os cargos vigentes do PDF
`ilovepdf_merged (1).pdf`. Foi preparado localmente com `prepare-porto-velho-all.py`,
a partir do Anexo IV completo, sem chamada a IA externa. Não é um teste da resposta
de uma IA ao prompt da aplicação.

São 51 opções, agrupando lotações que compartilham o mesmo programa pelos intervalos
de códigos apresentados no anexo. Os conhecimentos gerais estão vinculados aos cargos
do respectivo nível de escolaridade. As cinco opções expressamente revogadas foram
excluídas. Os pesos não estão definidos no arquivo e precisam ser conferidos no quadro
de provas antes de uso definitivo.

Para testar, copie o JSON, importe pela opção de usar sua IA e, na revisão, busque e
marque o cargo. A lista de matérias deve reunir apenas os conteúdos gerais e específicos
aplicáveis. Selecionar cargos de níveis diferentes reúne ambos os programas.

`porto-velho-enfermeiro-725.json` é o recorte anterior, restrito ao cargo 725.
