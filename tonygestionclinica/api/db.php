<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

/**
 * Devuelve la conexion PDO, creando el fichero SQLite,
 * el esquema y los datos iniciales la primera vez.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    if (!extension_loaded('pdo_sqlite')) {
        json_error('La extension pdo_sqlite no esta disponible en este servidor.', 500);
    }

    $primeraVez = !is_file(DB_FILE);

    if (!is_dir(DB_DIR) && !mkdir(DB_DIR, 0775, true) && !is_dir(DB_DIR)) {
        json_error('No se pudo crear el directorio de base de datos.', 500);
    }

    proteger_directorio_db();

    try {
        $pdo = new PDO('sqlite:' . DB_FILE, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $e) {
        json_error('No se pudo abrir la base de datos: ' . $e->getMessage(), 500);
    }

    // Sin WAL: el journal por defecto es el unico fiable sobre los
    // sistemas de ficheros en red habituales en hosting compartido.
    $pdo->exec('PRAGMA foreign_keys = ON');

    if ($primeraVez || !tabla_existe($pdo, 'pacientes')) {
        inicializar_esquema($pdo);
    }

    sembrar_datos_base($pdo);

    return $pdo;
}

function tabla_existe(PDO $pdo, string $tabla): bool
{
    $st = $pdo->prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
    $st->execute([$tabla]);
    return (bool) $st->fetchColumn();
}

function inicializar_esquema(PDO $pdo): void
{
    $sql = file_get_contents(SCHEMA_FILE);
    if ($sql === false) {
        json_error('No se encontro el fichero schema.sql.', 500);
    }
    $pdo->exec($sql);
}

/** Doctores, gabinetes y catalogo de actos por defecto. */
function sembrar_datos_base(PDO $pdo): void
{
    if ((int) $pdo->query('SELECT COUNT(*) FROM gabinetes')->fetchColumn() === 0) {
        $pdo->exec("INSERT INTO gabinetes (nombre) VALUES ('Sillon 1'), ('Sillon 2')");
    }

    if ((int) $pdo->query('SELECT COUNT(*) FROM doctores')->fetchColumn() === 0) {
        $st = $pdo->prepare('INSERT INTO doctores (nombre, especialidad, color) VALUES (?, ?, ?)');
        foreach ([
            ['Dr. Tony Gallardo', 'Odontologia general', '#0284c7'],
            ['Dra. Elena Ruiz', 'Ortodoncia', '#7c3aed'],
            ['Dr. Marcos Vidal', 'Implantologia', '#059669'],
        ] as $doc) {
            $st->execute($doc);
        }
    }

    if ((int) $pdo->query('SELECT COUNT(*) FROM catalogo_actos')->fetchColumn() === 0) {
        $st = $pdo->prepare('INSERT INTO catalogo_actos (nombre, categoria, precio) VALUES (?, ?, ?)');
        foreach ([
            ['Primera visita y diagnostico', 'Diagnostico', 0.0],
            ['Limpieza bucal / Tartrectomia', 'Higiene', 55.0],
            ['Obturacion (empaste)', 'Conservadora', 65.0],
            ['Endodoncia unirradicular', 'Endodoncia', 160.0],
            ['Endodoncia multirradicular', 'Endodoncia', 240.0],
            ['Extraccion simple', 'Cirugia', 70.0],
            ['Extraccion quirurgica', 'Cirugia', 150.0],
            ['Implante dental', 'Implantologia', 850.0],
            ['Corona de porcelana', 'Protesis', 420.0],
            ['Blanqueamiento dental', 'Estetica', 290.0],
            ['Revision periodica', 'Diagnostico', 25.0],
        ] as $acto) {
            $st->execute($acto);
        }
    }
}

/** Bloquea el acceso web directo al fichero .sqlite. */
function proteger_directorio_db(): void
{
    $htaccess = DB_DIR . '/.htaccess';
    if (!is_file($htaccess)) {
        @file_put_contents($htaccess, "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order allow,deny\n    Deny from all\n</IfModule>\n");
    }
    $index = DB_DIR . '/index.html';
    if (!is_file($index)) {
        @file_put_contents($index, '');
    }
}
