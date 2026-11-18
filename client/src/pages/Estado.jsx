import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/api';

// Pantalla de diagnóstico: comprueba que el servidor y la base de datos responden.
// Sirve de ejemplo de cómo una pantalla pide datos al servidor con `pedir`.
export default function Estado() {
  const [api, setApi] = useState({ texto: 'Consultando al servidor...' });
  const [bd, setBd] = useState({ texto: 'Consultando la base de datos...' });

  useEffect(() => {
    pedir('/health')
      .then((d) => setApi({ ok: true, texto: d.mensaje }))
      .catch(() => setApi({ ok: false, texto: 'No se pudo conectar con el servidor' }));

    pedir('/health/db')
      .then((d) => setBd({ ok: true, texto: `${d.mensaje} (${d.ordenes_en_base} órdenes de prueba)` }))
      .catch(() => setBd({ ok: false, texto: 'La base de datos no responde' }));
  }, []);

  const clase = (estado) => (estado.ok === undefined ? '' : estado.ok ? 'ok' : 'error');

  return (
    <main className="pantalla">
      <h1>Estado del sistema</h1>
      <p className={clase(api)}>Servidor: {api.texto}</p>
      <p className={clase(bd)}>Base de datos: {bd.texto}</p>
      <Link className="boton" to="/">Volver al inicio</Link>
    </main>
  );
}
