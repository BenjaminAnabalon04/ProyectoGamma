// Desarrollado por: Robert Ramírez

const NOMBRE_BD = 'gamma-offline';
let promesaBd = null;

function abrirBd() {
  if (promesaBd) return promesaBd;
  promesaBd = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, 1);
    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result;
      if (!bd.objectStoreNames.contains('cache')) {
        bd.createObjectStore('cache', { keyPath: 'clave' });
      }
      if (!bd.objectStoreNames.contains('cola')) {
        bd.createObjectStore('cola', { keyPath: 'id' });
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => {
      promesaBd = null;
      reject(solicitud.error);
    };
  });
  return promesaBd;
}

async function operar(nombre, modo, accion) {
  const bd = await abrirBd();
  return new Promise((resolve, reject) => {
    const transaccion = bd.transaction(nombre, modo);
    const almacen = transaccion.objectStore(nombre);
    const solicitud = accion(almacen);
    transaccion.oncomplete = () => resolve(solicitud.result);
    transaccion.onerror = () => reject(transaccion.error);
    transaccion.onabort = () => reject(transaccion.error);
  });
}

export function notificarCola() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gamma:cola'));
  }
}

export async function leerCache(clave) {
  const fila = await operar('cache', 'readonly', (almacen) => almacen.get(clave));
  return fila ? fila.datos : null;
}

export async function guardarCache(clave, datos) {
  await operar('cache', 'readwrite', (almacen) => almacen.put({ clave, datos }));
}

export async function limpiarCache() {
  await operar('cache', 'readwrite', (almacen) => almacen.clear());
}

export async function listarCola() {
  const filas = await operar('cola', 'readonly', (almacen) => almacen.getAll());
  return (filas || []).sort((uno, otro) => String(uno.creado).localeCompare(String(otro.creado)));
}

export async function agregarCola(item) {
  await operar('cola', 'readwrite', (almacen) => almacen.put(item));
  notificarCola();
}

export async function actualizarCola(item) {
  await operar('cola', 'readwrite', (almacen) => almacen.put(item));
  notificarCola();
}

export async function borrarCola(id) {
  await operar('cola', 'readwrite', (almacen) => almacen.delete(id));
  notificarCola();
}