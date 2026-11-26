// Desarrollado por: Robert Ramírez

const CLAVE = 'gamma_borradores';
const PREFIJO_ANTERIOR = 'borrador_servicio_';

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null');
  } catch {
    return null;
  }
}

function leerTodos() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '{}') || {};
  } catch {
    return {};
  }
}

function guardarTodos(todos) {
  localStorage.setItem(CLAVE, JSON.stringify(todos));
}

function migrarAnterior(idHoja) {
  try {
    const anterior = JSON.parse(localStorage.getItem(`${PREFIJO_ANTERIOR}${idHoja}`) || 'null');
    if (!anterior) return null;
    localStorage.removeItem(`${PREFIJO_ANTERIOR}${idHoja}`);
    return anterior;
  } catch {
    return null;
  }
}

export function leerBorrador(idHoja) {
  if (!idHoja) return null;
  const todos = leerTodos();
  const borrador = todos[idHoja] || migrarAnterior(idHoja);
  if (!borrador) return null;

  const usuario = leerUsuario();
  if (
    borrador.id_usuario &&
    usuario?.id_usuario &&
    String(borrador.id_usuario) !== String(usuario.id_usuario)
  ) {
    return null;
  }

  return borrador;
}

export function guardarBorrador(idHoja, cambios) {
  if (!idHoja) return null;
  const todos = leerTodos();
  const anterior = todos[idHoja] || migrarAnterior(idHoja) || {};
  const usuario = leerUsuario();
  const nuevo = {
    ...anterior,
    ...cambios,
    id_hoja: idHoja,
    id_usuario: anterior.id_usuario || usuario?.id_usuario || null,
    actualizado: new Date().toISOString(),
  };
  todos[idHoja] = nuevo;
  guardarTodos(todos);
  window.dispatchEvent(new Event('gamma:borrador'));
  return nuevo;
}

export function borrarBorrador(idHoja) {
  if (!idHoja) return;
  const todos = leerTodos();
  delete todos[idHoja];
  guardarTodos(todos);
  localStorage.removeItem(`${PREFIJO_ANTERIOR}${idHoja}`);
  window.dispatchEvent(new Event('gamma:borrador'));
}

export function borrarBorradoresUsuario(idUsuario) {
  const todos = leerTodos();
  for (const [idHoja, borrador] of Object.entries(todos)) {
    if (String(borrador.id_usuario) === String(idUsuario)) {
      delete todos[idHoja];
    }
  }
  guardarTodos(todos);
  window.dispatchEvent(new Event('gamma:borrador'));
}
