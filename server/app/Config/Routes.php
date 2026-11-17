<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

service('auth')->routes($routes);

$routes->group('api/auth', static function ($routes) {
    $routes->post('login', 'Api\AuthController::login');
    $routes->post('register', 'Api\AuthController::register');
    $routes->post('logout', 'Api\AuthController::logout', ['filter' => ['api-session', 'api-csrf']]);
    $routes->post('change-password', 'Api\AuthController::changePassword', ['filter' => ['api-session', 'api-csrf']]);
});

$routes->group('api/v1', ['filter' => ['api-session', 'api-csrf']], static function ($routes) {
    $routes->get('me', 'Api\V1\MeController::showMe');
    $routes->get('importacao', 'Api\V1\NoticesController::importCapabilities');
    $routes->get('admin/users', 'Api\V1\UsersController::index');
    $routes->post('admin/users/(:num)/reset-access', 'Api\V1\UsersController::resetAccess/$1');
    $routes->post('admin/users', 'Api\V1\UsersController::create', ['filter' => 'api-csrf']);
    $routes->post('editais/prever-importacao', 'Api\V1\StudyUnitsController::previewImport', ['filter' => 'api-csrf']);
    $routes->get('editais/(:num)/organizacao', 'Api\V1\StudyUnitsController::show/$1');
    $routes->post('editais/(:num)/organizacao/prever', 'Api\V1\StudyUnitsController::preview/$1', ['filter' => 'api-csrf']);
    $routes->post('editais/(:num)/organizacao/aplicar', 'Api\V1\StudyUnitsController::apply/$1', ['filter' => 'api-csrf']);
    $routes->get('editais', 'Api\V1\NoticesController::index');
    $routes->post('editais', 'Api\V1\NoticesController::create');
    $routes->post('editais/(:num)/importacao-cargo/preparar', 'Api\V1\JobImportsController::prepare/$1');
    $routes->get('editais/(:num)/importacao-cargo', 'Api\V1\JobImportsController::show/$1');
    $routes->get('editais/(:num)/importacao-cargo/prompt', 'Api\V1\JobImportsController::prompt/$1');
    $routes->post('editais/(:num)/importacao-cargo/inventory', 'Api\V1\JobImportsController::inventory/$1');
    $routes->post('editais/(:num)/importacao-cargo/content', 'Api\V1\JobImportsController::content/$1');
    $routes->post('editais/(:num)/importacao-cargo/repair', 'Api\V1\JobImportsController::repair/$1');
    $routes->post('editais/(:num)/importacao-cargo/cancelar', 'Api\V1\JobImportsController::cancel/$1');
    $routes->post('editais/(:num)/importacao-cargo/ler', 'Api\V1\JobImportsController::reading/$1');
    $routes->post('editais/(:num)/importacao-cargo/confirmar-documento', 'Api\V1\JobImportsController::confirmDocument/$1');
    $routes->post('editais/(:num)/importacao-cargo/resolver', 'Api\V1\JobImportsController::resolve/$1');
    $routes->post('editais/(:num)/importacao-cargo/selecionar', 'Api\V1\JobImportsController::select/$1');
    $routes->post('editais/(:num)/importacao-cargo/aplicar', 'Api\V1\JobImportsController::apply/$1');
    $routes->delete('editais/(:num)', 'Api\V1\NoticesController::delete/$1');
    $routes->post('editais/(:num)/ativar', 'Api\V1\NoticesController::confirm/$1');
    $routes->post('editais/(:num)/finalizar', 'Api\V1\NoticesController::finish/$1');
    $routes->get('editais/(:num)', 'Api\V1\NoticesController::show/$1');
    $routes->patch('editais/(:num)', 'Api\V1\NoticesController::update/$1');
    $routes->post('editais/(:num)/extrair', 'Api\V1\NoticesController::extract/$1');
    $routes->post('editais/(:num)/importar-resposta', 'Api\V1\NoticesController::importResponse/$1');
    $routes->post('editais/(:num)/confirmar', 'Api\V1\NoticesController::confirm/$1');
    $routes->post('editais/(:num)/desativar', 'Api\V1\NoticesController::deactivate/$1');
    $routes->post('editais/(:num)/materias', 'Api\V1\CatalogController::createSubject/$1');
    $routes->patch('editais/(:num)/areas/(:num)', 'Api\V1\CatalogController::updateArea/$1/$2');
    $routes->patch('editais/(:num)/opcoes/(:num)', 'Api\V1\CatalogController::updateOption/$1/$2');
    $routes->patch('editais/(:num)/areas/(:num)', 'Api\V1\CatalogController::updateArea/$1/$2');
    $routes->patch('materias/(:num)', 'Api\V1\CatalogController::updateSubject/$1');
    $routes->delete('materias/(:num)', 'Api\V1\CatalogController::deleteSubject/$1');
    $routes->post('materias/(:num)/topicos', 'Api\V1\CatalogController::createTopic/$1');
    $routes->patch('topicos/(:num)', 'Api\V1\CatalogController::updateTopic/$1');
    $routes->delete('topicos/(:num)', 'Api\V1\CatalogController::deleteTopic/$1');
    $routes->get('configuracao', 'Api\V1\ConfigurationController::showConfig');
    $routes->put('configuracao', 'Api\V1\ConfigurationController::save');
    $routes->get('cronograma', 'Api\V1\ScheduleController::index');
    $routes->post('sessoes', 'Api\V1\SessionsController::create', ['filter' => 'api-csrf']);
    $routes->patch('sessoes/(:num)', 'Api\V1\SessionsController::correct/$1');
    $routes->get('plano', 'Api\V1\DailyPlansController::showPlan');
    $routes->put('plano', 'Api\V1\DailyPlansController::save', ['filter' => 'api-csrf']);
    $routes->get('planos', 'Api\V1\DailyPlansController::index');
    $routes->get('dashboard', 'Api\V1\DashboardController::index');
});
