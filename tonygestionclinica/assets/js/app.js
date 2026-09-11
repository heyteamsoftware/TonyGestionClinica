/* Arranque de la SPA: enrutado por hash, navegacion y buscador global. */
(function () {
  const { esc, toast } = CW.UI;

  const TITULOS = {
    dashboard: 'Panel principal',
    agenda: 'Agenda',
    pacientes: 'Pacientes',
    paciente: 'Ficha del paciente',
    admin: 'Administración',
  };

  const app = document.getElementById('app');

  function rutaActual() {
    const hash = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    const partes = hash.split('/').filter(Boolean);
    return { vista: partes[0] || 'dashboard', parametro: partes[1] || null };
  }

  function marcarNavegacion(vista) {
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const activo = a.dataset.nav === vista || (vista === 'paciente' && a.dataset.nav === 'pacientes');
      a.classList.toggle('active', activo);
    });
  }

  async function enrutar() {
    const { vista, parametro } = rutaActual();

    document.getElementById('page-title').textContent = TITULOS[vista] || 'Gestión Clínica';
    document.getElementById('page-subtitle').textContent = '';
    marcarNavegacion(vista);
    CW.UI.cerrarModal();
    window.scrollTo(0, 0);

    try {
      if (vista === 'dashboard') return await CW.Dashboard.render(app);
      if (vista === 'agenda') return await CW.Agenda.render(app);
      if (vista === 'pacientes') return await CW.Pacientes.render(app);
      if (vista === 'paciente' && parametro) return await CW.Ficha.render(app, Number(parametro));
      if (vista === 'admin') return await CW.Admin.render(app);

      app.innerHTML = `<div class="card p-10 text-center">
        <p class="text-slate-600 font-medium">Página no encontrada</p>
        <a href="#/dashboard" class="text-clinic-600 text-sm hover:underline mt-2 inline-block">Volver al panel principal</a>
      </div>`;
    } catch (e) {
      app.innerHTML = `<div class="card p-6 text-red-600 text-sm">${esc(e.message)}</div>`;
    }
  }

  /* --- Buscador global de la cabecera --- */
  function iniciarBuscador() {
    const input = document.getElementById('buscador-global');
    const panel = document.getElementById('buscador-resultados');
    let temporizador = null;

    const ocultar = () => panel.classList.add('hidden');

    input.addEventListener('input', () => {
      clearTimeout(temporizador);
      const q = input.value.trim();
      if (q.length < 2) return ocultar();

      temporizador = setTimeout(async () => {
        try {
          const lista = (await CW.Api.pacientes(q)).slice(0, 8);
          if (!lista.length) {
            panel.innerHTML = '<p class="px-3 py-3 text-sm text-slate-400">Sin resultados</p>';
          } else {
            panel.innerHTML = lista.map((p) => `
              <a href="#/paciente/${p.id}" class="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                <span class="w-7 h-7 rounded-full bg-clinic-100 text-clinic-700 grid place-items-center text-[10px] font-bold shrink-0">${esc(CW.UI.iniciales(p))}</span>
                <span class="min-w-0">
                  <span class="block text-sm text-slate-800 truncate">${esc(p.apellidos)}, ${esc(p.nombre)}</span>
                  <span class="block text-xs text-slate-400">${esc(p.dni || p.telefono || '')}</span>
                </span>
              </a>`).join('');
          }
          panel.classList.remove('hidden');
        } catch (e) {
          ocultar();
        }
      }, 250);
    });

    panel.addEventListener('click', () => { input.value = ''; ocultar(); });
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !panel.contains(e.target)) ocultar();
    });
  }

  function iniciar() {
    document.getElementById('fecha-hoy').textContent =
      new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    iniciarBuscador();
    window.addEventListener('hashchange', enrutar);

    if (!location.hash) location.hash = '#/dashboard';
    enrutar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
