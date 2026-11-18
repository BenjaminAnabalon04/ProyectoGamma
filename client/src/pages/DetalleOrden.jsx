import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pedir } from '../api/api';

// Desarrollado por: Robert Ramírez
export default function DetalleOrden() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const orden =
    location.state?.orden ||
    JSON.parse(localStorage.getItem('orden_actual') || 'null');

  const [hoja, setHoja] = useState(() => {
    const guardada = JSON.parse(localStorage.getItem('hoja_actual') || 'null');
    if (guardada && orden && guardada.id_asignacion === orden.id_asignacion) {
      return guardada;
    }
    return null;
  });

  const [horometro, setHorometro] = useState('');
  const [actividades, setActividades] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [resultado, setResultado] = useState('operativo');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!token) {
    navigate('/login');
    return null;
  }

  if (!orden) {
    return (
      <main className="pantalla">
        <h1>Detalle de la orden</h1>
        <p className="error">No hay una orden seleccionada.</p>
        <button
          type="button"
          className="boton"
          onClick={() => navigate('/mis-trabajos')}
        >
          Volver a mis trabajos
        </button>
      </main>
    );
  }

  async function iniciarServicio() {
    setError('');
    setMensaje('');
    setCargando(true);

    try {
      const id_hoja = crypto.randomUUID();
      const datos = await pedir('/servicios', {
        metodo: 'POST',
        token,
        cuerpo: {
          id_hoja,
          id_asignacion: orden.id_asignacion,
        },
      });

      const nuevaHoja = {
        ...datos,
        id_asignacion: orden.id_asignacion,
      };
      setHoja(nuevaHoja);
      localStorage.setItem('hoja_actual', JSON.stringify(nuevaHoja));
      setMensaje('Servicio iniciado correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el servicio.');
    } finally {
      setCargando(false);
    }
  }

  async function finalizarServicio(e) {
    e.preventDefault();
    if (!hoja?.id_hoja) return;

    setError('');
    setMensaje('');
    setCargando(true);

    try {
      await pedir(`/servicios/${hoja.id_hoja}/finalizar`, {
        metodo: 'PUT',
        token,
        cuerpo: {
          horometro_servicio: horometro ? Number(horometro) : null,
          actividades,
          observaciones_tecnicas: observaciones,
          resultado,
        },
      });

      const hojaFinalizada = { ...hoja, estado_servicio: 'FINALIZADO' };
      setHoja(hojaFinalizada);
      localStorage.setItem('hoja_actual', JSON.stringify(hojaFinalizada));
      setMensaje('Servicio finalizado. Puedes continuar al resumen y envío.');
    } catch (err) {
      setError(err.message || 'Faltan datos obligatorios para finalizar.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="pantalla">
      <h1>{orden.codigo_orden_erp}</h1>
      <p><strong>{orden.titulo}</strong></p>
      <p>Tipo: {orden.tipo_servicio} | Prioridad: {orden.prioridad}</p>
      {orden.cliente && <p>Cliente: {orden.cliente}</p>}
      {orden.equipo && <p>Equipo: {orden.equipo}</p>}
      <p>
        Estado del servicio:{' '}
        <strong>{hoja ? hoja.estado_servicio : orden.estado}</strong>
      </p>

      {mensaje && (
        <p className="ok" role="status">
          {mensaje}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!hoja && (
        <button
          type="button"
          className="boton"
          onClick={iniciarServicio}
          disabled={cargando}
        >
          {cargando ? 'Iniciando...' : 'Iniciar servicio'}
        </button>
      )}

      {hoja && hoja.estado_servicio !== 'FINALIZADO' && (
        <div>
          <p>
            Inicio registrado:{' '}
            {hoja.fecha_inicio
              ? new Date(hoja.fecha_inicio).toLocaleString()
              : 'En curso'}
          </p>

          <button
            type="button"
            className="boton"
            onClick={() => navigate('/checklist-insumos')}
          >
            Ir a checklist y materiales
          </button>

          <button
            type="button"
            className="boton"
            onClick={() => navigate('/evidencias-firma')}
          >
            Ir a fotos y firma
          </button>

          <form onSubmit={finalizarServicio} style={{ marginTop: '20px' }}>
            <h2>Cerrar servicio</h2>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="horometro" className="etiqueta">
                Horómetro del equipo
              </label>
              <input
                id="horometro"
                type="number"
                step="0.1"
                value={horometro}
                onChange={(e) => setHorometro(e.target.value)}
                style={{ width: '100%', minHeight: '48px', padding: '10px', fontSize: '18px', marginTop: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="actividades" className="etiqueta">
                Actividades realizadas
              </label>
              <textarea
                id="actividades"
                rows="3"
                value={actividades}
                onChange={(e) => setActividades(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', fontSize: '18px', marginTop: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="observaciones" className="etiqueta">
                Observaciones técnicas
              </label>
              <textarea
                id="observaciones"
                rows="3"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '18px', marginTop: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="resultado" className="etiqueta">
                Resultado
              </label>
              <select
                id="resultado"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                style={{ width: '100%', minHeight: '48px', padding: '10px', fontSize: '18px', marginTop: '6px' }}
              >
                <option value="operativo">Operativo</option>
                <option value="requiere_seguimiento">Requiere seguimiento</option>
                <option value="fuera_de_servicio">Fuera de servicio</option>
              </select>
            </div>

            <button type="submit" className="boton" disabled={cargando}>
              {cargando ? 'Finalizando...' : 'Finalizar servicio'}
            </button>
          </form>
        </div>
      )}

      {hoja && hoja.estado_servicio === 'FINALIZADO' && (
        <button
          type="button"
          className="boton"
          onClick={() => navigate('/resumen')}
        >
          Ir a resumen y envío
        </button>
      )}

      <button
        type="button"
        className="boton"
        onClick={() => navigate('/mis-trabajos')}
      >
        Volver a mis trabajos
      </button>
    </main>
  );
}