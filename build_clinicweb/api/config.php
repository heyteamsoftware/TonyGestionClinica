<?php
declare(strict_types=1);

date_default_timezone_set('Europe/Madrid');

define('APP_ROOT', dirname(__DIR__));
define('DB_DIR', APP_ROOT . '/db');
define('DB_FILE', DB_DIR . '/clinica.sqlite');
define('SCHEMA_FILE', __DIR__ . '/schema.sql');

/** Envia una respuesta JSON y termina la ejecucion. */
function json_out(mixed $data, int $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $mensaje, int $status = 400)
{
    json_out(['error' => $mensaje], $status);
}

/** Cuerpo JSON de la peticion como array asociativo. */
function body(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        $cache = [];
        return $cache;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error('El cuerpo de la peticion no es JSON valido: ' . json_last_error_msg());
    }
    $cache = $data;
    return $cache;
}

function body_str(string $clave, string $defecto = ''): string
{
    $v = body()[$clave] ?? $defecto;
    return is_scalar($v) ? trim((string) $v) : $defecto;
}

function body_int(string $clave, int $defecto = 0): int
{
    $v = body()[$clave] ?? $defecto;
    return is_numeric($v) ? (int) $v : $defecto;
}

function body_float(string $clave, float $defecto = 0.0): float
{
    $v = body()[$clave] ?? $defecto;
    return is_numeric($v) ? (float) $v : $defecto;
}

function body_bool(string $clave): int
{
    $v = body()[$clave] ?? false;
    return filter_var($v, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
}

function query_int(string $clave, int $defecto = 0): int
{
    $v = $_GET[$clave] ?? $defecto;
    return is_numeric($v) ? (int) $v : $defecto;
}

function query_str(string $clave, string $defecto = ''): string
{
    $v = $_GET[$clave] ?? $defecto;
    return is_scalar($v) ? trim((string) $v) : $defecto;
}

/** Valida que un valor pertenezca a una lista cerrada. */
function enum_o(string $valor, array $permitidos, string $defecto): string
{
    return in_array($valor, $permitidos, true) ? $valor : $defecto;
}

function hoy(): string
{
    return date('Y-m-d');
}
