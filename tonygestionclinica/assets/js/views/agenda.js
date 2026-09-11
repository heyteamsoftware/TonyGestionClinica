/* Agenda diaria multigabinete. */
window.CW = window.CW || {};

CW.Agenda = (function () {
  const { esc, toast, modal, badgeEstadoCita, fechaLarga, hoyISO } = CW.UI;

  const HORA_INICIO = 8;   // 08:00
  const HORA_FIN = 21;     // 21:00
  const MINUTOS_FRANJA = 30;
  const ALTO_FRANJA = 56;  // px, debe coincidir con .agenda-celda

  let fechaActual = hoyISO();
  let cacheGabinetes = null;
  let cacheDoctores = null;

  const aMinutos = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  async function gabinetes() {
    if (!cacheGabinetes) cacheGabinetes = await CW.Api.gabinetes();
    return cacheGabinetes;
  }

  async function doctores() {
    if (!cacheDoctores) cacheDoctores = await CW.Api.doctores();
    return cacheDoctores;
  }

  function franjas() {
    const lista = [];
    for (let h = HORA_INICIO; h < HORA_FIN; h++) {
      for (let m = 0; m < 60; m += MINUTOS_FRANJA) {
        lista.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return lista;
  }

  function bloqueCita(c) {
    const info = CW.UI.ESTADOS_CITA[c.estado] || CW.UI.ESTADOS_CITA.pendiente;
    const inicio = aMinutos(c.hora_inicio);
    const fin = Math.max(aMinutos(c.hora_fin), inicio + MINUTOS_FRANJA);
    const top = ((inicio - HORA_INICIO * 60) / MINUTOS_FRANJA) * ALTO_FRANJA;
    const alto = ((fin - inicio) / MINUTOS_FRANJA) * ALTO_FRANJA - 4;
    const color = c.doctor_color || '#0ea5e9';
    const nombre = `${c.paciente_nombre} ${c.paciente_apellidos}`.trim();

    return `
      <div class="agenda-cita" data-cita="${c.id}"
           style="top:${top + 2}px;height:${alto}px;background:${color}1f;color:${color};">
        <div class="font-semibold text-slate-800 truncate flex items-center gap-1">
          ${c.paciente_alerta ? '<span class="text-red-600">&#9888;</span>' : ''}${esc(nombre)}
        </div>
        <div class="text-slate-500 truncate">${esc(c.hora_inicio)}–${esc(c.hora_fin)} · ${esc(c.motivo || 'Cita')}</div>
        <div class="text-slate-400 truncate">${esc(c.doctor || 'Sin doctor')}</div>
        <span class="absolute top-1 right-1 w-2 h-2 rounded-full" style="background:${info.punto}" title="${info.texto}"></span>
      </div>`;
  }

  async function pintarCalendario(contenedor) {
    const destino = contenedor.querySelector('#calendario');
    destino.innerHTML = CW.UI.cargando();

    let datos, gabs;
    try {
      [datos, gabs] = await Promise.all([CW.Api.agenda(fechaActual), gabinetes()]);
    } catch (e) {
      destino.innerHTML = `<div class="p-6 text-red-600 text-sm">${esc(e.message)}</div>`;
      return;
    }

    const citas = datos.citas;
    const sinGabinete = citas.filter((c) => !c.gabinete_id);
    const listaFranjas = franjas();

    const cabecera = `
      <div class="agenda-grid sticky top-0 bg-white z-10 border-b border-slate-200" style="--gabinetes:${gabs.length}">
        <div class="py-2.5"></div>
        ${gabs.map((g) => `
          <div class="py-2.5 text-center border-l border-slate-200">
            <p class="text-sm font-semibold text-slate-800">${esc(g.nombre)}</p>
            <p class="text-xs text-slate-400">${citas.filter((c) => c.gabinete_id === g.id).length} cita(s)</p>
          </div>`).join('')}
      </div>`;

    const cuerpo = `
      <div class="agenda-grid relative" style="--gabinetes:${gabs.length}">
        <div>${listaFranjas.map((h) => `<div class="agenda-hora">${h.endsWith(':00') ? h : ''}</div>`).join('')}</div>
        ${gabs.map((g) => `
          <div class="relative">
            ${listaFranjas.map((h) => `<div class="agenda-celda" data-hora="${h}" data-gabinete="${g.id}"></div>`).join('')}
            ${citas.filter((c) => c.gabinete_id === g.id).map(bloqueCita).join('')}
          </div>`).join('')}
      </div>`;

    destino.innerHTML = `
      <div class="card overflow-hidden">
        <div class="max-h-[calc(100vh-230px)] overflow-y-auto">
          ${cabecera}
          ${cuerpo}
        </div>
      </div>
      ${sinGabinete.length ? `
        <div class="card mt-4 p-4">
          <p class="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Citas sin gabinete asignado</p>
          <div class="space-y-2">
            ${sinGabinete.map((c) => `
              <button data-cita="${c.id}" class="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100">
                <span class="text-sm font-medium tabular-nums">${esc(c.hora_inicio)}</span>
                <span class="text-sm flex-1 truncate">${esc(c.paciente_nombre)} ${esc(c.paciente_apellidos)}</span>
                ${badgeEstadoCita(c.estado)}
              </button>`).join('')}
          </div>
        </div>` : ''}`;

    destino.querySelectorAll('.agenda-celda').forEach((celda) => {
      celda.addEventListener('click', () => {
        abrirFormularioCita(
          { fecha: fechaActual, hora_inicio: celda.dataset.hora, gabinete_id: Number(celda.dataset.gabinete) },
          () => pintarCalendario(contenedor)
        );
      });
    });

    destino.querySelectorAll('[data-cita]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const cita = citas.find((c) => c.id === Number(el.dataset.cita));
        if (cita) abrirDetalleCita(cita, () => pintarCalendario(contenedor));
      });
    });
  }

  async function render(contenedor) {
    document.getElementById('page-subtitle').textContent = 'Calendario diario por gabinete';

    contenedor.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-2">
          <button id="dia-anterior" class="btn btn-ghost px-2.5" title="Día anterior">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <input id="fecha-agenda" type="date" value="${fechaActual}" class="input w-auto">
          <button id="dia-siguiente" class="btn btn-ghost px-2.5" title="Día siguiente">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M9 5l7 7-7 7"/></svg>
          </button>
          <button id="ir-hoy" class="btn btn-ghost">Hoy</button>
          <p id="etiqueta-fecha" class="text-sm text-slate-500 ml-2 hidden lg:block capitalize"></p>
        </div>
        <button id="btn-nueva-cita" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
          Nueva cita
        </button>
      </div>
      <div id="calendario"></div>`;

    const input = contenedor.querySelector('#fecha-agenda');
    const etiqueta = contenedor.querySelector('#etiqueta-fecha');

    const actualizar = () => {
      input.value = fechaActual;
      etiqueta.textContent = fechaLarga(fechaActual);
      pintarCalendario(contenedor);
    };

    const mover = (dias) => {
      const d = new Date(fechaActual + 'T00:00:00');
      d.setDate(d.getDate() + dias);
      fechaActual = d.toISOString().slice(0, 10);
      actualizar();
    };

    input.addEventListener('change', () => { fechaActual = input.value || hoyISO(); actualizar(); });
    contenedor.querySelector('#dia-anterior').addEventListener('click', () => mover(-1));
    contenedor.querySelector('#dia-siguiente').addEventListener('click', () => mover(1));
    contenedor.querySelector('#ir-hoy').addEventListener('click', () => { fechaActual = hoyISO(); actualizar(); });
    contenedor.querySelector('#btn-nueva-cita').addEventListener('click', () => {
      abrirFormularioCita({ fecha: fechaActual }, () => pintarCalendario(contenedor));
    });

    actualizar();
  }

  /* --- Formulario de cita --- */
  async function abrirFormularioCita(inicial, alGuardar) {
    const c = inicial || {};
    const esEdicion = Boolean(c.id);

    let pacientes, docs, gabs;
    try {
      [pacientes, docs, gabs] = await Promise.all([CW.Api.pacientes(), doctores(), gabinetes()]);
    } catch (e) {
      toast(e.message, 'error');
      return;
    }

    if (!pacientes.length) {
      toast('Primero debes dar de alta al menos un paciente.', 'aviso');
      return;
    }

    const opciones = (lista, seleccionado, etiqueta = 'nombre') =>
      lista.map((x) => `<option value="${x.id}" ${Number(seleccionado) === x.id ? 'selected' : ''}>${esc(x[etiqueta])}</option>`).join('');

    modal({
      titulo: esEdicion ? 'Editar cita' : 'Nueva cita',
      ancho: 'max-w-xl',
      contenido: `
        <form id="form-cita" class="space-y-3">
          <div>
            <label class="label">Paciente *</label>
            <select name="paciente_id" required class="input">
              <option value="">Selecciona un paciente…</option>
              ${pacientes.map((p) => `<option value="${p.id}" ${Number(c.paciente_id) === p.id ? 'selected' : ''}>${esc(p.apellidos)}, ${esc(p.nombre)}${p.dni ? ' · ' + esc(p.dni) : ''}</option>`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div><label class="label">Fecha *</label><input name="fecha" type="date" required class="input" value="${esc(c.fecha || fechaActual)}"></div>
            <div><label class="label">Inicio *</label><input name="hora_inicio" type="time" required class="input" value="${esc(c.hora_inicio || '09:00')}" step="900"></div>
            <div><label class="label">Fin</label><input name="hora_fin" type="time" class="input" value="${esc(c.hora_fin || '')}" step="900"></div>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="label">Doctor</label>
              <select name="doctor_id" class="input"><option value="">Sin asignar</option>${opciones(docs, c.doctor_id)}</select>
            </div>
            <div>
              <label class="label">Gabinete</label>
              <select name="gabinete_id" class="input"><option value="">Sin asignar</option>${opciones(gabs, c.gabinete_id)}</select>
            </div>
          </div>

          <div><label class="label">Motivo</label><input name="motivo" class="input" placeholder="Ej.: Revisión, limpieza, empaste…" value="${esc(c.motivo || '')}"></div>

          <div>
            <label class="label">Estado</label>
            <select name="estado" class="input">
              ${Object.entries(CW.UI.ESTADOS_CITA).map(([k, v]) =>
                `<option value="${k}" ${(c.estado || 'pendiente') === k ? 'selected' : ''}>${v.texto}</option>`).join('')}
            </select>
          </div>

          <div><label class="label">Notas</label><textarea name="notas" rows="2" class="input resize-none">${esc(c.notas || '')}</textarea></div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
            ${esEdicion ? '<button type="button" data-eliminar class="btn btn-danger mr-auto">Eliminar cita</button>' : ''}
            <button type="button" data-cancelar class="btn btn-ghost">Cancelar</button>
            <button type="submit" class="btn btn-primary">${esEdicion ? 'Guardar cambios' : 'Crear cita'}</button>
          </div>
        </form>`,
      onMontar(cuerpo, cerrar) {
        cuerpo.querySelector('[data-cancelar]').addEventListener('click', cerrar);

        const eliminar = cuerpo.querySelector('[data-eliminar]');
        if (eliminar) {
          eliminar.addEventListener('click', () => {
            CW.UI.confirmar('¿Eliminar esta cita de la agenda?', async () => {
              try {
                await CW.Api.borrarCita(c.id);
                toast('Cita eliminada.', 'ok');
                CW.UI.cerrarModal();
                if (alGuardar) alGuardar();
              } catch (e) {
                toast(e.message, 'error');
              }
            });
          });
        }

        cuerpo.querySelector('#form-cita').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const datos = Object.fromEntries(new FormData(ev.target).entries());
          const boton = ev.target.querySelector('button[type=submit]');
          boton.disabled = true;
          boton.textContent = 'Guardando…';
          try {
            if (esEdicion) {
              await CW.Api.actualizarCita(c.id, datos);
              toast('Cita actualizada.', 'ok');
            } else {
              await CW.Api.crearCita(datos);
              toast('Cita creada.', 'ok');
            }
            cerrar();
            if (alGuardar) alGuardar();
          } catch (e) {
            toast(e.message, 'error');
            boton.disabled = false;
            boton.textContent = esEdicion ? 'Guardar cambios' : 'Crear cita';
          }
        });
      },
    });
  }

  function abrirDetalleCita(cita, alCambiar) {
    const nombre = `${cita.paciente_nombre || ''} ${cita.paciente_apellidos || ''}`.trim();

    modal({
      titulo: 'Detalle de la cita',
      ancho: 'max-w-md',
      contenido: `
        ${cita.paciente_alerta ? `<div class="alerta-medica text-sm mb-4"><strong>Alerta médica:</strong> ${esc(cita.paciente_alerta)}</div>` : ''}
        <dl class="space-y-2.5 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Paciente</dt>
            <dd class="font-medium text-right"><a href="#/paciente/${cita.paciente_id}" data-ir class="text-clinic-600 hover:underline">${esc(nombre)}</a></dd></div>
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Horario</dt><dd class="font-medium">${esc(cita.hora_inicio)} – ${esc(cita.hora_fin)}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Gabinete</dt><dd class="font-medium">${esc(cita.gabinete || 'Sin asignar')}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Doctor</dt><dd class="font-medium">${esc(cita.doctor || 'Sin asignar')}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Motivo</dt><dd class="font-medium text-right">${esc(cita.motivo || '—')}</dd></div>
          ${cita.notas ? `<div><dt class="text-slate-500 mb-1">Notas</dt><dd class="text-slate-700 bg-slate-50 rounded-lg p-2.5">${esc(cita.notas)}</dd></div>` : ''}
        </dl>

        <div class="mt-5">
          <label class="label">Cambiar estado</label>
          <select data-estado class="input">
            ${Object.entries(CW.UI.ESTADOS_CITA).map(([k, v]) =>
              `<option value="${k}" ${cita.estado === k ? 'selected' : ''}>${v.texto}</option>`).join('')}
          </select>
        </div>

        <div class="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-200">
          <button data-editar class="btn btn-ghost">Editar cita</button>
          <button data-cerrar-modal class="btn btn-primary">Cerrar</button>
        </div>`,
      onMontar(cuerpo, cerrar) {
        cuerpo.querySelector('[data-cerrar-modal]').addEventListener('click', cerrar);
        cuerpo.querySelector('[data-ir]').addEventListener('click', cerrar);

        cuerpo.querySelector('[data-estado]').addEventListener('change', async (ev) => {
          try {
            await CW.Api.cambiarEstadoCita(cita.id, ev.target.value);
            toast('Estado actualizado.', 'ok');
            if (alCambiar) alCambiar();
          } catch (e) {
            toast(e.message, 'error');
          }
        });

        cuerpo.querySelector('[data-editar]').addEventListener('click', () => {
          cerrar();
          abrirFormularioCita(cita, alCambiar);
        });
      },
    });
  }

  return {
    render,
    abrirFormularioCita,
    abrirDetalleCita,
    fijarFecha: (f) => { fechaActual = f; },
    // La administracion la invoca tras editar doctores o gabinetes.
    limpiarCache: () => { cacheGabinetes = null; cacheDoctores = null; },
  };
})();
