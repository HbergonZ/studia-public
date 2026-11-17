<?php
namespace Tests\Unit;
use App\Services\PdfReading;
use CodeIgniter\Test\CIUnitTestCase;
use RuntimeException;
final class PdfReadingTest extends CIUnitTestCase
{
    private function pdf(array $objects): string
    {
        $pdf = "%PDF-1.4\n"; $offsets = [];
        foreach ($objects as $i => $object) { $offsets[] = strlen($pdf); $pdf .= ($i + 1) . " 0 obj\n$object\nendobj\n"; }
        $xref = strlen($pdf); $pdf .= 'xref' . "\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        foreach ($offsets as $offset) $pdf .= sprintf("%010d 00000 n \n", $offset);
        return $pdf . 'trailer' . "\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
    }
    private function vector(): string
    {
        $stream = "BT /F1 22 Tf 30 200 Td (EDITAL PROVA DE CONHECIMENTOS) Tj 0 -40 Td (725 ENFERMEIRO) Tj 0 -40 Td (BIOSSEGURANCA E SAUDE DO PACIENTE) Tj ET";
        return $this->pdf(['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' . strlen($stream) . ">>\nstream\n$stream\nendstream",
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 300] >>']);
    }
    public function testCountsBlankFinalPhysicalPageAndCanResume(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'reading-test-'); file_put_contents($path, $this->vector());
        try {
            $result = (new PdfReading())->read($path);
            $this->assertSame(2, $result['reading']['total_pages']);
            $this->assertTrue($result['reading']['pages'][1]['needs_review']);
            $this->assertStringContainsString('[[PAGE 2]]', $result['text']);
            try { (new PdfReading())->read($path, static fn($progress) => false); $this->fail('Expected cancellation'); }
            catch (RuntimeException $e) { $this->assertStringContainsString('cancelada', $e->getMessage()); }
            $this->assertSame($result['text'], (new PdfReading())->read($path)['text']);
        } finally { unlink($path); }
    }
    public function testRecognizesImageOnlyPdfWithLocalOcr(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'ocr-test-'); file_put_contents($path, $this->vector()); $prefix = $path . '-image';
        file_put_contents(WRITEPATH . 'testing/ocr-vector.pdf', $this->vector());
        try {
            $process = proc_open(['pdftoppm','-f','1','-l','1','-singlefile','-scale-to','1600','-gray',$path,$prefix], [1 => ['pipe','w'], 2 => ['pipe','w']], $pipes);
            stream_get_contents($pipes[1]); stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]); $this->assertSame(0, proc_close($process));
            $pgm = file_get_contents($prefix . '.pgm'); preg_match('/^P5\s+(\d+)\s+(\d+)\s+255\s/s', $pgm, $match);
            $pixels = substr($pgm, strlen($match[0])); $draw = 'q 600 0 0 300 0 0 cm /Im0 Do Q';
            $imagePdf = $this->pdf(['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 300] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>',
                '<< /Type /XObject /Subtype /Image /Width ' . $match[1] . ' /Height ' . $match[2] . ' /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ' . strlen($pixels) . ">>\nstream\n$pixels\nendstream",
                '<< /Length ' . strlen($draw) . ">>\nstream\n$draw\nendstream"]);
            file_put_contents($path, $imagePdf);
            file_put_contents(WRITEPATH . 'testing/ocr-image.pdf', $imagePdf);
            $result = (new PdfReading())->read($path);
            $this->assertSame('ocr', $result['reading']['pages'][0]['method']);
            $this->assertStringContainsString('ENFERMEIRO', mb_strtoupper($result['text']));
            $this->assertTrue($result['reading']['pages'][0]['needs_review']);
        } finally { unlink($path); if (is_file($prefix . '.pgm')) unlink($prefix . '.pgm'); }
    }
}
