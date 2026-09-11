<?php
declare(strict_types=1);

return function (PDO $db, string $metodo): void {
    if ($metodo !== 'GET') {
        json_error('Metodo no permitido.', 405);
    }

    $hoy = hoy();

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
         ORDER BY c.hora_inicio'
    );
    $st->execute([$hoy]);
    $citasHoy = $st->fetchAll();

    $st = $db->prepare('SELECT COALESCE(SUM(importe), 0) FROM pagos WHERE fecha = ?');
    $st->execute([$hoy]);
    $ingresosHoy = (float) $st->fetchColumn();

    $st = $db->prepare("SELECT COALESCE(SUM(importe), 0) FROM pagos WHERE fecha >= date(?, 'start of month')");
    $st->execute([$hoy]);
    $ingresosMes = (float) $st->fetchColumn();

    $totalPacientes = (int) $db->query('SELECT COUNT(*) FROM pacientes WHERE activo = 1')->fetchColumn();

    $st = $db->prepare('SELECT COUNT(*) FROM pacientes WHERE activo = 1 AND date(creado_en) = ?');
    $st->execute([$hoy]);
    $altasHoy = (int) $st->fetchColumn();

    $pendientes = 0;
    $enSala = 0;
    $atendidos = 0;
    foreach ($citasHoy as $c) {
        if ($c['estado'] === 'pendiente') {
            $pendientes++;
        } elseif ($c['estado'] === 'sala_espera') {
            $enSala++;
        } elseif ($c['estado'] === 'atendido') {
            $atendidos++;
        }
    }

    // Pacientes con saldo pendiente de cobro.
    $deudores = $db->query(
        "SELECT p.id, p.nombre, p.apellidos,
                COALESCE(t.total, 0) - COALESCE(c.cobrado, 0) AS pendiente
         FROM pacientes p
         LEFT JOIN (
             SELECT pr.paciente_id, SUM(a.precio * a.cantidad) AS total
             FROM presupuestos pr
             JOIN actos_clinicos a ON a.presupuesto_id = pr.id
             GROUP BY pr.paciente_id
         ) t ON t.paciente_id = p.id
         LEFT JOIN (
             SELECT paciente_id, SUM(importe) AS cobrado FROM pagos GROUP BY paciente_id
         ) c ON c.paciente_id = p.id
         WHERE p.activo = 1 AND COALESCE(t.total, 0) - COALESCE(c.cobrado, 0) > 0.009
         ORDER BY pendiente DESC
         LIMIT 5"
    )->fetchAll();

    json_out([
        'fecha'           => $hoy,
        'citas_hoy'       => $citasHoy,
        'ingresos_hoy'    => round($ingresosHoy, 2),
        'ingresos_mes'    => round($ingresosMes, 2),
        'total_pacientes' => $totalPacientes,
        'altas_hoy'       => $altasHoy,
        'resumen_citas'   => [
            'total'       => count($citasHoy),
            'pendientes'  => $pendientes,
            'sala_espera' => $enSala,
            'atendidos'   => $atendidos,
        ],
        'deudores'        => $deudores,
    ]);
};
