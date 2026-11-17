# ADR 0011: processamento recuperável de PDF e unidades locais

Data: 18/10/2026.

O processamento HTTP atual depende da conexão permanecer aberta. As alternativas são adicionar um broker externo ou usar uma fila transacional no PostgreSQL existente. Escolhemos uma fila simples com reserva de trabalho, revisão do rascunho e um worker CLI. O cancelamento invalida a revisão; respostas em trânsito não podem gravar resultados após cancelar. Cotas exigem retomada explícita, sem tentativas infinitas.

Poppler já fornece metadados, texto e renderização. Ele não reconhece texto de imagens. Tesseract e os modelos português/inglês serão dependências de sistema para OCR local, sem enviar imagens a outro serviço. A leitura terá limites de páginas, resolução e duração por processo. O cache por arquivo e página permite retomar OCR sem repetir as páginas concluídas.

Todas as páginas físicas serão referenciadas. Diagnóstico e fonte ficam no rascunho. Retificações e documentos só com anexos pedem confirmação explícita de que o conjunto está completo; não se presume que regras ausentes possam ser inventadas. A existência de títulos/experiência não prova a existência de programa de conhecimentos.

Unidades serão recortes consecutivos do texto original, com corte conservador em limites de frases ou itens. A validação existente compara a concatenação com a fonte, sem aceitar omissões nem duplicações introduzidas. Títulos curtos são derivados do próprio trecho e recebem um índice único. A revisão mostra o resultado antes de aplicar. Unidades longas sem limite seguro continuam longas, em vez de serem cortadas arbitrariamente.

As rotas de importação manual e os editais existentes permanecem compatíveis. A interface principal usa a fila; respostas externas continuam sendo validadas sincronamente. Não há nova biblioteca PHP ou JavaScript.
