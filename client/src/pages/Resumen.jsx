// Desarrollado por: Aaron Ponse

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';
import ChipEstado from '../components/ChipEstado';
import Icono from '../components/Icono';
import ImagenEvidencia from '../components/ImagenEvidencia';
import TarjetaCabecera from '../components/TarjetaCabecera';

function leerLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || 'null');
  } catch {
    return null;
  }
}

function fechaHora(valor, vacio = 'Sin registrar') {
  if (!valor) return vacio;
  return new Date(valor).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RESULTADOS = {
  OPERATIVO: 'Operativo',
  REQUIERE_SEGUIMIENTO: 'Requiere seguimiento',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

function etiquetaResultado(valor) {
  return RESULTADOS[valor] || 'Sin registrar';
}

function horometroTexto(detalle) {
  const valor = detalle?.horometro_servicio ?? detalle?.orden?.horometro_actual;
  if (valor === null || valor === undefined || valor === '') return 'Sin registrar';
  const porDefecto =
    detalle?.horometro_servicio === null || detalle?.horometro_servicio === undefined;
  return `${Number(valor).toLocaleString('es-CL')} hrs${porDefecto ? ' (equipo)' : ''}`;
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
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [verDetalle, setVerDetalle] = useState(false);

  useEffect(() => {
    const actualizarRed = () => setEnLinea(navigator.onLine);
    window.addEventListener('online', actualizarRed);
    window.addEventListener('offline', actualizarRed);
    return () => {
      window.removeEventListener('online', actualizarRed);
      window.removeEventListener('offline', actualizarRed);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }
    if (!hoja?.id_hoja) return undefined;

    let activo = true;
    pedir(`/servicios/${hoja.id_hoja}`, { token })
      .then((datos) => {
        if (!activo) return;
        const local = hoja || {};
        setDetalle({
          ...datos,
          estado_servicio:
            local.estado_servicio === 'FINALIZADO' ? 'FINALIZADO' : datos.estado_servicio,
          estado_envio_erp: datos.estado_envio_erp || local.estado_envio_erp,
          fecha_inicio: datos.fecha_inicio || local.fecha_inicio,
          fecha_fin: datos.fecha_fin || local.fecha_fin,
          horometro_servicio: datos.horometro_servicio ?? local.horometro_servicio,
          resultado: datos.resultado || local.resultado,
        });
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
  }, [token, hoja, hoja?.id_hoja, navigate]);

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
      const ordenActual = leerLocal('orden_actual');
      if (ordenActual) {
        localStorage.setItem(
          'orden_actual',
          JSON.stringify({ ...ordenActual, estado: 'COMPLETADO', estado_envio_erp: 'ENVIADO' })
        );
      }
    } catch (err) {
      setError(err.message || 'No se pudo enviar la hoja al ERP. Puedes reintentar.');
    } finally {
      setEnviando(false);
    }
  }

  const enviado = detalle?.estado_envio_erp === 'ENVIADO' || detalle?.estado_envio_erp === 'SINCRONIZADO';
  const puedeEnviar = detalle?.estado_servicio === 'FINALIZADO' && !enviado;

  const codigo = detalle?.orden?.codigo_orden_erp || hoja?.codigo_hoja_erp || '';
  const respuestas = detalle?.respuestas || [];
  const respondidas = respuestas.filter((respuesta) => respuesta.resultado).length;
  const consumos = detalle?.consumos || [];
  const evidencias = detalle?.evidencias || [];
  const fotos = evidencias.filter((evidencia) => evidencia.tipo === 'foto').length;
  const firmas = evidencias.filter((evidencia) => evidencia.tipo === 'firma').length;

  if (!hoja?.id_hoja) {
    return (
      <main className="pantalla">
        <p className="mensaje mensaje-alerta">No hay una hoja de servicio activa en este dispositivo.</p>
        <button type="button" className="boton" onClick={() => navigate('/orden')}>
          Ir a la ficha de la orden
        </button>
      </main>
    );
  }

  if (enviado) {
    return (
      <main className="pantalla">
        <section className="tarjeta exito">
          <span className="exito-icono">
            <Icono nombre="check" tamano={48} />
          </span>
          <h2>¡Orden Completada!</h2>
          <p>
            La atención en terreno para {detalle?.orden?.equipo || 'el equipo'} fue procesada
            correctamente.
          </p>

          <div className="resumen-filas" style={{ textAlign: 'left' }}>
            <DatosServicio detalle={detalle} />
            <div className="fila">
              <span>N° Registro</span>
              <strong>{detalle?.codigo_hoja_erp || codigo || 'Sin código'}</strong>
            </div>
            <div className="fila">
              <span>Destino de datos</span>
              <strong>API REST Backend (ERP)</strong>
            </div>
            <div className="fila">
              <span>Estado del envío</span>
              <ChipEstado estado={detalle?.estado_envio_erp} />
            </div>
          </div>

          <button type="button" className="boton" onClick={() => navigate('/mis-trabajos')}>
            Volver al Dashboard Técnico
          </button>
          <button
            type="button"
            className="boton boton-claro"
            onClick={() => setVerDetalle((valor) => !valor)}
          >
            {verDetalle ? 'Ocultar detalle del servicio' : 'Ver detalle del servicio'}
          </button>
        </section>

        {verDetalle && <DetalleServicio detalle={detalle} />}
      </main>
    );
  }

  return (
    <main className="pantalla">
      <section className="tarjeta-pasos">
        <TarjetaCabecera
          paso="Paso 3 de 3"
          titulo={`Resumen de ${codigo || 'la orden'}`}
          subtitulo={detalle?.orden?.titulo}
          volver="/orden"
        />

        <div className="tarjeta-cuerpo">
          {cargando && <p className="vacio">Cargando resumen del servicio...</p>}
          {mensaje && <p className="mensaje mensaje-ok" role="status">{mensaje}</p>}
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
          {hoja?.pendiente && (
            <p className="mensaje mensaje-alerta">Hay datos pendientes de sincronización.</p>
          )}

          {detalle && (
            <>
              <div className="resumen-filas">
                <DatosServicio detalle={detalle} />
                <div className="fila">
                  <span>Puntos inspeccionados</span>
                  <strong className={respondidas === respuestas.length ? 'ok' : undefined}>
                    {respondidas} / {respuestas.length} validados
                  </strong>
                </div>
                <div className="fila">
                  <span>Insumos registrados</span>
                  <strong>{consumos.length} {consumos.length === 1 ? 'material' : 'materiales'}</strong>
                </div>
                <div className="fila">
                  <span>Evidencias</span>
                  <strong>
                    {fotos} {fotos === 1 ? 'fotografía' : 'fotografías'} · {firmas}{' '}
                    {firmas === 1 ? 'firma' : 'firmas'}
                  </strong>
                </div>
                <div className="fila">
                  <span>Envío al ERP</span>
                  <ChipEstado estado={detalle.estado_envio_erp} />
                </div>
              </div>

              <div className={enLinea ? 'sync' : 'sync sin-red'} style={{ marginTop: '14px' }}>
                <span className="sync-icono">
                  <Icono nombre={enLinea ? 'sincronizar' : 'nube'} tamano={20} />
                </span>
                <div>
                  <strong>{enLinea ? 'Motor SyncEngine listo' : 'Envío en cola local'}</strong>
                  <p>
                    {enLinea
                      ? 'Conexión activa. Los datos se enviarán directamente a la API REST.'
                      : 'Sin conexión. El paquete se guardará en IndexedDB y se enviará al reconectar.'}
                  </p>
                </div>
              </div>

              {!puedeEnviar && (
                <p className="mensaje mensaje-alerta" style={{ marginTop: '12px' }}>
                  Finaliza el servicio en la ficha de la orden antes de enviarlo al ERP.
                </p>
              )}

              <DetalleServicio detalle={detalle} compacto />
            </>
          )}
        </div>
      </section>

      {puedeEnviar && (
        <button
          type="button"
          className="boton boton-verde"
          onClick={() => void enviarAlErp()}
          disabled={enviando}
        >
          <Icono nombre="nube-subir" tamano={20} />
          {enviando ? 'Enviando...' : 'Finalizar y Enviar a Servidor'}
        </button>
      )}

      <button type="button" className="boton boton-claro" onClick={() => navigate('/orden')}>
        Volver a la ficha de la orden
      </button>
    </main>
  );
}

function DatosServicio({ detalle }) {
  if (!detalle) return null;

  return (
    <>
      <div className="fila">
        <span>Equipo</span>
        <strong>{detalle.orden?.equipo || 'No indicado'}</strong>
      </div>
      <div className="fila">
        <span>Cliente</span>
        <strong>{detalle.orden?.cliente || 'No indicado'}</strong>
      </div>
      <div className="fila">
        <span>Horómetro</span>
        <strong>{horometroTexto(detalle)}</strong>
      </div>
      <div className="fila">
        <span>Inicio</span>
        <strong>{fechaHora(detalle.fecha_inicio)}</strong>
      </div>
      <div className="fila">
        <span>Término</span>
        <strong>
          {fechaHora(
            detalle.fecha_fin,
            detalle.estado_servicio === 'FINALIZADO' ? 'Sin registrar' : 'En curso'
          )}
        </strong>
      </div>
      <div className="fila">
        <span>Resultado</span>
        <strong>{etiquetaResultado(detalle.resultado)}</strong>
      </div>
    </>
  );
}

function DetalleServicio({ detalle, compacto = false }) {
  if (!detalle) return null;

  return (
    <details className={compacto ? 'detalle-registros' : 'tarjeta detalle-registros'} style={compacto ? { marginTop: '14px' } : undefined}>
      <summary>Detalle de registros</summary>

      <h3 style={{ marginTop: '12px' }}>Checklist</h3>
      {(detalle.respuestas || []).length === 0 && <p className="tenue">Sin respuestas registradas.</p>}
      <ul className="lista-simple">
        {(detalle.respuestas || []).map((respuesta) => (
          <li key={respuesta.id_item}>
            <strong>{respuesta.pregunta_texto}</strong>
            <span className="tenue">
              Resultado: {respuesta.resultado || 'Sin responder'}
              {respuesta.observacion ? ` · ${respuesta.observacion}` : ''}
            </span>
          </li>
        ))}
      </ul>

      <h3>Materiales</h3>
      {(detalle.consumos || []).length === 0 && <p className="tenue">Sin consumos registrados.</p>}
      <ul className="consumos">
        {(detalle.consumos || []).map((consumo) => (
          <li key={consumo.id_consumo}>
            <span>{consumo.nombre}</span>
            <span className="cantidad">
              {Number(consumo.cantidad)} {consumo.unidad_medida || ''}
            </span>
          </li>
        ))}
      </ul>

      <h3 style={{ marginTop: '16px' }}>Evidencias</h3>
      {(detalle.evidencias || []).length === 0 && <p className="tenue">Sin evidencias registradas.</p>}
      <div className="fotos-grid" style={{ marginTop: '8px' }}>
        {(detalle.evidencias || []).map((evidencia) => (
          <div key={evidencia.id_evidencia} className="foto">
            <ImagenEvidencia
              idEvidencia={evidencia.id_evidencia}
              alt={`Evidencia ${evidencia.tipo}`}
              className=""
            />
            <div className="foto-pie">
              <div>{evidencia.tipo === 'firma' ? 'Firma' : 'Foto'}</div>
              <div>{new Date(evidencia.fecha_captura).toLocaleDateString('es-CL')}</div>
            </div>
          </div>
        ))}
      </div>

      {detalle.actividades && (
        <>
          <h3 style={{ marginTop: '16px' }}>Actividades realizadas</h3>
          <p className="tenue">{detalle.actividades}</p>
        </>
      )}

      {detalle.observaciones_tecnicas && (
        <>
          <h3 style={{ marginTop: '16px' }}>Observaciones técnicas</h3>
          <p className="tenue">{detalle.observaciones_tecnicas}</p>
        </>
      )}
    </details>
  );
}
