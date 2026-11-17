<?php

namespace App\Services;

use RuntimeException;

final class PdfTextExtractor
{
    public function extract(string $path): string
    {
        if (! is_file($path)) throw new RuntimeException('Arquivo PDF inválido.');

        // A leitura aleatória do PDF em volumes compartilhados pode exceder o prazo.
        // Copiar uma vez permite que o conversor trabalhe no disco local do container.
        $localPath = tempnam(sys_get_temp_dir(), 'studia-pdf-');
        if ($localPath === false) throw new RuntimeException('Não foi possível preparar a leitura do PDF.');
        try {
            if (! copy($path, $localPath)) throw new RuntimeException('Não foi possível preparar a leitura do PDF.');
            return $this->extractLocal($localPath);
        } finally {
            unlink($localPath);
        }
    }

    private function extractLocal(string $path): string
    {
        $process = proc_open(
            ['timeout', '30', 'pdftotext', '-enc', 'UTF-8', '-layout', $path, '-'],
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
        );
        if (! is_resource($process)) throw new RuntimeException('Não foi possível iniciar a leitura do PDF.');

        $text = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $status = proc_close($process);

        if ($status !== 0) {
            log_message('error', 'Falha ao ler PDF com pdftotext (status {status}): {error}', ['status' => $status, 'error' => trim((string) $error)]);
            if (in_array($status, [124, 137, 143], true)) {
                throw new RuntimeException('A leitura do PDF excedeu o limite de 30 segundos. Tente novamente ou use a importação manual.');
            }
            throw new RuntimeException('Arquivo PDF inválido ou não suportado.');
        }

        $pages = preg_split('/\f/u', str_replace("\r\n", "\n", (string) $text)) ?: [];
        $formatted = [];
        foreach ($pages as $index => $page) {
            $page = trim((string) preg_replace('/[ \t]+$/m', '', $page));
            if ($page !== '') $formatted[] = '[[PAGE ' . ($index + 1) . "]]\n" . $page;
        }
        $text = trim(implode("\n\n", $formatted));
        if ($text === '') throw new RuntimeException('Não foi possível extrair texto. PDFs escaneados exigem OCR e não são aceitos neste MVP.');
        return $text;
    }
}
