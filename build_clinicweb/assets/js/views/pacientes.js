/* Listado de pacientes y formulario de alta/edicion. */
window.CW = window.CW || {};

CW.Pacientes = (function () {
  const { esc, edad, toast, modal, vacio, iniciales } = CW.UI;

  let filtro = '';
  let temporizador = null;

  function fila(p) {
    const a = edad(p.fecha_nacimiento);
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-4 py-3">
          <a href="#/paciente/${p.id}" class="flex items-center gap-3 group">
            <span class="w-9 h-9 rounded-full bg-clinic-100 text-clinic-700 grid place-items-center text-xs font-bold shrink-0">${esc(iniciales(p))}</span>
            <span class="min-w-0">
              <span class="block text-sm font-medium text-slate-900 group-hover:text-clinic-600 truncate">
                ${esc(p.apellidos)}, ${esc(p.nombre)}
                ${p.alerta_medica ? '<span class="ml-1 text-red-600" title="Alerta médica">&#9888;</span>' : ''}
              </span>
              <span class="block text-xs text-slate-400">${esc(p.dni || 'Sin DNI')}</span>
            </span>
          </a>
        </td>
        <td class="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">${a !== null ? a + ' años' : '—'}</td>
        <td class="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">${esc(p.telefono || '—')}</td>
        <td class="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell truncate max-w-[200px]">${esc(p.email || '—')}</td>
        <td class="px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-1">
            <a href="#/paciente/${p.id}" class="p-1.5 rounded-lg hover:bg-clinic-50 text-clinic-600" title="Abrir ficha">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="2.5"/></svg>
            </a>
            <button data-editar="${p.id}" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Editar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </button>
            <button data-borrar="${p.id}" data-nombre="${esc(p.nombre + ' ' + p.apellidos)}" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Dar de baja">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v12a2 2 0 002 2h6a2 2 0 002-2V7"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }

  async function pintarTabla(contenedor) {
    const destino = contenedor.querySelector('#tabla-pacientes');
    destino.innerHTML = `<div class="py-10 text-center text-slate-400 text-sm">Buscando…</div>`;

    let lista;
    try {
      lista = await CW.Api.pacientes(filtro);
    } catch (e) {
      destino.innerHTML = `<div class="p-6 text-red-600 text-sm">${esc(e.message)}</div>`;
      return;
    }

    if (!lista.length) {
      destino.innerHTML = vacio(
        filtro ? 'Sin resultados' : 'Todavía no hay pacientes',
        filtro ? 'Prueba con otro nombre, DNI o teléfono.' : 'Da de alta el primer paciente de la clínica.'
      );
      return;
    }

    destino.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-left">
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paciente</th>
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Edad</th>
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Teléfono</th>
              <th class="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Email</th>
              <th class="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>${lista.map(fila).join('')}</tbody>
        </table>
      </div>
      <div class="px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500">${lista.length} paciente(s)</div>`;

    destino.querySelectorAll('[data-editar]').forEach((b) => {
      b.addEventListener('click', async () => {
        const p = await CW.Api.paciente(Number(b.dataset.editar));
        abrirFormulario(p, () => pintarTabla(contenedor));
      });
    });

    destino.querySelectorAll('[data-borrar]').forEach((b) => {
      b.addEventListener('click', () => {
        CW.UI.confirmar(
          `¿Dar de baja a ${b.dataset.nombre}? Su historial clínico se conservará.`,
          async () => {
            try {
              await CW.Api.borrarPaciente(Number(b.dataset.borrar));
              toast('Paciente dado de baja.', 'ok');
              pintarTabla(contenedor);
            } catch (e) {
              toast(e.message, 'error');
            }
          },
          'Dar de baja'
        );
      });
    });
  }

  async function render(contenedor) {
    document.getElementById('page-subtitle').textContent = 'Gestión de fichas y anamnesis';

    contenedor.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="relative flex-1 min-w-[240px] max-w-md">
          <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z"/></svg>
          <input id="filtro-pacientes" type="search" placeholder="Buscar por nombre, DNI, teléfono o email…"
                 value="${esc(filtro)}" class="input pl-9">
        </div>
        <button id="btn-alta" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
          Nuevo paciente
        </button>
      </div>
      <div id="tabla-pacientes" class="card overflow-hidden"></div>`;

    contenedor.querySelector('#btn-alta').addEventListener('click', () => {
      abrirFormulario(null, () => pintarTabla(contenedor));
    });

    const input = contenedor.querySelector('#filtro-pacientes');
    input.addEventListener('input', () => {
      clearTimeout(temporizador);
      filtro = input.value.trim();
      temporizador = setTimeout(() => pintarTabla(contenedor), 250);
    });

    pintarTabla(contenedor);
  }

  /* --- Formulario de alta / edicion --- */
  function abrirFormulario(paciente, alGuardar) {
    const p = paciente || {};
    const esEdicion = Boolean(p.id);
    const v = (campo) => esc(p[campo] || '');
    const chk = (campo) => (Number(p[campo]) ? 'checked' : '');

    modal({
      titulo: esEdicion ? 'Editar paciente' : 'Alta de nuevo paciente',
      ancho: 'max-w-3xl',
      contenido: `
        <form id="form-paciente" class="space-y-6">
          <section>
            <h4 class="text-xs font-bold text-clinic-700 uppercase tracking-wide mb-3 pb-1.5 border-b border-slate-200">Datos personales</h4>
            <div class="grid sm:grid-cols-2 gap-3">
              <div><label class="label">Nombre *</label><input name="nombre" required class="input" value="${v('nombre')}"></div>
              <div><label class="label">Apellidos</label><input name="apellidos" class="input" value="${v('apellidos')}"></div>
              <div><label class="label">DNI / NIE</label><input name="dni" class="input" value="${v('dni')}"></div>
              <div><label class="label">Fecha de nacimiento</label><input name="fecha_nacimiento" type="date" class="input" value="${v('fecha_nacimiento')}"></div>
              <div>
                <label class="label">Sexo</label>
                <select name="sexo" class="input">
                  <option value="">Sin especificar</option>
                  <option value="M" ${p.sexo === 'M' ? 'selected' : ''}>Hombre</option>
                  <option value="F" ${p.sexo === 'F' ? 'selected' : ''}>Mujer</option>
                  <option value="O" ${p.sexo === 'O' ? 'selected' : ''}>Otro</option>
                </select>
              </div>
              <div><label class="label">Teléfono</label><input name="telefono" class="input" value="${v('telefono')}"></div>
              <div class="sm:col-span-2"><label class="label">Email</label><input name="email" type="email" class="input" value="${v('email')}"></div>
              <div class="sm:col-span-2"><label class="label">Dirección</label><input name="direccion" class="input" value="${v('direccion')}"></div>
              <div><label class="label">Ciudad</label><input name="ciudad" class="input" value="${v('ciudad')}"></div>
              <div><label class="label">Código postal</label><input name="cp" class="input" value="${v('cp')}"></div>
            </div>
          </section>

          <section>
            <h4 class="text-xs font-bold text-clinic-700 uppercase tracking-wide mb-3 pb-1.5 border-b border-slate-200">Anamnesis e historial médico</h4>
            <div class="space-y-3">
              <div>
                <label class="label text-red-700">Alerta médica destacada</label>
                <input name="alerta_medica" class="input border-red-200 bg-red-50/40 placeholder:text-red-300"
                       placeholder="Ej.: Alérgico a penicilina · Portador de marcapasos" value="${v('alerta_medica')}">
                <p class="text-[11px] text-slate-400 mt-1">Se mostrará resaltada en rojo en la ficha y en la agenda.</p>
              </div>
              <div class="grid sm:grid-cols-2 gap-3">
                <div><label class="label">Alergias</label><textarea name="alergias" rows="2" class="input resize-none">${v('alergias')}</textarea></div>
                <div><label class="label">Enfermedades previas</label><textarea name="enfermedades" rows="2" class="input resize-none">${v('enfermedades')}</textarea></div>
              </div>
              <div><label class="label">Medicación actual</label><textarea name="medicacion" rows="2" class="input resize-none">${v('medicacion')}</textarea></div>
              <div class="flex flex-wrap gap-5 pt-1">
                <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" name="embarazo" ${chk('embarazo')} class="w-4 h-4 rounded border-slate-300 text-clinic-600"> Embarazo</label>
                <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" name="fumador" ${chk('fumador')} class="w-4 h-4 rounded border-slate-300 text-clinic-600"> Fumador</label>
                <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" name="anticoagulantes" ${chk('anticoagulantes')} class="w-4 h-4 rounded border-slate-300 text-clinic-600"> Toma anticoagulantes</label>
              </div>
              <div><label class="label">Observaciones</label><textarea name="notas" rows="2" class="input resize-none">${v('notas')}</textarea></div>
            </div>
          </section>

          <div class="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" data-cancelar class="btn btn-ghost">Cancelar</button>
            <button type="submit" class="btn btn-primary">${esEdicion ? 'Guardar cambios' : 'Dar de alta'}</button>
          </div>
        </form>`,
      onMontar(cuerpo, cerrar) {
        cuerpo.querySelector('[data-cancelar]').addEventListener('click', cerrar);
        cuerpo.querySelector('#form-paciente').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          const datos = Object.fromEntries(fd.entries());
          ['embarazo', 'fumador', 'anticoagulantes'].forEach((c) => { datos[c] = fd.has(c); });

          const boton = ev.target.querySelector('button[type=submit]');
          boton.disabled = true;
          boton.textContent = 'Guardando…';

          try {
            if (esEdicion) {
              await CW.Api.actualizarPaciente(p.id, datos);
              toast('Paciente actualizado.', 'ok');
            } else {
              const res = await CW.Api.crearPaciente(datos);
              toast('Paciente dado de alta.', 'ok');
              cerrar();
              location.hash = `#/paciente/${res.id}`;
              return;
            }
            cerrar();
            if (alGuardar) alGuardar();
          } catch (e) {
            toast(e.message, 'error');
            boton.disabled = false;
            boton.textContent = esEdicion ? 'Guardar cambios' : 'Dar de alta';
          }
        });
      },
    });
  }

  return { render, abrirFormulario };
})();
