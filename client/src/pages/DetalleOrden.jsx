// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { obtenerToken, pedir } from '../api/api';

function leerOrden(location) {
  return location.state?.orden || JSON.parse(localStorage.getItem('orden_actual') || 'null');
}

function leerHoja(orden) {
  const guardada = JSON.parse(localStorage.getItem('hoja_actual') || 'null');
  return guardada && orden && guardada.id_asignacion === orden.id_asignacion ? guardada : null;
}

export default function DetalleOrden() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = obtenerToken();
  const [orden] = useState(() => leerOrden(location));
  const [hoja, setHoja] = useState(() => leerHoja(leerOrden(location)));
  const [horometro, setHorometro] = useState('');
  const [actividades, setActividades] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [resultado, setResultado] = useState('OPERATIVO');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const pendienteLocal = hoja?.pendiente;

  useEffect(() => {
    if (!orden) {
      navigate('/mis-trabajos', { replace: true });
    }
  }, [orden, navigate]);

  useEffect(() => {
    if (!hoja?.id_hoja) return;

    let activo = true;
    async function sincronizar() {
      try {
        const datos = await pedir(`/servicios/${hoja.id_hoja}`, { token });
        if (!activo) return;
        const actualizada = {
          ...datos,
          id_asignacion: orden.id_asignacion,
          pendiente: pendienteLocal,
        };
        setHoja(actualizada);
        localStorage.setItem('hoja_actual', JSON.stringify(actualizada));
        setActividades(datos.actividades || '');
        setObservaciones(datos.observaciones_tecnicas || '');
        setHorometro(datos.horometro_servicio ?? '');
        if (datos.resultado) setResultado(datos.resultado);
      } catch (err) {
        if (!activo) return;
        if (err.estado === 404) {
          localStorage.removeItem('hoja_actual');
          setHoja(null);
        }
      }
    }

    void sincronizar();
    return () => {
      activo = false;
    };
  }, [hoja?.id_hoja, pendienteLocal, orden, token]);

  if (!orden) return null;

  async function iniciarServicio() {
    setError('');
    setMensaje('');
    setCargando(true);

    try {
      const idHoja = crypto.randomUUID();
      const datos = await pedir('/servicios', {
        metodo: 'POST',
        token,
        cuerpo: { id_hoja: idHoja, id_asignacion: orden.id_asignacion },
      });
      const nuevaHoja = { ...datos, id_asignacion: orden.id_asignacion };
      setHoja(nuevaHoja);
      localStorage.setItem('hoja_actual', JSON.stringify(nuevaHoja));
      setMensaje(datos.pendiente ? 'Servicio registrado; se enviará al reconectar.' : 'Servicio iniciado correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el servicio.');
    } finally {
      setCargando(false);
    }
  }

  async function finalizarServicio(evento) {
    evento.preventDefault();
    if (!hoja?.id_hoja) return;

    setError('');
    setMensaje('');
    setCargando(true);

    try {
      await pedir(`/servicios/${hoja.id_hoja}/finalizar`, {
        metodo: 'PUT',
        token,
        cuerpo: {
          horometro_servicio: horometro === '' ? null : Number(horometro),
          actividades,
          observaciones_tecnicas: observaciones,
          resultado,
        },
      });
      const finalizada = { ...hoja, estado_servicio: 'FINALIZADO' };
      setHoja(finalizada);
      localStorage.setItem('hoja_actual', JSON.stringify(finalizada));
      setMensaje('Servicio finalizado. Puedes continuar al resumen y envío.');
    } catch (err) {
      setError(err.message || 'Faltan datos obligatorios para finalizar.');
      if (err.datos?.faltantes?.length) {
        setError(`${err.message}: ${err.datos.faltantes.join(', ')}`);
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="pantalla">
      <h1>{orden.codigo_orden_erp}</h1>
      <div className="tarjeta">
        <p><strong>{orden.titulo}</strong></p>
        <p>Tipo: {orden.tipo_servicio} · Prioridad: {orden.prioridad}</p>
        {orden.cliente && <p>Cliente: {orden.cliente}</p>}
        {orden.equipo && <p>Equipo: {orden.equipo}</p>}
        <p>Estado del servicio: <strong>{hoja ? hoja.estado_servicio : orden.estado}</strong></p>
        {hoja?.pendiente && <p className="alerta">Cambios pendientes de sincronización.</p>}
      </div>

      {mensaje && <p className="ok" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {!hoja && (
        <button type="button" className="boton" onClick={iniciarServicio} disabled={cargando}>
          {cargando ? 'Iniciando...' : 'Iniciar servicio'}
        </button>
      )}

      {hoja && hoja.estado_servicio !== 'FINALIZADO' && (
        <>
          <p>
            Inicio registrado:{' '}
            {hoja.fecha_inicio ? new Date(hoja.fecha_inicio).toLocaleString() : 'En curso'}
          </p>

          <div className="botonera">
            <button type="button" className="boton" onClick={() => navigate('/checklist-insumos')}>
              Checklist y materiales
            </button>
            <button type="button" className="boton" onClick={() => navigate('/evidencias-firma')}>
              Fotos y firma
            </button>
          </div>

          <form onSubmit={finalizarServicio} className="tarjeta">
            <h2>Cerrar servicio</h2>

            <div className="campo">
              <label htmlFor="horometro" className="etiqueta">Horómetro del equipo</label>
              <input
                id="horometro"
                type="number"
                step="0.1"
                min="0"
                value={horometro}
                onChange={(evento) => setHorometro(evento.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="actividades" className="etiqueta">Actividades realizadas</label>
              <textarea
                id="actividades"
                rows="3"
                value={actividades}
                onChange={(evento) => setActividades(evento.target.value)}
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="observaciones" className="etiqueta">Observaciones técnicas</label>
              <textarea
                id="observaciones"
                rows="3"
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="resultado" className="etiqueta">Resultado</label>
              <select
                id="resultado"
                value={resultado}
                onChange={(evento) => setResultado(evento.target.value)}
              >
                <option value="OPERATIVO">Operativo</option>
                <option value="REQUIERE_SEGUIMIENTO">Requiere seguimiento</option>
                <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
              </select>
            </div>

            <button type="submit" className="boton" disabled={cargando}>
              {cargando ? 'Finalizando...' : 'Finalizar servicio'}
            </button>
          </form>
        </>
      )}

      {hoja && hoja.estado_servicio === 'FINALIZADO' && (
        <button type="button" className="boton" onClick={() => navigate('/resumen')}>
          Ir a resumen y envío
        </button>
      )}

      <button type="button" className="boton boton-secundario" onClick={() => navigate('/mis-trabajos')}>
        Volver a mis trabajos
      </button>
    </main>
  );
}
