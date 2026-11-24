// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { pedir } from '../api/api';

function dinero(valor) {
  if (valor === null || valor === undefined) return 'Sin valor';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

export default function Administracion() {
  const [resumen, setResumen] = useState(null);
  const [hojas, setHojas] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [procesando, setProcesando] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    Promise.all([
      pedir('/admin/resumen'),
      pedir('/admin/hojas'),
      pedir('/presupuestos'),
    ])
      .then(([datosResumen, datosHojas, datosPresupuestos]) => {
        if (!activo) return;
        setResumen(datosResumen);
        setHojas(datosHojas);
        setPresupuestos(datosPresupuestos);
      })
      .catch((err) => {
        if (activo) setError(err.message || 'No se pudo cargar el panel de administración.');
      });
    return () => {
      activo = false;
    };
  }, [version]);

  async function resolver(id, aprobado) {
    setProcesando(id);
    setError('');
    setMensaje('');
    try {
      const presupuesto = presupuestos.find((item) => item.id_presupuesto === id);
      const cuerpo = aprobado
        ? {
            monto_aprobado: presupuesto?.monto_estimado || 1,
            observacion_oficina: 'Aprobado desde el panel de administración',
          }
        : { observacion_oficina: 'Rechazado desde el panel de administración' };
      const ruta = aprobado ? 'aprobar' : 'rechazar';
      await pedir(`/presupuestos/${id}/${ruta}`, { metodo: 'PUT', cuerpo });
      setMensaje(aprobado ? 'Presupuesto aprobado.' : 'Presupuesto rechazado.');
      setVersion((valor) => valor + 1);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el presupuesto.');
    } finally {
      setProcesando('');
    }
  }

  return (
    <main className="pantalla">
      <h1>Panel de administración</h1>

      {error && <p className="error" role="alert">{error}</p>}
      {mensaje && <p className="ok" role="status">{mensaje}</p>}

      {resumen && (
        <section className="tarjeta">
          <h2>Resumen de operación</h2>
          <p>Órdenes pendientes: <strong>{resumen.ordenes_pendientes}</strong></p>
          <p>Asignaciones activas: <strong>{resumen.asignaciones_activas}</strong></p>
          <p>Servicios en curso: <strong>{resumen.servicios_en_curso}</strong></p>
          <p>Servicios finalizados: <strong>{resumen.servicios_finalizados}</strong></p>
          <p>Envíos con error: <strong>{resumen.envios_con_error}</strong></p>
          <p>Presupuestos por revisar: <strong>{resumen.presupuestos_pendientes}</strong></p>
          <p>Usuarios activos: <strong>{resumen.usuarios_activos}</strong></p>
        </section>
      )}

      <section className="tarjeta">
        <h2>Hojas de servicio</h2>
        {hojas.length === 0 && <p>No hay hojas registradas.</p>}
        <div className="contenedor-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Técnico</th>
                <th>Servicio</th>
                <th>Envío ERP</th>
              </tr>
            </thead>
            <tbody>
              {hojas.map((hoja) => (
                <tr key={hoja.id_hoja}>
                  <td>{hoja.codigo_orden_erp}</td>
                  <td>{hoja.tecnico}</td>
                  <td>{hoja.estado_servicio}</td>
                  <td>{hoja.estado_envio_erp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Presupuestos</h2>
        {presupuestos.length === 0 && <p>No hay presupuestos registrados.</p>}
        {presupuestos.map((presupuesto) => (
          <div key={presupuesto.id_presupuesto} className="tarjeta">
            <p><strong>{presupuesto.descripcion}</strong></p>
            <p>Orden: {presupuesto.codigo_orden_erp || 'Sin orden'} · Estado: {presupuesto.estado}</p>
            <p>Estimado: {dinero(presupuesto.monto_estimado)}</p>
            <ul className="lista-simple">
              {(presupuesto.detalles || []).map((detalle) => (
                <li key={detalle.id_detalle}>
                  {detalle.descripcion} · {Number(detalle.cantidad)} {detalle.unidad_medida || ''} · {dinero(detalle.precio_unitario)}
                </li>
              ))}
            </ul>
            {presupuesto.estado === 'ENVIADO' && (
              <div className="botonera">
                <button
                  type="button"
                  className="boton"
                  disabled={procesando === presupuesto.id_presupuesto}
                  onClick={() => void resolver(presupuesto.id_presupuesto, true)}
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  className="boton boton-peligro"
                  disabled={procesando === presupuesto.id_presupuesto}
                  onClick={() => void resolver(presupuesto.id_presupuesto, false)}
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
