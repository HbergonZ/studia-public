<?php
require '/var/www/server/app/Services/PdfTextExtractor.php';
$before = glob(sys_get_temp_dir() . '/studia-pdf-*');
$start = microtime(true);
$text = (new App\Services\PdfTextExtractor())->extract('/var/www/server/writable/uploads/editais/1789573957_678cee0f9b41d1fd80d2.pdf');
echo json_encode([
    'seconds' => microtime(true) - $start,
    'characters' => mb_strlen($text),
    'pages' => substr_count($text, '[[PAGE '),
    'temporary_files_cleaned' => $before === glob(sys_get_temp_dir() . '/studia-pdf-*'),
]), PHP_EOL;
