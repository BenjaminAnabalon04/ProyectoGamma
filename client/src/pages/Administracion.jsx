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

function PresupuestoAdmin({ presupuesto, procesando, onGuardar, onResolver }) {
  const [precios, setPrecios] = useState(() =>
    Object.fromEntries(
      (presupuesto.detalles || []).map((detalle) => [
        detalle.id_detalle,
        detalle.precio_unitario ?? '',
      ])
    )
  );

  const total = (presupuesto.detalles || []).reduce(
    (suma, detalle) =>
      suma + Number(detalle.cantidad || 0) * Number(precios[detalle.id_detalle] || 0),
    0
  );

  const listaPrecios = (presupuesto.detalles || []).map((detalle) => ({
    id_detalle: detalle.id_detalle,
    precio_unitario: Number(precios[detalle.id_detalle] || 0),
  }));

  return (
    <div className="presupuesto-card">
      <div className="orden-cabecera">
        <strong>{presupuesto.descripcion || 'Presupuesto'}</strong>
        <ChipEstado estado={presupuesto.estado} />
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
            <div className="campo-fila" style={{ marginTop: '6px' }}>
              <div>
                <label htmlFor={`precio-${detalle.id_detalle}`} className="etiqueta">
                  Precio unitario
                </label>
                <input
                  id={`precio-${detalle.id_detalle}`}
                  type="number"
                  min="0"
                  step="1"
                  value={precios[detalle.id_detalle] ?? ''}
                  onChange={(evento) =>
                    setPrecios((previo) => ({
                      ...previo,
                      [detalle.id_detalle]: evento.target.value,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <span className="etiqueta">Subtotal</span>
                <strong>{dinero(Number(precios[detalle.id_detalle] || 0) * Number(detalle.cantidad || 0))}</strong>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="micro">Total estimado: {dinero(total)}</p>

      <div className="botonera">
        <button
          type="button"
          className="boton boton-claro boton-compacto"
          disabled={procesando === presupuesto.id_presupuesto}
          onClick={() => void onGuardar(presupuesto.id_presupuesto, listaPrecios)}
        >
          Guardar costeo
        </button>
        <button
          type="button"
          className="boton boton-verde boton-compacto"
          disabled={procesando === presupuesto.id_presupuesto || total <= 0}
          onClick={() => void onResolver(presupuesto.id_presupuesto, true, listaPrecios, total)}
        >
          Aprobar presupuesto
        </button>
        <button
          type="button"
          className="boton boton-peligro boton-compacto"
          disabled={procesando === presupuesto.id_presupuesto}
          onClick={() => void onResolver(presupuesto.id_presupuesto, false)}
        >
          Rechazar
        </button>
      </div>
    </div>
  );
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

  async function resolver(id, aprobado, precios = [], total = 0) {
    setProcesando(id);
    setError('');
    setMensaje('');
    try {
      const presupuesto = presupuestos.find((item) => item.id_presupuesto === id);
      const cuerpo = aprobado
        ? {
            monto_aprobado: total > 0 ? total : presupuesto?.monto_estimado || 1,
            precios,
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

  async function guardarCosteo(id, precios) {
    setProcesando(id);
    setError('');
    setMensaje('');
    try {
      await pedir(`/presupuestos/${id}/costeo`, {
        metodo: 'PUT',
        cuerpo: { precios },
      });
      setMensaje('Costeo guardado. El presupuesto queda en costeo.');
      setVersion((valor) => valor + 1);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el costeo.');
    } finally {
      setProcesando('');
    }
  }

  const pendientes = presupuestos.filter((presupuesto) =>
    ['ENVIADO', 'EN_COSTEO'].includes(presupuesto.estado)
  );

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
            <PresupuestoAdmin
              key={presupuesto.id_presupuesto}
              presupuesto={presupuesto}
              procesando={procesando}
              onGuardar={guardarCosteo}
              onResolver={resolver}
            />
          ))}

          {presupuestos.length > pendientes.length && (
            <details className="detalle-registros">
              <summary>Historial de presupuestos</summary>
              <ul className="lista-simple">
                {presupuestos
                  .filter(
                    (presupuesto) =>
                      !['ENVIADO', 'EN_COSTEO'].includes(presupuesto.estado)
                  )
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
