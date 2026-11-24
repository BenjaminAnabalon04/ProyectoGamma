// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/api';

export default function Estado() {
  const [api, setApi] = useState({ texto: 'Consultando al servidor...' });
  const [bd, setBd] = useState({ texto: 'Consultando la base de datos...' });
  const [erp, setErp] = useState({ texto: 'Consultando el ERP simulado...' });

  useEffect(() => {
    pedir('/health')
      .then((datos) => setApi({ ok: true, texto: datos.mensaje }))
      .catch((error) => setApi({ ok: false, texto: error.message }));

    pedir('/health/db')
      .then((datos) =>
        setBd({
          ok: true,
          texto: `${datos.mensaje} (${datos.ordenes_en_base} órdenes de prueba)`,
        })
      )
      .catch((error) => setBd({ ok: false, texto: error.message }));

    pedir('/health/erp')
      .then((datos) => setErp({ ok: true, texto: `${datos.mensaje} (${datos.hojas_recibidas} hojas)` }))
      .catch((error) => setErp({ ok: false, texto: error.message }));
  }, []);

  const clase = (estado) => (estado.ok === undefined ? '' : estado.ok ? 'ok' : 'error');

  return (
    <main className="pantalla">
      <h1>Estado del sistema</h1>
      <div className="tarjeta">
        <p className={clase(api)}>Servidor: {api.texto}</p>
        <p className={clase(bd)}>Base de datos: {bd.texto}</p>
        <p className={clase(erp)}>ERP simulado: {erp.texto}</p>
      </div>
      <Link className="boton" to="/">Volver al inicio</Link>
    </main>
  );
}
