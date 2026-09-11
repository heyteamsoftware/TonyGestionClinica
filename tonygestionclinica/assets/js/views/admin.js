/* Panel de administracion: doctores, gabinetes y catalogo de actos clinicos. */
window.CW = window.CW || {};

CW.Admin = (function () {
  const { esc, euros, toast, modal, vacio } = CW.UI;

  const RECURSOS = {
    doctores: {
      etiqueta: 'Doctores',
      singular: 'doctor',
      columnas: ['Nombre', 'Especialidad', 'Color'],
      campos: [
        { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true },
        { nombre: 'especialidad', etiqueta: 'Especialidad', tipo: 'text' },
        { nombre: 'color', etiqueta: 'Color en la agenda', tipo: 'color', defecto: '#0ea5e9' },
      ],
      celdas: (r) => [
        esc(r.nombre),
        esc(r.especialidad || '—'),
        `<span class="inline-flex items-center gap-2">
           <span class="w-4 h-4 rounded border border-slate-300" style="background:${esc(r.color)}"></span>
           <span class="text-xs text-slate-400">${esc(r.color)}</span>
         </span>`,
      ],
    },
    gabinetes: {
      etiqueta: 'Gabinetes',
      singular: 'gabinete',
      columnas: ['Nombre'],
      campos: [{ nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true }],
      celdas: (r) => [esc(r.nombre)],
    },
    catalogo: {
      etiqueta: 'Catálogo de actos',
      singular: 'acto clínico',
      columnas: ['Acto', 'Categoría', 'Precio'],
      campos: [
        { nombre: 'nombre', etiqueta: 'Nombre del acto', tipo: 'text', requerido: true },
        { nombre: 'categoria', etiqueta: 'Categoría', tipo: 'text' },
        { nombre: 'precio', etiqueta: 'Precio (€)', tipo: 'number', paso: '0.01', defecto: '0' },
      ],
      celdas: (r) => [
        esc(r.nombre),
        r.categoria ? `<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${esc(r.categoria)}</span>` : '—',
        `<span class="font-medium tabular-nums">${euros(r.precio)}</span>`,
      ],
    },
  };

  let seccion = 'doctores';
  let verBajas = false;
  let raiz = null;

  async function render(contenedor) {
    raiz = contenedor;
    document.getElementById('page-subtitle').textContent = 'Configuración de la clínica';

    contenedor.innerHTML = `
      <div class="card overflow-hidden">
        <div class="flex border-b border-slate-200 overflow-x-auto" id="adm-tabs">
          ${Object.entries(RECURSOS).map(([k, v]) =>
            `<button class="tab-btn" data-seccion="${k}">${esc(v.etiqueta)}</button>`).join('')}
        </div>
        <div id="adm-contenido" class="p-5"></div>
      </div>`;

    contenedor.querySelectorAll('[data-seccion]').forEach((b) => {
      b.addEventListener('click', () => { seccion = b.dataset.seccion; pintar(); });
    });

    pintar();
  }

  async function pintar() {
    raiz.querySelectorAll('[data-seccion]').forEach((b) => {
      b.classList.toggle('active', b.dataset.seccion === seccion);
    });

    const destino = raiz.querySelector('#adm-contenido');
    const cfg = RECURSOS[seccion];
    destino.innerHTML = CW.UI.cargando();

    CW.Agenda.limpiarCache();

    let lista;
    try {
      lista = await CW.Api.admListar(seccion, verBajas);
    } catch (e) {
      destino.innerHTML = `<div class="text-red-600 text-sm">${esc(e.message)}</div>`;
      return;
    }

    destino.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" id="adm-bajas" ${verBajas ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-clinic-600">
          Mostrar también los dados de baja
        </label>
        <button id="adm-nuevo" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
          Añadir ${esc(cfg.singular)}
        </button>
      </div>

      ${lista.length ? `
        <div class="overflow-x-auto border border-slate-200 rounded-lg">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-left">
                ${cfg.columnas.map((c) => `<th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">${esc(c)}</th>`).join('')}
                <th class="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              ${lista.map((r) => `
                <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50 ${Number(r.activo) ? '' : 'opacity-50'}">
                  ${cfg.celdas(r).map((c, i) => `
                    <td class="px-4 py-3 text-sm text-slate-700">
                      ${c}${i === 0 && !Number(r.activo) ? ' <span class="text-xs text-slate-400">(de baja)</span>' : ''}
                    </td>`).join('')}
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button data-editar="${r.id}" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Editar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </button>
                      ${Number(r.activo) ? `
                        <button data-baja="${r.id}" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Dar de baja">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v12a2 2 0 002 2h6a2 2 0 002-2V7"/></svg>
                        </button>` : `
                        <button data-alta="${r.id}" class="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Reactivar">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 12l5 5L20 6"/></svg>
                        </button>`}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <p class="text-xs text-slate-400 mt-3">
          Dar de baja no borra el registro: las citas y los presupuestos ya emitidos siguen mostrando el dato con el que se crearon.
        </p>`
        : vacio(`Sin ${esc(cfg.etiqueta.toLowerCase())}`, `Añade el primer ${cfg.singular} de la clínica.`)}`;

    destino.querySelector('#adm-bajas').addEventListener('change', (ev) => {
      verBajas = ev.target.checked;
      pintar();
    });

    destino.querySelector('#adm-nuevo').addEventListener('click', () => abrirFormulario(null));

    destino.querySelectorAll('[data-editar]').forEach((b) => {
      b.addEventListener('click', () => {
        abrirFormulario(lista.find((r) => r.id === Number(b.dataset.editar)));
      });
    });

    destino.querySelectorAll('[data-baja]').forEach((b) => {
      b.addEventListener('click', () => {
        CW.UI.confirmar(`¿Dar de baja este ${cfg.singular}? Dejará de aparecer al crear citas y presupuestos.`, async () => {
          try {
            await CW.Api.admBorrar(seccion, Number(b.dataset.baja));
            toast('Registro dado de baja.', 'ok');
            pintar();
          } catch (e) {
            toast(e.message, 'error');
          }
        }, 'Dar de baja');
      });
    });

    destino.querySelectorAll('[data-alta]').forEach((b) => {
      b.addEventListener('click', async () => {
        const r = lista.find((x) => x.id === Number(b.dataset.alta));
        try {
          await CW.Api.admActualizar(seccion, r.id, { ...r, activo: true });
          toast('Registro reactivado.', 'ok');
          pintar();
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    });
  }

  function abrirFormulario(registro) {
    const cfg = RECURSOS[seccion];
    const r = registro || {};
    const esEdicion = Boolean(r.id);

    modal({
      titulo: `${esEdicion ? 'Editar' : 'Añadir'} ${cfg.singular}`,
      ancho: 'max-w-md',
      contenido: `
        <form id="form-adm" class="space-y-3">
          ${cfg.campos.map((c) => {
            const valor = esc(r[c.nombre] !== undefined && r[c.nombre] !== null ? r[c.nombre] : (c.defecto || ''));
            return `
              <div>
                <label class="label">${esc(c.etiqueta)}${c.requerido ? ' *' : ''}</label>
                <input name="${c.nombre}" type="${c.tipo}" value="${valor}"
                       ${c.requerido ? 'required' : ''} ${c.paso ? `step="${c.paso}" min="0"` : ''}
                       class="input ${c.tipo === 'color' ? 'h-10 p-1 cursor-pointer' : ''}">
              </div>`;
          }).join('')}
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" data-cancelar class="btn btn-ghost">Cancelar</button>
            <button type="submit" class="btn btn-primary">${esEdicion ? 'Guardar cambios' : 'Añadir'}</button>
          </div>
        </form>`,
      onMontar(cuerpo, cerrar) {
        cuerpo.querySelector('[data-cancelar]').addEventListener('click', cerrar);
        cuerpo.querySelector('#form-adm').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const datos = Object.fromEntries(new FormData(ev.target).entries());
          const boton = ev.target.querySelector('button[type=submit]');
          boton.disabled = true;
          boton.textContent = 'Guardando…';
          try {
            if (esEdicion) {
              await CW.Api.admActualizar(seccion, r.id, { ...datos, activo: Number(r.activo) === 1 });
              toast('Registro actualizado.', 'ok');
            } else {
              await CW.Api.admCrear(seccion, datos);
              toast('Registro creado.', 'ok');
            }
            cerrar();
            pintar();
          } catch (e) {
            toast(e.message, 'error');
            boton.disabled = false;
            boton.textContent = esEdicion ? 'Guardar cambios' : 'Añadir';
          }
        });
      },
    });
  }

  return { render };
})();
