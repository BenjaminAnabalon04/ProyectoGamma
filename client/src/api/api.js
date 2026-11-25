// Desarrollado por: Robert Ramírez

import {
  actualizarCola,
  agregarCola,
  borrarCola,
  guardarCache,
  leerCache,
  limpiarCache,
  listarCola,
  notificarCola,
} from './offline';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';
const CLAVE_COLA = 'gamma_cola';

let sincronizando = false;

export function guardarSesion(datos) {
  localStorage.setItem(CLAVE_TOKEN, datos.token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(datos.usuario));
  void sincronizar();
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
  const usuario = obtenerUsuario();
  const hoja = localStorage.getItem('hoja_actual');
  const orden = localStorage.getItem('orden_actual');
  if (usuario?.id_usuario && hoja) {
    localStorage.setItem(`hoja_usuario_${usuario.id_usuario}`, hoja);
  }
  if (usuario?.id_usuario && orden) {
    localStorage.setItem(`orden_usuario_${usuario.id_usuario}`, orden);
  }
  for (const clave of [CLAVE_TOKEN, CLAVE_USUARIO, 'orden_actual', 'hoja_actual', CLAVE_COLA]) {
    localStorage.removeItem(clave);
  }
  void limpiarCache();
  notificarCola();
}

export async function pendientesEnvio() {
  const usuario = obtenerUsuario();
  const cola = await listarCola().catch(() => []);
  return cola.filter(
    (item) => !item.id_usuario || String(item.id_usuario) === String(usuario?.id_usuario)
  ).length;
}

export { listarCola };

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
    return { id_evidencia: cuerpo?.id_evidencia || crypto.randomUUID(), pendiente: true };
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
    respuesta = null;
  }

  if (!respuesta) {
    if (metodo === 'GET') {
      const cache = await leerCache(ruta);
      if (cache !== null) return cache;
      const error = new Error('Sin conexión y sin copia local de estos datos.');
      error.estado = 0;
      throw error;
    }
    if (sinCola) {
      const error = new Error('Sin conexión con el servidor.');
      error.estado = 0;
      throw error;
    }
    const usuario = obtenerUsuario();
    await agregarCola({
      id: crypto.randomUUID(),
      ruta,
      metodo,
      cuerpo: cuerpo ?? null,
      id_usuario: usuario?.id_usuario ?? null,
      creado: new Date().toISOString(),
      ultimo_error: null,
    });
    return respuestaLocal(metodo, ruta, cuerpo);
  }

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new Error(datos?.mensaje || 'Error al comunicarse con el servidor');
    error.estado = respuesta.status;
    throw error;
  }

  if (metodo === 'GET') {
    await guardarCache(ruta, datos);
  } else {
    void sincronizar();
  }
  return datos;
}

async function enviarDirecto(item) {
  const headers = { 'Content-Type': 'application/json' };
  const token = obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${item.ruta}`, {
      method: item.metodo,
      headers,
      body: item.cuerpo === undefined ? undefined : JSON.stringify(item.cuerpo),
    });
  } catch {
    const error = new Error('Sin conexión');
    error.estado = 0;
    throw error;
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = new Error(datos?.mensaje || 'No se pudo sincronizar la operación');
    error.estado = respuesta.status;
    throw error;
  }
  return datos;
}

export async function sincronizar() {
  if (sincronizando) return;
  sincronizando = true;

  try {
    const usuario = obtenerUsuario();
    const cola = await listarCola();

    for (const item of cola) {
      if (item.id_usuario && String(item.id_usuario) !== String(usuario?.id_usuario)) continue;
      try {
        await enviarDirecto(item);
        await borrarCola(item.id);
      } catch (error) {
        await actualizarCola({ ...item, ultimo_error: error.message });
        const esRed = !error.estado || error.estado >= 500;
        const esSesion = error.estado === 401 || error.estado === 403;
        if (esRed || esSesion) break;
      }
    }
  } finally {
    sincronizando = false;
  }
}

export function vaciarCola() {
  return sincronizar();
}