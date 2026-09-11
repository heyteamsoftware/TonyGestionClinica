<?php
declare(strict_types=1);

const CITA_ESTADOS = ['pendiente', 'sala_espera', 'atendido', 'cancelado'];

return function (PDO $db, string $metodo): void {
    $id = query_int('id');

    if ($metodo === 'GET') {
        $pacienteId = query_int('paciente_id');

        if ($pacienteId > 0) {
            $st = $db->prepare(
                'SELECT c.*, d.nombre AS doctor, d.color AS doctor_color, g.nombre AS gabinete
                 FROM citas c
                 LEFT JOIN doctores d ON d.id = c.doctor_id
                 LEFT JOIN gabinetes g ON g.id = c.gabinete_id
                 WHERE c.paciente_id = ?
                 ORDER BY c.fecha DESC, c.hora_inicio DESC'
            );
            $st->execute([$pacienteId]);
            json_out($st->fetchAll());
        }

        $fecha = query_str('fecha', hoy());
        $st = $db->prepare(
            'SELECT c.*,
                    p.nombre AS paciente_nombre, p.apellidos AS paciente_apellidos,
                    p.telefono AS paciente_telefono, p.alerta_medica AS paciente_alerta,
                    d.nombre AS doctor, d.color AS doctor_color,
                    g.nombre AS gabinete
             FROM citas c
             JOIN pacientes p ON p.id = c.paciente_id
             LEFT JOIN doctores d ON d.id = c.doctor_id
             LEFT JOIN gabinetes g ON g.id = c.gabinete_id
             WHERE c.fecha = ?
             ORDER BY c.hora_inicio, g.id'
        );
        $st->execute([$fecha]);
        json_out(['fecha' => $fecha, 'citas' => $st->fetchAll()]);
    }

    if ($metodo === 'POST' || $metodo === 'PUT') {
        // Cambio rapido de estado desde la agenda.
        if ($metodo === 'PUT' && isset(body()['estado']) && count(body()) <= 2) {
            if ($id <= 0) {
                json_error('Falta el identificador de la cita.');
            }
            $estado = enum_o(body_str('estado'), CITA_ESTADOS, 'pendiente');
            $st = $db->prepare('UPDATE citas SET estado = ? WHERE id = ?');
            $st->execute([$estado, $id]);
            json_out(['id' => $id, 'estado' => $estado]);
        }

        $pacienteId = body_int('paciente_id');
        $fecha = body_str('fecha');
        $horaInicio = body_str('hora_inicio');
        $horaFin = body_str('hora_fin');

        if ($pacienteId <= 0) {
            json_error('Debe seleccionar un paciente.');
        }
        if ($fecha === '' || $horaInicio === '') {
            json_error('La fecha y la hora de inicio son obligatorias.');
        }
        if ($horaFin === '' || $horaFin <= $horaInicio) {
            $horaFin = date('H:i', strtotime($horaInicio) + 1800);
        }

        $campos = [
            'paciente_id' => $pacienteId,
            'doctor_id'   => body_int('doctor_id') ?: null,
            'gabinete_id' => body_int('gabinete_id') ?: null,
            'fecha'       => $fecha,
            'hora_inicio' => $horaInicio,
            'hora_fin'    => $horaFin,
            'motivo'      => body_str('motivo'),
            'estado'      => enum_o(body_str('estado', 'pendiente'), CITA_ESTADOS, 'pendiente'),
            'notas'       => body_str('notas'),
        ];

        if ($metodo === 'POST') {
            $cols = implode(', ', array_keys($campos));
            $ph = implode(', ', array_fill(0, count($campos), '?'));
            $st = $db->prepare("INSERT INTO citas ($cols) VALUES ($ph)");
            $st->execute(array_values($campos));
            json_out(['id' => (int) $db->lastInsertId(), 'mensaje' => 'Cita creada.'], 201);
        }

        if ($id <= 0) {
            json_error('Falta el identificador de la cita.');
        }
        $sets = implode(', ', array_map(static fn ($c) => "$c = ?", array_keys($campos)));
        $st = $db->prepare("UPDATE citas SET $sets WHERE id = ?");
        $st->execute([...array_values($campos), $id]);
        json_out(['id' => $id, 'mensaje' => 'Cita actualizada.']);
    }

    if ($metodo === 'DELETE') {
        if ($id <= 0) {
            json_error('Falta el identificador de la cita.');
        }
        $st = $db->prepare('DELETE FROM citas WHERE id = ?');
        $st->execute([$id]);
        json_out(['mensaje' => 'Cita eliminada.']);
    }

    json_error('Metodo no permitido.', 405);
};
