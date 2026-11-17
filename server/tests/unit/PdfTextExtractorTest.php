<?php
namespace Tests\Unit;

use App\Services\PdfTextExtractor;
use CodeIgniter\Test\CIUnitTestCase;
use RuntimeException;

final class PdfTextExtractorTest extends CIUnitTestCase
{
    public function testReadsCompletePdfAndRemovesLocalCopy(): void
    {
        $stream = "BT /F1 12 Tf 20 100 Td (Conteudo de estudo) Tj ET";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($stream).">>\nstream\n".$stream."\nendstream",
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n".$object."\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 6\n0000000000 65535 f \n";
        foreach ($offsets as $offset) $pdf .= sprintf("%010d 00000 n \n", $offset);
        $pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
        $this->checkExtraction($pdf, true);
    }

    public function testRemovesLocalCopyWhenPdfIsInvalid(): void
    {
        $this->checkExtraction('arquivo invalido', false);
    }

    private function checkExtraction(string $contents, bool $valid): void
    {
        $source = tempnam(sys_get_temp_dir(), 'pdf-test-');
        file_put_contents($source, $contents);
        $before = glob(sys_get_temp_dir().'/studia-pdf-*');
        try {
            if ($valid) {
                $text = (new PdfTextExtractor())->extract($source);
                $this->assertStringContainsString('[[PAGE 1]]', $text);
                $this->assertStringContainsString('Conteudo de estudo', $text);
            } else {
                try {
                    (new PdfTextExtractor())->extract($source);
                    $this->fail('PDF inválido deve ser rejeitado.');
                } catch (RuntimeException $error) {
                    $this->assertSame('Arquivo PDF inválido ou não suportado.', $error->getMessage());
                }
            }
            $this->assertSame($contents, file_get_contents($source));
            $this->assertSame($before, glob(sys_get_temp_dir().'/studia-pdf-*'));
        } finally {
            unlink($source);
        }
    }
}
