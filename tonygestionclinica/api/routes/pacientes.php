<?php
declare(strict_types=1);

return function (PDO $db, string $metodo): void {
    $id = query_int('id');

    if ($metodo === 'GET' && $id > 0) {
        $st = $db->prepare('SELECT * FROM pacientes WHERE id = ?');
        $st->execute([$id]);
        $paciente = $st->fetch();
        if (!$paciente) {
            json_error('Paciente no encontrado.', 404);
        }
        json_out($paciente);
    }

    if ($metodo === 'GET') {
        $q = query_str('q');
        if ($q !== '') {
            $like = '%' . $q . '%';
            $st = $db->prepare(
                'SELECT * FROM pacientes
                 WHERE activo = 1
                   AND (nombre LIKE ? OR apellidos LIKE ? OR dni LIKE ? OR telefono LIKE ? OR email LIKE ?)
                 ORDER BY apellidos, nombre'
            );
            $st->execute([$like, $like, $like, $like, $like]);
        } else {
            $st = $db->query('SELECT * FROM pacientes WHERE activo = 1 ORDER BY apellidos, nombre');
        }
        json_out($st->fetchAll());
    }

    if ($metodo === 'POST' || $metodo === 'PUT') {
        $nombre = body_str('nombre');
        if ($nombre === '') {
            json_error('El nombre del paciente es obligatorio.');
        }

        $campos = [
            'nombre'           => $nombre,
            'apellidos'        => body_str('apellidos'),
            'dni'              => body_str('dni'),
            'fecha_nacimiento' => body_str('fecha_nacimiento'),
            'sexo'             => enum_o(body_str('sexo'), ['', 'M', 'F', 'O'], ''),
            'telefono'         => body_str('telefono'),
            'email'            => body_str('email'),
            'direccion'        => body_str('direccion'),
            'ciudad'           => body_str('ciudad'),
            'cp'               => body_str('cp'),
            'alerta_medica'    => body_str('alerta_medica'),
            'alergias'         => body_str('alergias'),
            'enfermedades'     => body_str('enfermedades'),
            'medicacion'       => body_str('medicacion'),
            'embarazo'         => body_bool('embarazo'),
            'fumador'          => body_bool('fumador'),
            'anticoagulantes'  => body_bool('anticoagulantes'),
            'notas'            => body_str('notas'),
        ];

        if ($metodo === 'POST') {
            $cols = implode(', ', array_keys($campos));
            $ph = implode(', ', array_fill(0, count($campos), '?'));
            $st = $db->prepare("INSERT INTO pacientes ($cols) VALUES ($ph)");
            $st->execute(array_values($campos));
            $nuevoId = (int) $db->lastInsertId();
            json_out(['id' => $nuevoId, 'mensaje' => 'Paciente creado.'], 201);
        }

        if ($id <= 0) {
            json_error('Falta el identificador del paciente.');
        }
        $sets = implode(', ', array_map(static fn ($c) => "$c = ?", array_keys($campos)));
        $st = $db->prepare("UPDATE pacientes SET $sets WHERE id = ?");
        $st->execute([...array_values($campos), $id]);
        json_out(['id' => $id, 'mensaje' => 'Paciente actualizado.']);
    }

    if ($metodo === 'DELETE') {
        if ($id <= 0) {
            json_error('Falta el identificador del paciente.');
        }
        // Baja logica: conserva historial clinico, citas y cobros.
        $st = $db->prepare('UPDATE pacientes SET activo = 0 WHERE id = ?');
        $st->execute([$id]);
        json_out(['mensaje' => 'Paciente dado de baja.']);
    }

    json_error('Metodo no permitido.', 405);
};
