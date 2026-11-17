<?php
// Executar no container PHP com o PDF de exemplo em /tmp/edital4.pdf.
require '/var/www/server/vendor/autoload.php';

use App\Services\{PdfTextExtractor,OpenRouterEditalExtractor,OpenRouterExtractionException,EditalStructureValidator,AiHttpTransport};

$config=static fn($name,$default)=>[
    'OPENROUTER_TOTAL_TIMEOUT_SECONDS'=>100,
    'OPENROUTER_ATTEMPT_TIMEOUT_SECONDS'=>90,
    'OPENROUTER_MAX_ATTEMPTS'=>1,
][$name]??(getenv($name)!==false?getenv($name):$default);
$transport=static function(...$args){
    $response=AiHttpTransport::request(...$args);
    if($args[0]==='POST'&&$response['status']===200){
        $raw=json_decode($response['body'],true);
        $content=$raw['choices'][0]['message']['content']??'';
        file_put_contents('/tmp/edital4-response.json',$content);
        echo json_encode(['finish_reason'=>$raw['choices'][0]['finish_reason']??null,'output_chars'=>mb_strlen($content)],JSON_UNESCAPED_UNICODE),PHP_EOL;
        try {(new EditalStructureValidator())->validateAutomatic(json_decode($content,true));}
        catch(RuntimeException $e){echo 'Validation: ',$e->getMessage(),PHP_EOL;}
    }
    return $response;
};
try {
    $result=(new OpenRouterEditalExtractor(transport:$transport,config:$config))->extract((new PdfTextExtractor())->extract('/tmp/edital4.pdf'));
    echo json_encode(['structure'=>$result['structure'],'attempts'=>$result['attempts']],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),PHP_EOL;
}catch(OpenRouterExtractionException $e){
    echo json_encode(['message'=>$e->getMessage(),'attempts'=>$e->getAttempts()],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),PHP_EOL;
}
