<?php
declare(strict_types=1);

/** Catalogo de actos clinicos, doctores y gabinetes. */
return function (PDO $db, string $metodo, string $recurso): void {
    if ($metodo !== 'GET') {
        json_error('Metodo no permitido.', 405);
    }

    if ($recurso === 'doctores') {
        json_out($db->query('SELECT * FROM doctores WHERE activo = 1 ORDER BY nombre')->fetchAll());
    }

    if ($recurso === 'gabinetes') {
        json_out($db->query('SELECT * FROM gabinetes WHERE activo = 1 ORDER BY id')->fetchAll());
    }

    json_out($db->query('SELECT * FROM catalogo_actos WHERE activo = 1 ORDER BY categoria, nombre')->fetchAll());
};
