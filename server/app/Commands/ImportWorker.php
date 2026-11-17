<?php
namespace App\Commands;
use CodeIgniter\CLI\BaseCommand;
use App\Services\ImportJobs;
final class ImportWorker extends BaseCommand
{
    protected $group = 'Studia';
    protected $name = 'imports:work';
    protected $description = 'Processa a fila persistente de importação de editais.';
    protected $options = ['--once' => 'Processa no máximo um trabalho e encerra.'];
    public function run(array $params)
    {
        do { $processed = (new ImportJobs())->processOne(); if (\CodeIgniter\CLI\CLI::getOption('once') !== null || in_array('--once', $params, true)) return; if (!$processed) sleep(2); } while (true);
    }
}
