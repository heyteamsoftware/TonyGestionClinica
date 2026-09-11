/* Ficha del paciente: datos, anamnesis, odontograma, presupuestos y citas. */
window.CW = window.CW || {};

CW.Ficha = (function () {
  const { esc, euros, edad, toast, modal, fechaCorta, badgeEstadoCita, iniciales, ESTADOS_DIENTE } = CW.UI;

  // Nomenclatura FDI por cuadrantes.
  const CUADRANTES = {
    1: [18, 17, 16, 15, 14, 13, 12, 11],
    2: [21, 22, 23, 24, 25, 26, 27, 28],
    4: [48, 47, 46, 45, 44, 43, 42, 41],
    3: [31, 32, 33, 34, 35, 36, 37, 38],
  };

  let paciente = null;
  let pestana = 'datos';
  let contenedorRaiz = null;

  async function render(contenedor, id) {
    contenedorRaiz = contenedor;
    contenedor.innerHTML = CW.UI.cargando('Cargando ficha…');

    try {
      paciente = await CW.Api.paciente(id);
    } catch (e) {
      contenedor.innerHTML = `<div class="card p-6 text-red-600 text-sm">${esc(e.message)}</div>`;
      return;
    }

    const a = edad(paciente.fecha_nacimiento);
    document.getElementById('page-title').textContent = `${paciente.nombre} ${paciente.apellidos}`.trim();
    document.getElementById('page-subtitle').textContent = 'Ficha del paciente';

    contenedor.innerHTML = `
      <a href="#/pacientes" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-clinic-600 mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 19l-7-7 7-7"/></svg>
        Volver al listado
      </a>

      ${paciente.alerta_medica ? `
        <div class="alerta-medica mb-4 flex items-start gap-3">
          <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>
          <div><p class="font-bold text-sm">Alerta médica</p><p class="text-sm">${esc(paciente.alerta_medica)}</p></div>
        </div>` : ''}

      <div class="card p-5 mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <div class="w-14 h-14 rounded-full bg-clinic-100 text-clinic-700 grid place-items-center text-lg font-bold shrink-0">${esc(iniciales(paciente))}</div>
          <div class="flex-1 min-w-[200px]">
            <h2 class="text-xl font-bold text-slate-900">${esc(paciente.nombre)} ${esc(paciente.apellidos)}</h2>
            <p class="text-sm text-slate-500">
              ${esc(paciente.dni || 'Sin DNI')}${a !== null ? ` · ${a} años` : ''}${paciente.telefono ? ` · ${esc(paciente.telefono)}` : ''}
            </p>
          </div>
          <div class="flex gap-2">
            <button id="ficha-cita" class="btn btn-ghost">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/></svg>
              Nueva cita
            </button>
            <button id="ficha-editar" class="btn btn-primary">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              Editar ficha
            </button>
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="flex border-b border-slate-200 overflow-x-auto" id="tabs">
          <button class="tab-btn" data-tab="datos">Datos y anamnesis</button>
          <button class="tab-btn" data-tab="odontograma">Odontograma</button>
          <button class="tab-btn" data-tab="presupuestos">Presupuestos y cobros</button>
          <button class="tab-btn" data-tab="citas">Historial de citas</button>
        </div>
        <div id="tab-contenido" class="p-5"></div>
      </div>`;

    contenedor.querySelector('#ficha-editar').addEventListener('click', () => {
      CW.Pacientes.abrirFormulario(paciente, () => render(contenedor, id));
    });
    contenedor.querySelector('#ficha-cita').addEventListener('click', () => {
      CW.Agenda.abrirFormularioCita({ paciente_id: paciente.id, fecha: CW.UI.hoyISO() }, () => {
        if (pestana === 'citas') pintarPestana();
      });
    });

    contenedor.querySelectorAll('[data-tab]').forEach((b) => {
      b.addEventListener('click', () => { pestana = b.dataset.tab; pintarPestana(); });
    });

    pintarPestana();
  }

  function pintarPestana() {
    contenedorRaiz.querySelectorAll('[data-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === pestana);
    });
    const destino = contenedorRaiz.querySelector('#tab-contenido');

    if (pestana === 'datos') return pintarDatos(destino);
    if (pestana === 'odontograma') return pintarOdontograma(destino);
    if (pestana === 'presupuestos') return pintarPresupuestos(destino);
    if (pestana === 'citas') return pintarCitas(destino);
  }

  /* --- Pestana: datos y anamnesis --- */
  function pintarDatos(destino) {
    const dato = (etiqueta, valor) => `
      <div class="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
        <dt class="text-sm text-slate-500 shrink-0">${esc(etiqueta)}</dt>
        <dd class="text-sm text-slate-800 text-right">${esc(valor || '—')}</dd>
      </div>`;

    const bloque = (titulo, texto) => `
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">${esc(titulo)}</p>
        <p class="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">${esc(texto || 'Sin datos registrados.')}</p>
      </div>`;

    const marcadores = [
      Number(paciente.embarazo) ? 'Embarazo' : null,
      Number(paciente.fumador) ? 'Fumador' : null,
      Number(paciente.anticoagulantes) ? 'Anticoagulantes' : null,
    ].filter(Boolean);

    destino.innerHTML = `
      <div class="grid lg:grid-cols-2 gap-8">
        <section>
          <h3 class="text-sm font-bold text-clinic-700 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">Datos personales</h3>
          <dl>
            ${dato('Nombre completo', `${paciente.nombre} ${paciente.apellidos}`.trim())}
            ${dato('DNI / NIE', paciente.dni)}
            ${dato('Fecha de nacimiento', paciente.fecha_nacimiento ? fechaCorta(paciente.fecha_nacimiento) : '')}
            ${dato('Edad', edad(paciente.fecha_nacimiento) !== null ? edad(paciente.fecha_nacimiento) + ' años' : '')}
            ${dato('Sexo', { M: 'Hombre', F: 'Mujer', O: 'Otro' }[paciente.sexo] || '')}
            ${dato('Teléfono', paciente.telefono)}
            ${dato('Email', paciente.email)}
            ${dato('Dirección', paciente.direccion)}
            ${dato('Ciudad', [paciente.cp, paciente.ciudad].filter(Boolean).join(' '))}
            ${dato('Alta en la clínica', fechaCorta(paciente.creado_en))}
          </dl>
        </section>

        <section class="space-y-4">
          <h3 class="text-sm font-bold text-clinic-700 uppercase tracking-wide pb-2 border-b border-slate-200">Anamnesis</h3>
          ${marcadores.length ? `<div class="flex flex-wrap gap-2">${marcadores.map((m) =>
            `<span class="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">${esc(m)}</span>`).join('')}</div>` : ''}
          ${bloque('Alergias', paciente.alergias)}
          ${bloque('Enfermedades previas', paciente.enfermedades)}
          ${bloque('Medicación actual', paciente.medicacion)}
          ${bloque('Observaciones', paciente.notas)}
        </section>
      </div>`;
  }

  /* --- Pestana: odontograma --- */
  async function pintarOdontograma(destino) {
    destino.innerHTML = CW.UI.cargando('Cargando odontograma…');

    let datos;
    try {
      datos = await CW.Api.odontograma(paciente.id);
    } catch (e) {
      destino.innerHTML = `<div class="text-red-600 text-sm">${esc(e.message)}</div>`;
      return;
    }

    const piezas = datos.piezas || {};
    const estadoDe = (n) => (piezas[n] && piezas[n].estado) || 'sano';
    const notaDe = (n) => (piezas[n] && piezas[n].notas) || '';

    const diente = (n) => `
      <button class="odo-pieza" data-pieza="${n}" data-estado="${estadoDe(n)}" data-nota="${notaDe(n) ? 1 : 0}"
              title="${esc(`Pieza ${n} · ${ESTADOS_DIENTE[estadoDe(n)].texto}${notaDe(n) ? ' · ' + notaDe(n) : ''}`)}">
        <span class="odo-diente"></span>
        <span class="num">${n}</span>
      </button>`;

    const cuadrante = (num) => `<div class="odo-cuadrante">${CUADRANTES[num].map(diente).join('')}</div>`;

    const resumen = {};
    Object.values(piezas).forEach((p) => { resumen[p.estado] = (resumen[p.estado] || 0) + 1; });

    destino.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h3 class="font-semibold text-slate-900">Odontograma · Nomenclatura FDI</h3>
          <p class="text-sm text-slate-500">Haz clic en cualquier pieza para registrar su estado.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          ${Object.entries(ESTADOS_DIENTE).map(([k, v]) => `
            <span class="flex items-center gap-1.5 text-xs text-slate-600">
              <span class="w-3.5 h-3.5 rounded border" style="background:${v.color};border-color:${v.borde}"></span>${v.texto}
              ${resumen[k] ? `<span class="text-slate-400">(${resumen[k]})</span>` : ''}
            </span>`).join('')}
        </div>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 overflow-x-auto">
        <div class="min-w-[640px] space-y-2">
          <div class="grid grid-cols-2 gap-4">
            <div><p class="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Superior derecho · 1</p>${cuadrante(1)}</div>
            <div><p class="text-[11px] font-semibold text-slate-400 uppercase mb-1.5 text-right">Superior izquierdo · 2</p>${cuadrante(2)}</div>
          </div>

          <div class="border-t-2 border-dashed border-slate-300 my-3"></div>

          <div class="grid grid-cols-2 gap-4">
            <div>${cuadrante(4)}<p class="text-[11px] font-semibold text-slate-400 uppercase mt-1.5">Inferior derecho · 4</p></div>
            <div>${cuadrante(3)}<p class="text-[11px] font-semibold text-slate-400 uppercase mt-1.5 text-right">Inferior izquierdo · 3</p></div>
          </div>
        </div>
      </div>

      ${Object.keys(piezas).length ? `
        <div class="mt-5">
          <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Piezas con hallazgos</h4>
          <div class="flex flex-wrap gap-2">
            ${Object.entries(piezas).sort((a, b) => a[0] - b[0]).map(([n, p]) => `
              <span class="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span class="w-3 h-3 rounded border" style="background:${ESTADOS_DIENTE[p.estado].color};border-color:${ESTADOS_DIENTE[p.estado].borde}"></span>
                <strong>${esc(n)}</strong> ${esc(ESTADOS_DIENTE[p.estado].texto)}
                ${p.notas ? `<span class="text-slate-400">· ${esc(p.notas)}</span>` : ''}
              </span>`).join('')}
          </div>
        </div>` : ''}`;

    destino.querySelectorAll('[data-pieza]').forEach((b) => {
      b.addEventListener('click', () => abrirEditorPieza(b.dataset.pieza, estadoDe(b.dataset.pieza), notaDe(b.dataset.pieza), destino));
    });
  }

  function abrirEditorPieza(pieza, estadoActual, notaActual, destino) {
    modal({
      titulo: `Pieza dental ${pieza}`,
      ancho: 'max-w-md',
      contenido: `
        <form id="form-pieza" class="space-y-4">
          <div>
            <label class="label">Estado de la pieza</label>
            <div class="grid grid-cols-1 gap-2">
              ${Object.entries(ESTADOS_DIENTE).map(([k, v]) => `
                <label class="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-50 has-[:checked]:border-clinic-500 has-[:checked]:bg-clinic-50">
                  <input type="radio" name="estado" value="${k}" ${estadoActual === k ? 'checked' : ''} class="w-4 h-4 text-clinic-600">
                  <span class="w-5 h-5 rounded border-2" style="background:${v.color};border-color:${v.borde}"></span>
                  <span class="text-sm font-medium text-slate-700">${v.texto}</span>
                </label>`).join('')}
            </div>
          </div>
          <div>
            <label class="label">Anotación clínica</label>
            <textarea name="notas" rows="2" class="input resize-none" placeholder="Ej.: Caries oclusal, revisar en 6 meses">${esc(notaActual)}</textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" data-cancelar class="btn btn-ghost">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>`,
      onMontar(cuerpo, cerrar) {
        cuerpo.querySelector('[data-cancelar]').addEventListener('click', cerrar);
        cuerpo.querySelector('#form-pieza').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          try {
            await CW.Api.guardarPieza({
              paciente_id: paciente.id,
              pieza,
              estado: fd.get('estado'),
              notas: fd.get('notas'),
            });
            toast(`Pieza ${pieza} actualizada.`, 'ok');
            cerrar();
            pintarOdontograma(destino);
          } catch (e) {
            toast(e.message, 'error');
          }
        });
      },
    });
  }

  /* --- Pestana: presupuestos y cobros --- */
  async function pintarPresupuestos(destino) {
    destino.innerHTML = CW.UI.cargando('Cargando presupuestos…');

    let lista;
    try {
      lista = await CW.Api.presupuestos(paciente.id);
    } catch (e) {
      destino.innerHTML = `<div class="text-red-600 text-sm">${esc(e.message)}</div>`;
      return;
    }

    const totales = lista.reduce((acc, p) => ({
      total: acc.total + p.total, pagado: acc.pagado + p.pagado, pendiente: acc.pendiente + p.pendiente,
    }), { total: 0, pagado: 0, pendiente: 0 });

    const ESTADO_PRESU = {
      borrador:   'bg-slate-100 text-slate-700 border-slate-200',
      aceptado:   'bg-sky-100 text-sky-800 border-sky-200',
      finalizado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rechazado:  'bg-red-100 text-red-800 border-red-200',
    };

    destino.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="flex gap-6">
          <div><p class="text-xs text-slate-500">Total presupuestado</p><p class="text-lg font-bold text-slate-900">${euros(totales.total)}</p></div>
          <div><p class="text-xs text-slate-500">Cobrado</p><p class="text-lg font-bold text-emerald-600">${euros(totales.pagado)}</p></div>
          <div><p class="text-xs text-slate-500">Pendiente</p><p class="text-lg font-bold ${totales.pendiente > 0.009 ? 'text-red-600' : 'text-slate-400'}">${euros(totales.pendiente)}</p></div>
        </div>
        <button id="nuevo-presupuesto" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
          Nuevo presupuesto
        </button>
      </div>

      ${lista.length ? `<div class="space-y-4">${lista.map((p) => `
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <div class="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div class="flex-1 min-w-[160px]">
              <p class="font-semibold text-slate-900 text-sm">${esc(p.titulo)}</p>
              <p class="text-xs text-slate-500">${fechaCorta(p.fecha)} · ${p.actos.length} acto(s)</p>
            </div>
            <span class="text-xs font-medium px-2.5 py-1 rounded-full border ${ESTADO_PRESU[p.estado] || ESTADO_PRESU.borrador}">${esc(p.estado)}</span>
            <div class="text-right">
              <p class="text-sm font-bold text-slate-900">${euros(p.total)}</p>
              <p class="text-xs ${p.pendiente > 0.009 ? 'text-red-600' : 'text-emerald-600'}">
                ${p.pendiente > 0.009 ? `Pendiente ${euros(p.pendiente)}` : 'Cobrado íntegro'}
              </p>
            </div>
            <button data-borrar-presupuesto="${p.id}" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Eliminar presupuesto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v12a2 2 0 002 2h6a2 2 0 002-2V7"/></svg>
            </button>
          </div>

          <table class="w-full">
            <tbody>
              ${p.actos.length ? p.actos.map((a) => `
                <tr class="border-b border-slate-100">
                  <td class="px-4 py-2.5">
                    <p class="text-sm text-slate-800">${esc(a.nombre)}</p>
                    <p class="text-xs text-slate-400">${a.pieza ? 'Pieza ' + esc(a.pieza) + ' · ' : ''}${a.cantidad > 1 ? a.cantidad + ' uds. × ' + euros(a.precio) : ''}</p>
                  </td>
                  <td class="px-4 py-2.5 w-32">
                    <select data-acto-estado="${a.id}" class="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white w-full cursor-pointer">
                      <option value="planificado" ${a.estado === 'planificado' ? 'selected' : ''}>Planificado</option>
                      <option value="realizado" ${a.estado === 'realizado' ? 'selected' : ''}>Realizado</option>
                    </select>
                  </td>
                  <td class="px-4 py-2.5 text-right text-sm font-medium text-slate-900 w-28">${euros(a.precio * a.cantidad)}</td>
                  <td class="px-2 py-2.5 w-10">
                    <button data-borrar-acto="${a.id}" class="p-1 rounded hover:bg-red-50 text-red-400" title="Quitar acto">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
                    </button>
                  </td>
                </tr>`).join('')
                : '<tr><td class="px-4 py-6 text-center text-sm text-slate-400">Aún no hay actos clínicos en este presupuesto.</td></tr>'}
            </tbody>
          </table>

          ${p.pagos.length ? `
            <div class="px-4 py-3 bg-emerald-50/60 border-t border-emerald-100">
              <p class="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-1.5">Pagos registrados</p>
              <div class="space-y-1">
                ${p.pagos.map((pg) => `
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-600">${fechaCorta(pg.fecha)} · ${esc(pg.metodo)}${pg.notas ? ' · ' + esc(pg.notas) : ''}</span>
                    <span class="flex items-center gap-2">
                      <strong class="text-emerald-700">${euros(pg.importe)}</strong>
                      <button data-borrar-pago="${pg.id}" class="text-red-400 hover:text-red-600" title="Anular pago">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
                      </button>
                    </span>
                  </div>`).join('')}
              </div>
            </div>` : ''}

          <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-200">
            <button data-anadir-acto="${p.id}" class="btn btn-ghost text-xs py-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
              Añadir acto clínico
            </button>
            <button data-cobrar="${p.id}" data-pendiente="${p.pendiente}" class="btn btn-success text-xs py-1.5" ${p.total <= 0 ? 'disabled style="opacity:.45;cursor:not-allowed"' : ''}>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 3v18M16 7H9.5a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H7"/></svg>
              Registrar pago
            </button>
          </div>
        </div>`).join('')}</div>`
        : CW.UI.vacio('Sin presupuestos', 'Crea el primer presupuesto para este paciente.')}`;

    const recargar = () => pintarPresupuestos(destino);

    destino.querySelector('#nuevo-presupuesto').addEventListener('click', async () => {
      try {
        await CW.Api.crearPresupuesto({ paciente_id: paciente.id, titulo: 'Presupuesto ' + fechaCorta(CW.UI.hoyISO()) });
        toast('Presupuesto creado.', 'ok');
        recargar();
      } catch (e) {
        toast(e.message, 'error');
      }
    });

    destino.querySelectorAll('[data-anadir-acto]').forEach((b) => {
      b.addEventListener('click', () => abrirFormularioActo(Number(b.dataset.anadirActo), recargar));
    });

    destino.querySelectorAll('[data-cobrar]').forEach((b) => {
      b.addEventListener('click', () => abrirFormularioPago(Number(b.dataset.cobrar), Number(b.dataset.pendiente), recargar));
    });

    destino.querySelectorAll('[data-acto-estado]').forEach((s) => {
      s.addEventListener('change', async () => {
        try {
          await CW.Api.actualizarActo(Number(s.dataset.actoEstado), { estado: s.value });
          toast('Acto actualizado.', 'ok');
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    });

    destino.querySelectorAll('[data-borrar-acto]').forEach((b) => {
      b.addEventListener('click', () => {
        CW.UI.confirmar('¿Quitar este acto clínico del presupuesto?', async () => {
          try { await CW.Api.borrarActo(Number(b.dataset.borrarActo)); toast('Acto eliminado.', 'ok'); recargar(); }
          catch (e) { toast(e.message, 'error'); }
        });
      });
    });

    destino.querySelectorAll('[data-borrar-pago]').forEach((b) => {
      b.addEventListener('click', () => {
        CW.UI.confirmar('¿Anular este pago registrado?', async () => {
          try { await CW.Api.borrarPago(Number(b.dataset.borrarPago)); toast('Pago anulado.', 'ok'); recargar(); }
          catch (e) { toast(e.message, 'error'); }
        }, 'Anular');
      });
    });

    destino.querySelectorAll('[data-borrar-presupuesto]').forEach((b) => {
      b.addEventListener('click', () => {
        CW.UI.confirmar('¿Eliminar el presupuesto completo con sus actos y pagos?', async () => {
          try { await CW.Api.borrarPresupuesto(Number(b.dataset.borrarPresupuesto)); toast('Presupuesto eliminado.', 'ok'); recargar(); }
          catch (e) { toast(e.message, 'error'); }
        });
      });
    });
  }

  async function abrirFormularioActo(presupuestoId, alGuardar) {
    let catalogo = [];
    try {
      catalogo = await CW.Api.catalogo();
    } catch (e) {
      toast(e.message, 'error');
    }

    const piezasFDI = [...CUADRANTES[1], ...CUADRANTES[2], ...CUADRANTES[4], ...CUADRANTES[3]];

    modal({
      titulo: 'Añadir acto clínico',
      ancho: 'max-w-lg',
      contenido: `
        <form id="form-acto" class="space-y-3">
          <div>
            <label class="label">Acto del catálogo</label>
            <select id="catalogo-select" class="input">
              <option value="">— Escribir manualmente —</option>
              ${catalogo.map((c) => `<option value="${c.id}" data-nombre="${esc(c.nombre)}" data-precio="${c.precio}">${esc(c.nombre)} · ${euros(c.precio)}</option>`).join('')}
            </select>
          </div>
          <div><label class="label">Descripción *</label><input name="nombre" required class="input" placeholder="Ej.: Obturación en pieza 36"></div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="label">Pieza</label>
              <select name="pieza" class="input">
                <option value="">—</option>
                ${piezasFDI.map((n) => `<option value="${n}">${n}</option>`).join('')}
              </select>
            </div>
            <div><label class="label">Cantidad</label><input name="cantidad" type="number" min="1" value="1" class="input"></div>
            <div><label class="label">Precio (€) *</label><input name="precio" type="number" min="0" step="0.01" value="0" required class="input"></div>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" data-cancelar class="btn btn-ghost">Cancelar</button>
            <button type="submit" class="btn btn-primary">Añadir</button>
          </div>
        </form>`,
      onMontar(cuerpo, cerrar) {
        const select = cuerpo.querySelector('#catalogo-select');
        const inputNombre = cuerpo.querySelector('[name=nombre]');
        const inputPrecio = cuerpo.querySelector('[name=precio]');

        select.addEventListener('change', () => {
          const opcion = select.selectedOptions[0];
          if (opcion && opcion.value) {
            inputNombre.value = opcion.dataset.nombre;
            inputPrecio.value = opcion.dataset.precio;
          }
        });

        cuerpo.querySelector('[data-cancelar]').addEventListener('click', cerrar);
        cuerpo.querySelector('#form-acto').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const datos = Object.fromEntries(new FormData(ev.target).entries());
          datos.presupuesto_id = presupuestoId;
          try {
            await CW.Api.crearActo(datos);
            toast('Acto clínico añadido.', 'ok');
            cerrar();
            alGuardar();
          } catch (e) {
            toast(e.message, 'error');
          }
        });
      },
    });
  }

  function abrirFormularioPago(presupuestoId, pendiente, alGuardar) {
    const sugerido = pendiente > 0 ? pendiente.toFixed(2) : '0.00';

    modal({
      titulo: 'Registrar pago',
      ancho: 'max-w-md',
      contenido: `
        <form id="form-pago" class="space-y-3">
          <div class="bg-slate-50 rounded-lg px-3 py-2.5 text-sm flex justify-between">
            <span class="text-slate-500">Importe pendiente</span>
            <strong class="${pendiente > 0.009 ? 'text-red-600' : 'text-emerald-600'}">${euros(pendiente)}</strong>
          </div>
          <div><label class="label">Importe a cobrar (€) *</label><input name="importe" type="number" min="0.01" step="0.01" value="${sugerido}" required class="input"></div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Método</label>
              <select name="metodo" class="input">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="financiacion">Financiación</option>
              </select>
            </div>
            <div><label class="label">Fecha</label><input name="fecha" type="date" value="${CW.UI.hoyISO()}" class="input"></div>
          </div>
          <div><label class="label">Notas</label><input name="notas" class="input" placeholder="Opcional"></div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" data-cancelar class="btn btn-ghost">Cancelar</button>
            <button type="submit" class="btn btn-success">Registrar pago</button>
          </div>
        </form>`,
      onMontar(cuerpo, cerrar) {
        cuerpo.querySelector('[data-cancelar]').addEventListener('click', cerrar);
        cuerpo.querySelector('#form-pago').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const datos = Object.fromEntries(new FormData(ev.target).entries());
          datos.presupuesto_id = presupuestoId;
          try {
            await CW.Api.crearPago(datos);
            toast('Pago registrado correctamente.', 'ok');
            cerrar();
            alGuardar();
          } catch (e) {
            toast(e.message, 'error');
          }
        });
      },
    });
  }

  /* --- Pestana: historial de citas --- */
  async function pintarCitas(destino) {
    destino.innerHTML = CW.UI.cargando('Cargando citas…');

    let citas;
    try {
      citas = await CW.Api.citasPaciente(paciente.id);
    } catch (e) {
      destino.innerHTML = `<div class="text-red-600 text-sm">${esc(e.message)}</div>`;
      return;
    }

    if (!citas.length) {
      destino.innerHTML = CW.UI.vacio('Sin citas registradas', 'Este paciente todavía no tiene citas en la agenda.');
      return;
    }

    destino.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-left">
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Hora</th>
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Motivo</th>
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Doctor</th>
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Gabinete</th>
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${citas.map((c) => `
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-4 py-3 text-sm text-slate-700">${fechaCorta(c.fecha)}</td>
                <td class="px-4 py-3 text-sm text-slate-600 tabular-nums">${esc(c.hora_inicio)}</td>
                <td class="px-4 py-3 text-sm text-slate-700">${esc(c.motivo || '—')}</td>
                <td class="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">${esc(c.doctor || '—')}</td>
                <td class="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">${esc(c.gabinete || '—')}</td>
                <td class="px-4 py-3">${badgeEstadoCita(c.estado)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  return { render };
})();
