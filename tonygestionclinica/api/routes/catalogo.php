<?php
declare(strict_types=1);

/** Catalogo de actos clinicos, doctores y gabinetes (lectura y administracion). */
return function (PDO $db, string $metodo, string $recurso): void {
    $id = query_int('id');

    // Cada recurso administrable declara su tabla y sus campos editables.
    $config = [
        'doctores' => [
            'tabla'  => 'doctores',
            'orden'  => 'nombre',
            'campos' => static fn (): array => [
                'nombre'       => body_str('nombre'),
                'especialidad' => body_str('especialidad'),
                'color'        => preg_match('/^#[0-9a-fA-F]{6}$/', body_str('color')) ? body_str('color') : '#0ea5e9',
            ],
        ],
        'gabinetes' => [
            'tabla'  => 'gabinetes',
            'orden'  => 'id',
            'campos' => static fn (): array => [
                'nombre' => body_str('nombre'),
            ],
        ],
        'catalogo' => [
            'tabla'  => 'catalogo_actos',
            'orden'  => 'categoria, nombre',
            'campos' => static fn (): array => [
                'nombre'    => body_str('nombre'),
                'categoria' => body_str('categoria'),
                'precio'    => max(0.0, body_float('precio')),
            ],
        ],
    ];

    $actual = $config[$recurso];
    $tabla = $actual['tabla'];

    if ($metodo === 'GET') {
        // El panel de administracion tambien lista los dados de baja.
        $incluirInactivos = query_int('todos') === 1;
        $where = $incluirInactivos ? '' : 'WHERE activo = 1';
        json_out($db->query("SELECT * FROM $tabla $where ORDER BY {$actual['orden']}")->fetchAll());
    }

    if ($metodo === 'POST' || $metodo === 'PUT') {
        $campos = ($actual['campos'])();

        if ($campos['nombre'] === '') {
            json_error('El nombre es obligatorio.');
        }

        if ($metodo === 'POST') {
            $cols = implode(', ', array_keys($campos));
            $ph = implode(', ', array_fill(0, count($campos), '?'));
            $st = $db->prepare("INSERT INTO $tabla ($cols) VALUES ($ph)");
            $st->execute(array_values($campos));
            json_out(['id' => (int) $db->lastInsertId(), 'mensaje' => 'Registro creado.'], 201);
        }

        if ($id <= 0) {
            json_error('Falta el identificador del registro.');
        }
        // El panel permite reactivar un registro dado de baja.
        $campos['activo'] = isset(body()['activo']) ? body_bool('activo') : 1;
        $sets = implode(', ', array_map(static fn ($c) => "$c = ?", array_keys($campos)));
        $st = $db->prepare("UPDATE $tabla SET $sets WHERE id = ?");
        $st->execute([...array_values($campos), $id]);
        json_out(['id' => $id, 'mensaje' => 'Registro actualizado.']);
    }

    if ($metodo === 'DELETE') {
        if ($id <= 0) {
            json_error('Falta el identificador del registro.');
        }
        // Baja logica: las citas y los presupuestos ya emitidos siguen
        // mostrando el doctor, el gabinete o el acto con el que se crearon.
        $st = $db->prepare("UPDATE $tabla SET activo = 0 WHERE id = ?");
        $st->execute([$id]);
        json_out(['mensaje' => 'Registro dado de baja.']);
    }

    json_error('Metodo no permitido.', 405);
};
