// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { obtenerUsuario, pedir } from '../api/api';
import ChipEstado from '../components/ChipEstado';
import Icono from '../components/Icono';

function dinero(valor) {
  if (valor === null || valor === undefined) return 'Sin valor';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

function fecha(valor) {
  if (!valor) return 'Sin fecha';
  return new Date(valor).toLocaleDateString('es-CL');
}

export default function Administracion() {
  const usuario = obtenerUsuario();
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

  const pendientes = presupuestos.filter((presupuesto) => presupuesto.estado === 'ENVIADO');

  return (
    <main className="pantalla pantalla-admin">
      <section className="admin-hero">
        <div>
          <span className="micro">Vista de oficina / administrador</span>
          <h1>FYAG Central ERP · Gestión &amp; Presupuestos</h1>
        </div>
        <span className="admin-rol">
          <Icono nombre="usuario" tamano={16} />
          Rol: {usuario?.rol || 'administrador'}
        </span>
      </section>

      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      {mensaje && <p className="mensaje mensaje-ok" role="status">{mensaje}</p>}

      {resumen && (
        <div className="kpis-admin">
          <div className="kpi-admin kpi-verde">
            <span>Servicios finalizados</span>
            <strong>{resumen.servicios_finalizados}</strong>
          </div>
          <div className="kpi-admin kpi-ambar">
            <span>Presupuestos pendientes</span>
            <strong>{resumen.presupuestos_pendientes}</strong>
          </div>
          <div className="kpi-admin kpi-error">
            <span>Envíos con error</span>
            <strong>{resumen.envios_con_error}</strong>
          </div>
          <div className="kpi-admin kpi-azul">
            <span>Usuarios activos</span>
            <strong>{resumen.usuarios_activos}</strong>
          </div>
        </div>
      )}

      <div className="admin-grid">
        <section className="tarjeta">
          <div className="seccion-titulo" style={{ marginTop: 0 }}>
            <Icono nombre="documento" tamano={20} />
            Reportes e insumos desde terreno
          </div>

          {hojas.length === 0 ? (
            <p className="vacio">No hay hojas registradas.</p>
          ) : (
            <div className="contenedor-tabla">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Equipo</th>
                    <th>Técnico</th>
                    <th>Servicio</th>
                    <th>Envío</th>
                    <th>Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {hojas.map((hoja) => (
                    <tr key={hoja.id_hoja}>
                      <td><strong>{hoja.codigo_orden_erp}</strong></td>
                      <td>{hoja.titulo}</td>
                      <td>{hoja.tecnico}</td>
                      <td><ChipEstado estado={hoja.estado_servicio} /></td>
                      <td><ChipEstado estado={hoja.estado_envio_erp} /></td>
                      <td>{fecha(hoja.fecha_inicio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="tarjeta">
          <h2>Validación de presupuestos</h2>

          {pendientes.length === 0 && (
            <p className="vacio">No hay presupuestos pendientes de revisión.</p>
          )}

          {pendientes.map((presupuesto) => (
            <div key={presupuesto.id_presupuesto} className="presupuesto-card">
              <div className="orden-cabecera">
                <strong>{presupuesto.descripcion || 'Presupuesto'}</strong>
                <span className="monto">{dinero(presupuesto.monto_estimado)}</span>
              </div>
              <p className="micro" style={{ marginTop: '6px' }}>
                {presupuesto.codigo_orden_erp || 'Sin orden'} · {fecha(presupuesto.fecha_creacion)}
              </p>
              <ul className="lista-simple">
                {(presupuesto.detalles || []).map((detalle) => (
                  <li key={detalle.id_detalle}>
                    <span>
                      {detalle.descripcion} · {Number(detalle.cantidad)} {detalle.unidad_medida || ''}
                    </span>
                    <span className="tenue">{dinero(detalle.precio_unitario)}</span>
                  </li>
                ))}
              </ul>
              <div className="botonera">
                <button
                  type="button"
                  className="boton boton-verde boton-compacto"
                  disabled={procesando === presupuesto.id_presupuesto}
                  onClick={() => void resolver(presupuesto.id_presupuesto, true)}
                >
                  Aprobar presupuesto
                </button>
                <button
                  type="button"
                  className="boton boton-peligro boton-compacto"
                  disabled={procesando === presupuesto.id_presupuesto}
                  onClick={() => void resolver(presupuesto.id_presupuesto, false)}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}

          {presupuestos.length > pendientes.length && (
            <details className="detalle-registros">
              <summary>Historial de presupuestos</summary>
              <ul className="lista-simple">
                {presupuestos
                  .filter((presupuesto) => presupuesto.estado !== 'ENVIADO')
                  .map((presupuesto) => (
                    <li key={presupuesto.id_presupuesto}>
                      <span>{presupuesto.descripcion || 'Presupuesto'}</span>
                      <span className="tenue">
                        <ChipEstado estado={presupuesto.estado} /> {dinero(presupuesto.monto_estimado)}
                      </span>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </aside>
      </div>
    </main>
  );
}
