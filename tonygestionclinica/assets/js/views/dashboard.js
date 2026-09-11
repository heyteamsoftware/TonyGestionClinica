/* Panel principal: resumen del dia. */
window.CW = window.CW || {};

CW.Dashboard = (function () {
  const { esc, euros, fechaLarga, badgeEstadoCita, toast, vacio } = CW.UI;

  function tarjeta(titulo, valor, subtitulo, icono, color) {
    return `
      <div class="card p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">${esc(titulo)}</p>
            <p class="text-2xl font-bold text-slate-900 mt-1">${valor}</p>
            <p class="text-xs text-slate-400 mt-1">${esc(subtitulo)}</p>
          </div>
          <div class="w-10 h-10 rounded-lg grid place-items-center shrink-0" style="background:${color}1a;color:${color}">
            ${icono}
          </div>
        </div>
      </div>`;
  }

  function filaCita(c) {
    const nombre = `${c.paciente_nombre} ${c.paciente_apellidos}`.trim();
    return `
      <div class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0">
        <div class="text-sm font-semibold text-slate-700 w-14 shrink-0 tabular-nums">${esc(c.hora_inicio)}</div>
        <div class="flex-1 min-w-0">
          <a href="#/paciente/${c.paciente_id}" class="text-sm font-medium text-slate-900 hover:text-clinic-600 truncate block">
            ${esc(nombre)}
            ${c.paciente_alerta ? '<span class="ml-1 text-red-600" title="Alerta médica">&#9888;</span>' : ''}
          </a>
          <p class="text-xs text-slate-500 truncate">
            ${esc(c.motivo || 'Sin motivo indicado')}${c.gabinete ? ' · ' + esc(c.gabinete) : ''}${c.doctor ? ' · ' + esc(c.doctor) : ''}
          </p>
        </div>
        <select data-cita="${c.id}" class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer shrink-0">
          ${Object.entries(CW.UI.ESTADOS_CITA).map(([k, v]) =>
            `<option value="${k}" ${c.estado === k ? 'selected' : ''}>${v.texto}</option>`).join('')}
        </select>
      </div>`;
  }

  async function render(contenedor) {
    contenedor.innerHTML = CW.UI.cargando();

    let d;
    try {
      d = await CW.Api.dashboard();
    } catch (e) {
      contenedor.innerHTML = `<div class="card p-6 text-red-600 text-sm">${esc(e.message)}</div>`;
      return;
    }

    document.getElementById('page-subtitle').textContent = fechaLarga(d.fecha);

    const r = d.resumen_citas;
    const pendientes = d.citas_hoy.filter((c) => c.estado === 'pendiente' || c.estado === 'sala_espera');

    contenedor.innerHTML = `
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        ${tarjeta('Citas de hoy', r.total,
          `${r.pendientes} pendientes · ${r.atendidos} atendidas`,
          '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/></svg>',
          '#0284c7')}
        ${tarjeta('En sala de espera', r.sala_espera, 'Pacientes esperando',
          '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3 2"/></svg>',
          '#f59e0b')}
        ${tarjeta('Ingresos de hoy', euros(d.ingresos_hoy), `Mes en curso: ${euros(d.ingresos_mes)}`,
          '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 3v18M16 7H9.5a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H7"/></svg>',
          '#059669')}
        ${tarjeta('Pacientes activos', d.total_pacientes, `${d.altas_hoy} alta(s) hoy`,
          '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21v-1a6 6 0 0112 0v1"/></svg>',
          '#7c3aed')}
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 card overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 class="font-semibold text-slate-900 text-sm">Citas pendientes de hoy</h2>
            <a href="#/agenda" class="text-xs font-medium text-clinic-600 hover:text-clinic-700">Ver agenda completa →</a>
          </div>
          <div id="lista-citas">
            ${pendientes.length ? pendientes.map(filaCita).join('') : vacio('No hay citas pendientes', 'Todas las citas de hoy están atendidas.')}
          </div>
        </div>

        <div class="space-y-6">
          <div class="card p-5">
            <h2 class="font-semibold text-slate-900 text-sm mb-1">Acceso rápido</h2>
            <p class="text-xs text-slate-500 mb-4">Alta de paciente y nueva cita.</p>
            <button id="dash-nuevo-paciente" class="btn btn-primary w-full mb-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
              Dar de alta un paciente
            </button>
            <button id="dash-nueva-cita" class="btn btn-ghost w-full">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/></svg>
              Programar una cita
            </button>
          </div>

          <div class="card overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-200">
              <h2 class="font-semibold text-slate-900 text-sm">Saldos pendientes</h2>
            </div>
            ${d.deudores.length ? d.deudores.map((p) => `
              <a href="#/paciente/${p.id}" class="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                <span class="text-sm text-slate-700 truncate">${esc(p.apellidos)}, ${esc(p.nombre)}</span>
                <span class="text-sm font-semibold text-red-600 shrink-0 ml-2">${euros(p.pendiente)}</span>
              </a>`).join('')
              : '<p class="px-4 py-6 text-sm text-slate-400 text-center">Sin saldos pendientes.</p>'}
          </div>
        </div>
      </div>`;

    contenedor.querySelectorAll('select[data-cita]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try {
          await CW.Api.cambiarEstadoCita(Number(sel.dataset.cita), sel.value);
          toast('Estado de la cita actualizado.', 'ok');
          render(contenedor);
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    });

    contenedor.querySelector('#dash-nuevo-paciente').addEventListener('click', () => {
      CW.Pacientes.abrirFormulario(null, () => render(contenedor));
    });
    contenedor.querySelector('#dash-nueva-cita').addEventListener('click', () => {
      CW.Agenda.abrirFormularioCita({}, () => render(contenedor));
    });
  }

  return { render };
})();
