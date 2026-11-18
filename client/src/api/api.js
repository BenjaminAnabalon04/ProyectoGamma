// Punto único por donde la pantalla le habla al servidor.
// Todas las llamadas a la API pasan por la función `pedir`.
// Ejemplos:
//   const datos = await pedir('/health');
//   await pedir('/auth/login', { metodo: 'POST', cuerpo: { rut, password } });
//   await pedir('/ordenes', { token });   // cuando exista el login (HU-01)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export async function pedir(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new Error(datos?.mensaje || 'Error al comunicarse con el servidor');
    error.estado = respuesta.status;
    throw error;
  }
  return datos;
}
