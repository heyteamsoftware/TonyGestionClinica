/* Utilidades de interfaz: escape, formato, avisos y modales. */
window.CW = window.CW || {};

CW.UI = (function () {
  const ESTADOS_CITA = {
    pendiente:   { texto: 'Pendiente',       clase: 'bg-amber-100 text-amber-800 border-amber-200',   punto: '#f59e0b' },
    sala_espera: { texto: 'En sala de espera', clase: 'bg-sky-100 text-sky-800 border-sky-200',       punto: '#0ea5e9' },
    atendido:    { texto: 'Atendido',        clase: 'bg-emerald-100 text-emerald-800 border-emerald-200', punto: '#10b981' },
    cancelado:   { texto: 'Cancelado',       clase: 'bg-slate-200 text-slate-600 border-slate-300',   punto: '#94a3b8' },
  };

  const ESTADOS_DIENTE = {
    sano:     { texto: 'Sano',     color: '#ffffff', borde: '#94a3b8' },
    caries:   { texto: 'Caries',   color: '#ef4444', borde: '#b91c1c' },
    ausente:  { texto: 'Ausente',  color: '#e2e8f0', borde: '#94a3b8' },
    empaste:  { texto: 'Empaste',  color: '#3b82f6', borde: '#1d4ed8' },
    implante: { texto: 'Implante', color: '#a855f7', borde: '#7e22ce' },
  };

  function esc(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function euros(n) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
  }

  function fechaLarga(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function fechaCorta(iso) {
    if (!iso) return '';
    const d = new Date(iso.length > 10 ? iso.replace(' ', 'T') : iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function hoyISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function edad(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    const n = new Date(fechaNacimiento + 'T00:00:00');
    if (isNaN(n)) return null;
    const hoy = new Date();
    let a = hoy.getFullYear() - n.getFullYear();
    const m = hoy.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) a--;
    return a;
  }

  function nombreCompleto(p) {
    return [p.apellidos, p.nombre].filter(Boolean).join(', ') || p.nombre || 'Sin nombre';
  }

  function iniciales(p) {
    return ((p.nombre || '?')[0] + (p.apellidos || '')[0] || '').toUpperCase();
  }

  /* --- Avisos --- */
  function toast(mensaje, tipo = 'info') {
    const colores = {
      info: 'bg-slate-800', ok: 'bg-emerald-600', error: 'bg-red-600', aviso: 'bg-amber-500',
    };
    const el = document.createElement('div');
    el.className = `${colores[tipo] || colores.info} text-white text-sm px-4 py-3 rounded-lg shadow-lg max-w-sm animate-[popIn_.15s_ease-out]`;
    el.textContent = mensaje;
    document.getElementById('toast-root').appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  /* --- Modal --- */
  let modalActual = null;

  function modal({ titulo, contenido, ancho = 'max-w-lg', onMontar = null }) {
    cerrarModal();
    const root = document.getElementById('modal-root');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-box ${ancho}">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-[.875rem]">
          <h3 class="font-semibold text-slate-900">${esc(titulo)}</h3>
          <button data-cerrar class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div data-cuerpo class="p-5">${contenido}</div>
      </div>`;

    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) cerrarModal();
    });
    backdrop.querySelector('[data-cerrar]').addEventListener('click', cerrarModal);

    root.appendChild(backdrop);
    modalActual = backdrop;
    document.addEventListener('keydown', escHandler);

    const cuerpo = backdrop.querySelector('[data-cuerpo]');
    if (onMontar) onMontar(cuerpo, cerrarModal);

    const primero = cuerpo.querySelector('input, select, textarea');
    if (primero) primero.focus();

    return { cerrar: cerrarModal, cuerpo };
  }

  function escHandler(e) {
    if (e.key === 'Escape') cerrarModal();
  }

  function cerrarModal() {
    if (modalActual) {
      modalActual.remove();
      modalActual = null;
      document.removeEventListener('keydown', escHandler);
    }
  }

  function confirmar(mensaje, onSi, textoBoton = 'Eliminar') {
    modal({
      titulo: 'Confirmar acción',
      ancho: 'max-w-md',
      contenido: `
        <p class="text-sm text-slate-600">${esc(mensaje)}</p>
        <div class="flex justify-end gap-2 mt-6">
          <button data-no class="btn btn-ghost">Cancelar</button>
          <button data-si class="btn btn-danger">${esc(textoBoton)}</button>
        </div>`,
      onMontar(cuerpo, cerrar) {
        cuerpo.querySelector('[data-no]').addEventListener('click', cerrar);
        cuerpo.querySelector('[data-si]').addEventListener('click', () => { cerrar(); onSi(); });
      },
    });
  }

  function badgeEstadoCita(estado) {
    const e = ESTADOS_CITA[estado] || ESTADOS_CITA.pendiente;
    return `<span class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${e.clase}">
      <span class="w-1.5 h-1.5 rounded-full" style="background:${e.punto}"></span>${e.texto}</span>`;
  }

  function cargando(texto = 'Cargando…') {
    return `<div class="grid place-items-center h-64 text-slate-400 text-sm">${esc(texto)}</div>`;
  }

  function vacio(titulo, subtitulo = '') {
    return `<div class="text-center py-16">
      <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 grid place-items-center mb-3">
        <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h7M9 9h6M9 13h4"/></svg>
      </div>
      <p class="text-slate-600 font-medium text-sm">${esc(titulo)}</p>
      ${subtitulo ? `<p class="text-slate-400 text-sm mt-1">${esc(subtitulo)}</p>` : ''}
    </div>`;
  }

  return {
    esc, euros, fechaLarga, fechaCorta, hoyISO, edad, nombreCompleto, iniciales,
    toast, modal, cerrarModal, confirmar, badgeEstadoCita, cargando, vacio,
    ESTADOS_CITA, ESTADOS_DIENTE,
  };
})();
