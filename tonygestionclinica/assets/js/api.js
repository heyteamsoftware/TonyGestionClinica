/* Cliente de la API REST. Usa POST + _method para maxima compatibilidad
   con hostings compartidos que filtran PUT/DELETE. */
window.CW = window.CW || {};

CW.Api = (function () {
  const BASE = 'api/index.php';

  async function request(recurso, { metodo = 'GET', params = {}, datos = null } = {}) {
    const qs = new URLSearchParams({ r: recurso, ...params });
    const url = `${BASE}?${qs.toString()}`;

    const opciones = { method: metodo === 'GET' ? 'GET' : 'POST', headers: {} };

    if (metodo !== 'GET') {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.headers['X-HTTP-Method-Override'] = metodo;
      opciones.body = JSON.stringify({ ...(datos || {}), _method: metodo });
    }

    let respuesta;
    try {
      respuesta = await fetch(url, opciones);
    } catch (e) {
      throw new Error('No se pudo conectar con el servidor.');
    }

    const texto = await respuesta.text();
    let cuerpo;
    try {
      cuerpo = texto ? JSON.parse(texto) : null;
    } catch (e) {
      throw new Error('Respuesta no válida del servidor: ' + texto.slice(0, 200));
    }

    if (!respuesta.ok) {
      throw new Error((cuerpo && cuerpo.error) || `Error ${respuesta.status}`);
    }
    return cuerpo;
  }

  return {
    dashboard: () => request('dashboard'),

    pacientes: (q) => request('pacientes', { params: q ? { q } : {} }),
    paciente: (id) => request('pacientes', { params: { id } }),
    crearPaciente: (datos) => request('pacientes', { metodo: 'POST', datos }),
    actualizarPaciente: (id, datos) => request('pacientes', { metodo: 'PUT', params: { id }, datos }),
    borrarPaciente: (id) => request('pacientes', { metodo: 'DELETE', params: { id } }),

    odontograma: (pacienteId) => request('odontograma', { params: { paciente_id: pacienteId } }),
    guardarPieza: (datos) => request('odontograma', { metodo: 'POST', datos }),

    agenda: (fecha) => request('citas', { params: { fecha } }),
    citasPaciente: (pacienteId) => request('citas', { params: { paciente_id: pacienteId } }),
    crearCita: (datos) => request('citas', { metodo: 'POST', datos }),
    actualizarCita: (id, datos) => request('citas', { metodo: 'PUT', params: { id }, datos }),
    cambiarEstadoCita: (id, estado) => request('citas', { metodo: 'PUT', params: { id }, datos: { estado } }),
    borrarCita: (id) => request('citas', { metodo: 'DELETE', params: { id } }),

    presupuestos: (pacienteId) => request('presupuestos', { params: { paciente_id: pacienteId } }),
    crearPresupuesto: (datos) => request('presupuestos', { metodo: 'POST', datos }),
    actualizarPresupuesto: (id, datos) => request('presupuestos', { metodo: 'PUT', params: { id }, datos }),
    borrarPresupuesto: (id) => request('presupuestos', { metodo: 'DELETE', params: { id } }),

    crearActo: (datos) => request('actos', { metodo: 'POST', datos }),
    actualizarActo: (id, datos) => request('actos', { metodo: 'PUT', params: { id }, datos }),
    borrarActo: (id) => request('actos', { metodo: 'DELETE', params: { id } }),

    crearPago: (datos) => request('pagos', { metodo: 'POST', datos }),
    borrarPago: (id) => request('pagos', { metodo: 'DELETE', params: { id } }),

    catalogo: () => request('catalogo'),
    doctores: () => request('doctores'),
    gabinetes: () => request('gabinetes'),
  };
})();
