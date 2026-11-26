// Desarrollado por: Robert Ramírez

import {
  actualizarCola,
  agregarCola,
  borrarCola,
  guardarCache,
  leerCache,
  limpiarCache,
  limpiarArchivos,
  listarCola,
  notificarCola,
} from './offline';
import { guardarBorrador } from './borrador';

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

export function guardarHojaActual(hoja) {
  localStorage.setItem('hoja_actual', JSON.stringify(hoja));
  window.dispatchEvent(new Event('gamma:hoja'));
}

export function borrarHojaActual() {
  localStorage.removeItem('hoja_actual');
  window.dispatchEvent(new Event('gamma:hoja'));
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
  window.dispatchEvent(new Event('gamma:hoja'));
  void limpiarCache();
  void limpiarArchivos();
  notificarCola();
}

export async function pendientesEnvio() {
  const usuario = obtenerUsuario();
  const cola = await listarCola().catch(() => []);
  return cola.filter(
    (item) => !item.id_usuario || String(item.id_usuario) === String(usuario?.id_usuario)
  ).length;
}

export async function precargarDatosOffline(ordenes) {
  const lista = Array.isArray(ordenes) ? ordenes : [];
  const tipos = [...new Set(lista.map((orden) => orden.tipo_servicio).filter(Boolean))];
  const token = obtenerToken();
  const tareas = [pedir('/materiales', { token })];
  for (const tipo of tipos) {
    tareas.push(
      pedir(`/checklists?tipo_servicio=${encodeURIComponent(tipo)}`, { token })
    );
  }
  for (const orden of lista.filter((item) => item.id_hoja)) {
    tareas.push(pedir(`/servicios/${orden.id_hoja}`, { token }));
    tareas.push(pedir(`/checklists?id_hoja=${orden.id_hoja}`, { token }));
    tareas.push(pedir(`/materiales/consumos/${orden.id_hoja}`, { token }));
    tareas.push(pedir(`/evidencias/${orden.id_hoja}`, { token }));
    tareas.push(pedir(`/presupuestos?id_hoja=${orden.id_hoja}`, { token }));
  }
  await Promise.allSettled(tareas);
}

export async function actualizarOrdenEnCache(idAsignacion, cambios) {
  const ordenes = await leerCache('/ordenes').catch(() => null);
  if (!Array.isArray(ordenes)) return;
  const actualizadas = ordenes.map((orden) =>
    Number(orden.id_asignacion) === Number(idAsignacion)
      ? { ...orden, ...cambios }
      : orden
  );
  await guardarCache('/ordenes', actualizadas);
  window.dispatchEvent(new Event('gamma:ordenes'));
}

export { borrarCola, listarCola };

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
    return {
      id_presupuesto: cuerpo?.id_presupuesto || crypto.randomUUID(),
      estado: 'ENVIADO',
      pendiente: true,
    };
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
      body:
        cuerpo === undefined || cuerpo === null
          ? undefined
          : JSON.stringify(cuerpo),
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
      intentos: 0,
      proximo_intento: new Date().toISOString(),
      fallido: false,
    });
    return respuestaLocal(metodo, ruta, cuerpo);
  }

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new Error(datos?.mensaje || 'Error al comunicarse con el servidor');
    error.estado = respuesta.status;
    error.datos = datos;
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
      body:
        item.cuerpo === undefined || item.cuerpo === null
          ? undefined
          : JSON.stringify(item.cuerpo),
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
    error.datos = datos;
    throw error;
  }
  return datos;
}

async function refrescarTrasSincronizacion(usuario) {
  const restantes = (await listarCola()).filter(
    (item) => !item.id_usuario || String(item.id_usuario) === String(usuario?.id_usuario)
  );
  if (restantes.length > 0) return;

  const token = obtenerToken();
  try {
    const hojaGuardada = JSON.parse(localStorage.getItem('hoja_actual') || 'null');
    if (hojaGuardada?.id_hoja) {
      const datos = await pedir(`/servicios/${hojaGuardada.id_hoja}`, { token });
      const actualizada = { ...datos, pendiente: false };
      guardarHojaActual(actualizada);
      guardarBorrador(hojaGuardada.id_hoja, { ...datos, pendiente: false });
    }
  } catch {
    return;
  }

  try {
    await pedir('/ordenes', { token });
    window.dispatchEvent(new Event('gamma:ordenes'));
  } catch {
    return;
  }
}

export async function reintentarCola() {
  const usuario = obtenerUsuario();
  const cola = await listarCola();
  for (const item of cola) {
    if (item.id_usuario && String(item.id_usuario) !== String(usuario?.id_usuario)) continue;
    await actualizarCola({
      ...item,
      fallido: false,
      intentos: 0,
      proximo_intento: new Date().toISOString(),
    });
  }
  await sincronizar();
}

export async function sincronizar() {
  if (sincronizando) return;
  sincronizando = true;

  try {
    const usuario = obtenerUsuario();
    const cola = await listarCola();
    if (cola.length === 0) return;

    for (const item of cola) {
      if (item.id_usuario && String(item.id_usuario) !== String(usuario?.id_usuario)) continue;
      if (item.fallido) continue;
      if (
        item.proximo_intento &&
        new Date(item.proximo_intento).getTime() > Date.now()
      ) {
        continue;
      }

      try {
        await enviarDirecto(item);
        await borrarCola(item.id);
      } catch (error) {
        const estado = Number(error.estado);
        const esRed = !estado || estado >= 500;
        const esSesion = estado === 401 || estado === 403;
        const esDefinitivo = estado >= 400 && estado < 500 && !esSesion;
        const intentos = (item.intentos || 0) + 1;

        if (esDefinitivo) {
          await actualizarCola({
            ...item,
            intentos,
            fallido: true,
            ultimo_error: error.message,
            proximo_intento: null,
          });
          continue;
        }

        const minutos = [1, 2, 4, 8, 16][Math.min(intentos - 1, 4)];
        await actualizarCola({
          ...item,
          intentos,
          ultimo_error: error.message,
          proximo_intento: new Date(Date.now() + minutos * 60000).toISOString(),
        });

        if (esRed || esSesion) break;
      }
    }

    await refrescarTrasSincronizacion(usuario);
  } finally {
    sincronizando = false;
  }
}

export function vaciarCola() {
  return sincronizar();
}