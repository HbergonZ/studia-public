<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

service('auth')->routes($routes);

$routes->group('api/auth', static function ($routes) {
    $routes->post('login', 'Api\AuthController::login');
    $routes->post('register', 'Api\AuthController::register');
    $routes->post('logout', 'Api\AuthController::logout', ['filter' => 'api-session']);
});

$routes->group('api/v1', ['filter' => 'api-session'], static function ($routes) {
    $routes->get('me', 'Api\V1\MeController::showMe');
    $routes->get('editais', 'Api\V1\NoticesController::index');
    $routes->post('editais', 'Api\V1\NoticesController::create');
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
    $routes->post('sessoes', 'Api\V1\SessionsController::create');
    $routes->get('dashboard', 'Api\V1\DashboardController::index');
});
