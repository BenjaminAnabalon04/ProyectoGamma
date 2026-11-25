// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { listarCola, obtenerUsuario } from '../api/api';
import Icono from '../components/Icono';
import TarjetaCabecera from '../components/TarjetaCabecera';

const ACCIONES = {
  '/servicios': 'Iniciar servicio',
  '/checklists/respuestas': 'Guardar checklist',
  '/materiales/consumos': 'Registrar material',
  '/evidencias': 'Guardar foto o firma',
  '/presupuestos': 'Crear presupuesto',
};

function describir(item) {
  if (item.ruta.endsWith('/finalizar')) return 'Finalizar servicio';
  if (item.ruta.endsWith('/enviar')) return 'Enviar al ERP';
  return ACCIONES[item.ruta] || item.ruta;
}

function fecha(valor) {
  if (!valor) return 'Sin fecha';
  return new Date(valor).toLocaleString('es-CL');
}

export default function Pendientes() {
  const [cola, setCola] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      const usuario = obtenerUsuario();
      const filas = await listarCola().catch(() => []);
      setCola(
        filas.filter(
          (item) =>
            !item.id_usuario || String(item.id_usuario) === String(usuario?.id_usuario)
        )
      );
    };

    void cargar();
    window.addEventListener('gamma:cola', cargar);
    return () => window.removeEventListener('gamma:cola', cargar);
  }, []);

  return (
    <main className="pantalla">
      <section className="tarjeta-pasos">
        <TarjetaCabecera
          paso="Sincronización"
          titulo="Envíos pendientes"
          subtitulo={`${cola.length} ${cola.length === 1 ? 'operación en cola' : 'operaciones en cola'}`}
          volver="/mis-trabajos"
        />

        <div className="tarjeta-cuerpo">
          <div className="sync">
            <span className="sync-icono">
              <Icono nombre="nube" tamano={20} />
            </span>
            <div>
              <strong>Cola local del dispositivo</strong>
              <p>
                Estas operaciones se guardaron en este dispositivo y se enviarán automáticamente
                al recuperar la conexión.
              </p>
            </div>
          </div>

          {cola.length === 0 && <p className="vacio">No hay envíos pendientes.</p>}

          <ul className="lista-simple">
            {cola.map((item) => (
              <li key={item.id}>
                <div className="orden-cabecera">
                  <strong>{describir(item)}</strong>
                  <span className="pildora pildora-proceso">Pendiente</span>
                </div>
                <span className="micro">Registrado: {fecha(item.creado)}</span>
                {item.ultimo_error && <span className="error">{item.ultimo_error}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
