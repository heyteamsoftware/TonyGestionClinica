<?php
declare(strict_types=1);

const PIEZAS_FDI = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

const ODONTO_ESTADOS = ['sano', 'caries', 'ausente', 'empaste', 'implante'];

return function (PDO $db, string $metodo): void {
    if ($metodo === 'GET') {
        $pacienteId = query_int('paciente_id');
        if ($pacienteId <= 0) {
            json_error('Falta el identificador del paciente.');
        }
        $st = $db->prepare('SELECT pieza, estado, notas, actualizado_en FROM odontograma WHERE paciente_id = ?');
        $st->execute([$pacienteId]);

        $piezas = [];
        foreach ($st->fetchAll() as $fila) {
            $piezas[$fila['pieza']] = $fila;
        }
        json_out(['paciente_id' => $pacienteId, 'piezas' => (object) $piezas]);
    }

    if ($metodo === 'POST' || $metodo === 'PUT') {
        $pacienteId = body_int('paciente_id');
        $pieza = body_str('pieza');
        $estado = enum_o(body_str('estado'), ODONTO_ESTADOS, 'sano');
        $notas = body_str('notas');

        if ($pacienteId <= 0) {
            json_error('Falta el identificador del paciente.');
        }
        if (!in_array((int) $pieza, PIEZAS_FDI, true)) {
            json_error('Pieza dental no valida: ' . $pieza);
        }

        if ($estado === 'sano' && $notas === '') {
            // Sano sin anotaciones equivale a no tener registro.
            $st = $db->prepare('DELETE FROM odontograma WHERE paciente_id = ? AND pieza = ?');
            $st->execute([$pacienteId, $pieza]);
            json_out(['pieza' => $pieza, 'estado' => 'sano']);
        }

        $st = $db->prepare(
            'INSERT INTO odontograma (paciente_id, pieza, estado, notas, actualizado_en)
             VALUES (?, ?, ?, ?, datetime(\'now\',\'localtime\'))
             ON CONFLICT (paciente_id, pieza)
             DO UPDATE SET estado = excluded.estado,
                           notas = excluded.notas,
                           actualizado_en = excluded.actualizado_en'
        );
        $st->execute([$pacienteId, $pieza, $estado, $notas]);
        json_out(['pieza' => $pieza, 'estado' => $estado, 'notas' => $notas]);
    }

    json_error('Metodo no permitido.', 405);
};
