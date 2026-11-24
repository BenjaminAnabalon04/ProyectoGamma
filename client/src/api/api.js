// Desarrollado por: Robert Ramírez

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';
const CLAVE_COLA = 'gamma_cola';

function leerCola() {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]');
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

function escribirCola(cola) {
  localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
  window.dispatchEvent(new CustomEvent('gamma:cola', { detail: { pendientes: cola.length } }));
}

export function guardarSesion(datos) {
  localStorage.setItem(CLAVE_TOKEN, datos.token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(datos.usuario));
}

export function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_USUARIO) || 'null');
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  for (const clave of [CLAVE_TOKEN, CLAVE_USUARIO, 'orden_actual', 'hoja_actual', CLAVE_COLA]) {
    localStorage.removeItem(clave);
  }
  window.dispatchEvent(new CustomEvent('gamma:cola', { detail: { pendientes: 0 } }));
}

export function pendientesEnvio() {
  return leerCola().length;
}

function respuestaLocal(metodo, ruta, cuerpo) {
  if (ruta === '/servicios') {
    return {
      id_hoja: cuerpo?.id_hoja,
      id_checklist: null,
      estado_servicio: 'EN_EJECUCION',
      fecha_inicio: new Date().toISOString(),
      pendiente: true,
    };
  }
  if (ruta.endsWith('/finalizar')) {
    return { id_hoja: ruta.split('/')[2], estado_servicio: 'FINALIZADO', pendiente: true };
  }
  if (ruta.endsWith('/enviar')) {
    return { estado_envio_erp: 'PENDIENTE', pendiente: true };
  }
  if (ruta.startsWith('/checklists/respuestas/')) {
    return { guardadas: cuerpo?.respuestas?.length || 0, pendiente: true };
  }
  if (ruta === '/evidencias') {
    return {
      id_evidencia: cuerpo?.id_evidencia || crypto.randomUUID(),
      clave_archivo: null,
      pendiente: true,
    };
  }
  if (ruta === '/materiales/consumos') {
    return { id_consumo: cuerpo?.id_consumo || crypto.randomUUID(), pendiente: true };
  }
  if (ruta === '/presupuestos') {
    return { id_presupuesto: crypto.randomUUID(), estado: 'ENVIADO', pendiente: true };
  }
  return { ...(cuerpo || {}), pendiente: true, metodo };
}

export async function pedir(ruta, { metodo = 'GET', cuerpo, token, sinCola = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const tokenEfectivo = token === undefined ? obtenerToken() : token;
  if (tokenEfectivo) headers.Authorization = `Bearer ${tokenEfectivo}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    if (!sinCola && metodo !== 'GET' && metodo !== 'HEAD') {
      const cola = leerCola();
      cola.push({
        id: crypto.randomUUID(),
        ruta,
        metodo,
        cuerpo: cuerpo ?? null,
        token: tokenEfectivo,
        fecha: new Date().toISOString(),
      });
      escribirCola(cola);
      return respuestaLocal(metodo, ruta, cuerpo);
    }
    const error = new Error('No se pudo conectar con el servidor. Revisa la conexión e intenta de nuevo.');
    error.estado = 0;
    throw error;
  }

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new Error(datos?.mensaje || 'Error al comunicarse con el servidor');
    error.estado = respuesta.status;
    error.datos = datos;
    throw error;
  }

  if (!sinCola) void vaciarCola();
  return datos;
}

export async function vaciarCola() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;

  let cola = leerCola();
  let enviados = 0;

  while (cola.length > 0) {
    const item = cola[0];
    try {
      await pedir(item.ruta, {
        metodo: item.metodo,
        cuerpo: item.cuerpo,
        token: item.token,
        sinCola: true,
      });
      cola = cola.slice(1);
      escribirCola(cola);
      enviados += 1;
    } catch (error) {
      if (error.estado === 0 || error.estado >= 500) break;
      cola = cola.slice(1);
      escribirCola(cola);
    }
  }

  return enviados;
}
