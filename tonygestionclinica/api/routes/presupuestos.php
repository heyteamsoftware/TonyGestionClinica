<?php
declare(strict_types=1);

/** Maneja presupuestos, sus actos clinicos y los pagos asociados. */
return function (PDO $db, string $metodo, string $recurso): void {
    $id = query_int('id');

    if ($recurso === 'presupuestos') {
        if ($metodo === 'GET') {
            $pacienteId = query_int('paciente_id');
            if ($pacienteId <= 0) {
                json_error('Falta el identificador del paciente.');
            }

            $st = $db->prepare('SELECT * FROM presupuestos WHERE paciente_id = ? ORDER BY fecha DESC, id DESC');
            $st->execute([$pacienteId]);
            $presupuestos = $st->fetchAll();

            $stActos = $db->prepare('SELECT * FROM actos_clinicos WHERE presupuesto_id = ? ORDER BY id');
            $stPagos = $db->prepare('SELECT * FROM pagos WHERE presupuesto_id = ? ORDER BY fecha DESC, id DESC');

            foreach ($presupuestos as &$p) {
                $stActos->execute([$p['id']]);
                $p['actos'] = $stActos->fetchAll();

                $stPagos->execute([$p['id']]);
                $p['pagos'] = $stPagos->fetchAll();

                $total = 0.0;
                foreach ($p['actos'] as $a) {
                    $total += (float) $a['precio'] * (int) $a['cantidad'];
                }
                $pagado = 0.0;
                foreach ($p['pagos'] as $pago) {
                    $pagado += (float) $pago['importe'];
                }

                $p['total'] = round($total, 2);
                $p['pagado'] = round($pagado, 2);
                $p['pendiente'] = round($total - $pagado, 2);
            }
            unset($p);

            json_out($presupuestos);
        }

        if ($metodo === 'POST') {
            $pacienteId = body_int('paciente_id');
            if ($pacienteId <= 0) {
                json_error('Falta el identificador del paciente.');
            }
            $st = $db->prepare('INSERT INTO presupuestos (paciente_id, titulo, fecha, estado, notas) VALUES (?, ?, ?, ?, ?)');
            $st->execute([
                $pacienteId,
                body_str('titulo', 'Presupuesto') ?: 'Presupuesto',
                body_str('fecha', hoy()) ?: hoy(),
                enum_o(body_str('estado', 'borrador'), ['borrador', 'aceptado', 'finalizado', 'rechazado'], 'borrador'),
                body_str('notas'),
            ]);
            json_out(['id' => (int) $db->lastInsertId(), 'mensaje' => 'Presupuesto creado.'], 201);
        }

        if ($metodo === 'PUT') {
            if ($id <= 0) {
                json_error('Falta el identificador del presupuesto.');
            }
            $st = $db->prepare('UPDATE presupuestos SET titulo = ?, estado = ?, notas = ? WHERE id = ?');
            $st->execute([
                body_str('titulo', 'Presupuesto') ?: 'Presupuesto',
                enum_o(body_str('estado', 'borrador'), ['borrador', 'aceptado', 'finalizado', 'rechazado'], 'borrador'),
                body_str('notas'),
                $id,
            ]);
            json_out(['mensaje' => 'Presupuesto actualizado.']);
        }

        if ($metodo === 'DELETE') {
            if ($id <= 0) {
                json_error('Falta el identificador del presupuesto.');
            }
            $st = $db->prepare('DELETE FROM presupuestos WHERE id = ?');
            $st->execute([$id]);
            json_out(['mensaje' => 'Presupuesto eliminado.']);
        }
    }

    if ($recurso === 'actos') {
        if ($metodo === 'POST') {
            $presupuestoId = body_int('presupuesto_id');
            $nombre = body_str('nombre');
            if ($presupuestoId <= 0) {
                json_error('Falta el presupuesto de destino.');
            }
            if ($nombre === '') {
                json_error('El acto clinico necesita un nombre.');
            }
            $st = $db->prepare('INSERT INTO actos_clinicos (presupuesto_id, nombre, pieza, cantidad, precio, estado) VALUES (?, ?, ?, ?, ?, ?)');
            $st->execute([
                $presupuestoId,
                $nombre,
                body_str('pieza'),
                max(1, body_int('cantidad', 1)),
                max(0.0, body_float('precio')),
                enum_o(body_str('estado', 'planificado'), ['planificado', 'realizado'], 'planificado'),
            ]);
            json_out(['id' => (int) $db->lastInsertId(), 'mensaje' => 'Acto clinico anadido.'], 201);
        }

        if ($metodo === 'PUT') {
            if ($id <= 0) {
                json_error('Falta el identificador del acto clinico.');
            }
            $st = $db->prepare('UPDATE actos_clinicos SET estado = ? WHERE id = ?');
            $st->execute([enum_o(body_str('estado'), ['planificado', 'realizado'], 'planificado'), $id]);
            json_out(['mensaje' => 'Acto clinico actualizado.']);
        }

        if ($metodo === 'DELETE') {
            if ($id <= 0) {
                json_error('Falta el identificador del acto clinico.');
            }
            $st = $db->prepare('DELETE FROM actos_clinicos WHERE id = ?');
            $st->execute([$id]);
            json_out(['mensaje' => 'Acto clinico eliminado.']);
        }
    }

    if ($recurso === 'pagos') {
        if ($metodo === 'POST') {
            $presupuestoId = body_int('presupuesto_id');
            $importe = body_float('importe');
            if ($presupuestoId <= 0) {
                json_error('Falta el presupuesto de destino.');
            }
            if ($importe <= 0) {
                json_error('El importe del pago debe ser mayor que cero.');
            }

            $st = $db->prepare('SELECT paciente_id FROM presupuestos WHERE id = ?');
            $st->execute([$presupuestoId]);
            $pacienteId = $st->fetchColumn();
            if ($pacienteId === false) {
                json_error('El presupuesto no existe.', 404);
            }

            $st = $db->prepare('INSERT INTO pagos (presupuesto_id, paciente_id, importe, metodo, fecha, notas) VALUES (?, ?, ?, ?, ?, ?)');
            $st->execute([
                $presupuestoId,
                (int) $pacienteId,
                round($importe, 2),
                enum_o(body_str('metodo', 'efectivo'), ['efectivo', 'tarjeta', 'transferencia', 'financiacion'], 'efectivo'),
                body_str('fecha', hoy()) ?: hoy(),
                body_str('notas'),
            ]);
            json_out(['id' => (int) $db->lastInsertId(), 'mensaje' => 'Pago registrado.'], 201);
        }

        if ($metodo === 'DELETE') {
            if ($id <= 0) {
                json_error('Falta el identificador del pago.');
            }
            $st = $db->prepare('DELETE FROM pagos WHERE id = ?');
            $st->execute([$id]);
            json_out(['mensaje' => 'Pago eliminado.']);
        }
    }

    json_error('Metodo no permitido.', 405);
};
