// Desarrollado por: Aaron Ponse

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';
import ImagenEvidencia from '../components/ImagenEvidencia';

function leerLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || 'null');
  } catch {
    return null;
  }
}

function fecha(valor) {
  return valor ? new Date(valor).toLocaleString() : 'Sin registrar';
}

export default function Resumen() {
  const navigate = useNavigate();
  const token = obtenerToken();
  const [hoja] = useState(() => leerLocal('hoja_actual'));
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(Boolean(hoja?.id_hoja));
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }
    if (!hoja?.id_hoja) return undefined;

    let activo = true;
    pedir(`/servicios/${hoja.id_hoja}`, { token })
      .then((datos) => {
        if (activo) setDetalle(datos);
      })
      .catch((err) => {
        if (!activo) return;
        if (err.estado === 401 || err.estado === 403) {
          cerrarSesion();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'No se pudo cargar el resumen del servicio.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token, hoja?.id_hoja, navigate]);

  async function enviarAlErp() {
    if (!hoja?.id_hoja) return;
    setEnviando(true);
    setMensaje('');
    setError('');

    try {
      const respuesta = await pedir(`/servicios/${hoja.id_hoja}/enviar`, {
        metodo: 'POST',
        token,
      });

      if (respuesta.pendiente) {
        setMensaje('Envío guardado en el equipo. Se realizará al reconectar con el servidor.');
        return;
      }

      setMensaje(`Hoja enviada al ERP con código ${respuesta.codigo_hoja_erp}.`);
      const actualizada = await pedir(`/servicios/${hoja.id_hoja}`, { token });
      setDetalle(actualizada);
      localStorage.setItem(
        'hoja_actual',
        JSON.stringify({ ...actualizada, pendiente: false })
      );
    } catch (err) {
      setError(err.message || 'No se pudo enviar la hoja al ERP. Puedes reintentar.');
    } finally {
      setEnviando(false);
    }
  }

  const enviado = detalle?.estado_envio_erp === 'ENVIADO' || detalle?.estado_envio_erp === 'SINCRONIZADO';
  const puedeEnviar = detalle?.estado_servicio === 'FINALIZADO' && !enviado;

  return (
    <main className="pantalla">
      <h1>Resumen y envío al ERP</h1>

      {!hoja?.id_hoja && (
        <div className="tarjeta">
          <p className="alerta">No hay una hoja de servicio activa en este dispositivo.</p>
          <button type="button" className="boton" onClick={() => navigate('/orden')}>
            Ir al detalle de la orden
          </button>
        </div>
      )}

      {cargando && <p>Cargando resumen del servicio...</p>}
      {mensaje && <p className="ok" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {hoja?.pendiente && <p className="alerta">Hay datos pendientes de sincronización.</p>}

      {detalle && (
        <>
          <section className="tarjeta">
            <h2>Datos del servicio</h2>
            {detalle.orden && (
              <>
                <p><strong>{detalle.orden.codigo_orden_erp}</strong> · {detalle.orden.titulo}</p>
                <p>Cliente: {detalle.orden.cliente}</p>
                <p>Equipo: {detalle.orden.equipo || 'No indicado'}</p>
              </>
            )}
            <p>Estado del servicio: <strong>{detalle.estado_servicio}</strong></p>
            <p>Estado de envío: <strong>{detalle.estado_envio_erp}</strong></p>
            {detalle.codigo_hoja_erp && <p>Código ERP: <strong>{detalle.codigo_hoja_erp}</strong></p>}
            <p>Inicio: {fecha(detalle.fecha_inicio)}</p>
            <p>Término: {fecha(detalle.fecha_fin)}</p>
            {detalle.horometro_servicio !== null && detalle.horometro_servicio !== undefined && (
              <p>Horómetro: {Number(detalle.horometro_servicio)}</p>
            )}
            {detalle.resultado && <p>Resultado: <strong>{detalle.resultado}</strong></p>}
            {detalle.actividades && <p>Actividades: {detalle.actividades}</p>}
            {detalle.observaciones_tecnicas && (
              <p>Observaciones: {detalle.observaciones_tecnicas}</p>
            )}
          </section>

          <section className="tarjeta">
            <h2>Checklist</h2>
            {detalle.respuestas.length === 0 && <p>No hay respuestas registradas.</p>}
            <ul className="lista-simple">
              {detalle.respuestas.map((respuesta) => (
                <li key={respuesta.id_item}>
                  <strong>{respuesta.pregunta_texto}</strong>
                  <span>Resultado: {respuesta.resultado || 'Sin responder'}</span>
                  {respuesta.observacion && <span>Observación: {respuesta.observacion}</span>}
                </li>
              ))}
            </ul>
          </section>

          <section className="tarjeta">
            <h2>Materiales</h2>
            {detalle.consumos.length === 0 && <p>No se registraron consumos.</p>}
            {detalle.consumos.length > 0 && (
              <div className="contenedor-tabla">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.consumos.map((consumo) => (
                      <tr key={consumo.id_consumo}>
                        <td>{consumo.nombre}</td>
                        <td>{Number(consumo.cantidad)} {consumo.unidad_medida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="tarjeta">
            <h2>Evidencias</h2>
            {detalle.evidencias.length === 0 && <p>No se registraron evidencias.</p>}
            <ul className="lista-simple">
              {detalle.evidencias.map((evidencia) => (
                <li key={evidencia.id_evidencia}>
                  <strong>{evidencia.tipo === 'firma' ? 'Firma' : 'Foto'}</strong>
                  <span>{fecha(evidencia.fecha_captura)}</span>
                  {evidencia.nombre_firmante && <span>Firmante: {evidencia.nombre_firmante}</span>}
                  <ImagenEvidencia
                    idEvidencia={evidencia.id_evidencia}
                    alt={`Evidencia ${evidencia.tipo}`}
                  />
                </li>
              ))}
            </ul>
          </section>

          {!puedeEnviar && !enviado && (
            <p className="alerta">
              Finaliza el servicio en el detalle de la orden antes de enviarlo al ERP.
            </p>
          )}

          {enviado && <p className="ok">Esta hoja ya fue enviada al ERP.</p>}

          <div className="botonera">
            {puedeEnviar && (
              <button type="button" className="boton" onClick={() => void enviarAlErp()} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar al ERP'}
              </button>
            )}
            <button type="button" className="boton boton-secundario" onClick={() => navigate('/orden')}>
              Volver al detalle de la orden
            </button>
          </div>
        </>
      )}
    </main>
  );
}
