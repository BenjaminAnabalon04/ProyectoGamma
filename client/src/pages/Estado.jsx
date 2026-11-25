// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/api';
import Icono from '../components/Icono';

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

  const filas = [
    { nombre: 'Servidor', estado: api, icono: 'edificio' },
    { nombre: 'Base de datos', estado: bd, icono: 'capas' },
    { nombre: 'ERP simulado', estado: erp, icono: 'sincronizar' },
  ];

  return (
    <main className="pantalla">
      <section className="tarjeta">
        <h1>Estado del sistema</h1>
        <p className="tenue">Verificación de los servicios que sostienen la PWA de terreno.</p>

        <div className="resumen-filas" style={{ marginTop: '14px' }}>
          {filas.map((fila) => (
            <div key={fila.nombre} className="fila">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Icono nombre={fila.icono} tamano={16} />
                {fila.nombre}
              </span>
              <strong
                className={
                  fila.estado.ok === undefined ? undefined : fila.estado.ok ? 'ok' : 'error'
                }
              >
                {fila.estado.texto}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <Link className="boton boton-claro" to="/">
        Volver al inicio
      </Link>
    </main>
  );
}
