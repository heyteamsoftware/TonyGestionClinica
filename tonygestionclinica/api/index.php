<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Cache-Control: no-store');

// Metodo real, con soporte de override para hostings que filtran PUT/DELETE.
$metodo = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$override = strtoupper((string) ($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? body()['_method'] ?? ''));
if ($metodo === 'POST' && in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) {
    $metodo = $override;
}

if ($metodo === 'OPTIONS') {
    json_out(['ok' => true]);
}

$recurso = query_str('r');

$rutas = [
    'dashboard'    => 'dashboard.php',
    'pacientes'    => 'pacientes.php',
    'odontograma'  => 'odontograma.php',
    'citas'        => 'citas.php',
    'presupuestos' => 'presupuestos.php',
    'actos'        => 'presupuestos.php',
    'pagos'        => 'presupuestos.php',
    'catalogo'     => 'catalogo.php',
    'doctores'     => 'catalogo.php',
    'gabinetes'    => 'catalogo.php',
];

if (!isset($rutas[$recurso])) {
    json_error('Recurso no encontrado: ' . $recurso, 404);
}

try {
    $manejar = require __DIR__ . '/routes/' . $rutas[$recurso];
    $manejar(db(), $metodo, $recurso);
} catch (PDOException $e) {
    json_error('Error de base de datos: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    json_error('Error interno: ' . $e->getMessage(), 500);
}

json_error('La ruta no devolvio ninguna respuesta.', 500);
