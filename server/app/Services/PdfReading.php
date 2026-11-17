<?php
namespace App\Services;
use RuntimeException;

final class PdfReading
{
    private function run(array $command): string
    {
        $process = proc_open($command, [1 => ['pipe','w'], 2 => ['pipe','w']], $pipes);
        if (!is_resource($process)) throw new RuntimeException('Não foi possível iniciar a leitura do PDF.');
        $output = stream_get_contents($pipes[1]); $error = stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]); $status = proc_close($process);
        if ($status !== 0) throw new RuntimeException(in_array($status, [124,137,143], true) ? 'A leitura desta página excedeu o prazo. Retome para continuar pelas páginas já salvas.' : 'Não foi possível ler o PDF. Confira se o arquivo está íntegro e sem senha.');
        return (string) $output;
    }
    public function read(string $path, ?callable $progress = null): array
    {
        if (!is_file($path) || filesize($path) > 15 * 1024 * 1024) throw new RuntimeException('Envie um PDF válido de até 15 MB.');
        $local = tempnam(sys_get_temp_dir(), 'studia-reading-');
        if (!$local || !copy($path, $local)) throw new RuntimeException('Não foi possível preparar a leitura.');
        try {
            $info = $this->run(['timeout','30','pdfinfo',$local]);
            if (!preg_match('/^Pages:\s+(\d+)/m', $info, $match) || (int) $match[1] > 200) throw new RuntimeException('O PDF deve ter no máximo 200 páginas. Envie o edital e seus anexos relevantes dentro desse limite.');
            $total = (int) $match[1];
            $raw = $this->run(['timeout','30','pdftotext','-enc','UTF-8','-layout',$local,'-']);
            $pages = preg_split('/\f/u', str_replace("\r\n", "\n", $raw)) ?: [];
            $cache = WRITEPATH . 'cache/pdf-reading/' . hash_file('sha256', $local);
            if (!is_dir($cache) && !mkdir($cache, 0700, true) && !is_dir($cache)) throw new RuntimeException('Não foi possível salvar o progresso da leitura.');
            $formatted = []; $diagnostics = []; $started = hrtime(true);
            for ($page = 1; $page <= $total; $page++) {
                if ($progress && $progress(['total_pages' => $total, 'completed_pages' => $page - 1, 'current_page' => $page]) === false) throw new RuntimeException('Leitura cancelada.');
                if ((hrtime(true) - $started) / 1e9 > 600) throw new RuntimeException('A leitura atingiu o limite de dez minutos. Retome para aproveitar as páginas já reconhecidas.');
                $text = trim((string) preg_replace('/[ \t]+$/m', '', $pages[$page - 1] ?? ''));
                $letters = preg_match_all('/\pL/u', preg_replace('/^pcimarkpci[^\n]*|^www\.[^\n]*/mu', '', $text));
                $method = 'text';
                if ($letters < 40) {
                    $saved = $cache . '/page-' . $page . '.txt';
                    if (is_file($saved)) $ocr = file_get_contents($saved);
                    else {
                        $prefix = $local . '-page';
                        try {
                            $this->run(['timeout','30','pdftoppm','-f',(string)$page,'-l',(string)$page,'-scale-to','2200','-singlefile','-gray','-png',$local,$prefix]);
                            $ocr = trim($this->run(['timeout','35','env','OMP_THREAD_LIMIT=1','tesseract',$prefix . '.png','stdout','-l','por+eng','--psm','3']));
                            $temporary = tempnam($cache, 'page-');
                            if ($temporary === false || file_put_contents($temporary, $ocr, LOCK_EX) === false || !rename($temporary, $saved)) throw new RuntimeException('Não foi possível salvar a página reconhecida.');
                        } finally { if (is_file($prefix . '.png')) unlink($prefix . '.png'); }
                    }
                    if (preg_match_all('/\pL/u', (string)$ocr) > $letters) { $text = trim((string)$ocr); $method = 'ocr'; }
                }
                $diagnostics[] = ['page' => $page, 'method' => $method, 'characters' => mb_strlen($text), 'needs_review' => preg_match_all('/\pL/u', $text) < 40 || $method === 'ocr'];
                $formatted[] = '[[PAGE ' . $page . "]]\n" . $text;
            }
            $text = trim(implode("\n\n", $formatted));
            if (preg_match_all('/\pL/u', preg_replace('/\[\[PAGE \d+\]\]/', '', $text)) < 20) throw new RuntimeException('O PDF não apresentou texto legível mesmo após o reconhecimento de imagens. Envie uma cópia mais nítida.');
            new JobImportDocument($text);
            return ['text' => $text, 'reading' => ['total_pages' => $total, 'completed_pages' => $total, 'pages' => $diagnostics]];
        } finally { if (is_file($local)) unlink($local); }
    }
}
