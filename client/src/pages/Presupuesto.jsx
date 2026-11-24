// Desarrollado por: Aaron Ponse

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';

function leerLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || 'null');
  } catch {
    return null;
  }
}

function nuevoItem() {
  return {
    id: crypto.randomUUID(),
    descripcion: '',
    cantidad: '1',
    unidad_medida: 'un',
  };
}

export default function Presupuesto() {
  const navigate = useNavigate();
  const token = obtenerToken();
  const [orden] = useState(() => leerLocal('orden_actual'));
  const [lugarTrabajo, setLugarTrabajo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems] = useState(() => [nuevoItem()]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }

    let activo = true;
    pedir('/presupuestos', { token })
      .then((datos) => {
        if (activo) setPresupuestos(Array.isArray(datos) ? datos : []);
      })
      .catch((err) => {
        if (!activo) return;
        if (err.estado === 401 || err.estado === 403) {
          cerrarSesion();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'No se pudo cargar la lista de presupuestos.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token, navigate]);

  function cambiarItem(id, campo, valor) {
    setMensaje('');
    setItems((previo) =>
      previo.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  }

  function agregarItem() {
    setItems((previo) => [...previo, nuevoItem()]);
  }

  function quitarItem(id) {
    setItems((previo) => (previo.length === 1 ? previo : previo.filter((item) => item.id !== id)));
  }

  async function enviarPresupuesto(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    if (!orden?.id_orden) {
      setError('No hay una orden seleccionada. Abre una orden desde "Mis trabajos".');
      return;
    }
    if (!descripcion.trim()) {
      setError('Describe el trabajo presupuestado.');
      return;
    }

    const detalles = items
      .filter((item) => item.descripcion.trim())
      .map((item) => ({
        descripcion: item.descripcion.trim(),
        cantidad: Number(item.cantidad),
        unidad_medida: item.unidad_medida.trim() || null,
      }));

    if (detalles.length === 0) {
      setError('Agrega al menos un ítem con descripción.');
      return;
    }
    if (detalles.some((item) => !Number.isFinite(item.cantidad) || item.cantidad <= 0)) {
      setError('La cantidad de cada ítem debe ser mayor que 0.');
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await pedir('/presupuestos', {
        metodo: 'POST',
        token,
        cuerpo: {
          id_orden: orden.id_orden,
          lugar_trabajo: lugarTrabajo.trim() || null,
          descripcion: descripcion.trim(),
          items: detalles,
        },
      });

      if (respuesta.pendiente) {
        setMensaje('Presupuesto guardado en el equipo. Se enviará al reconectar.');
      } else {
        setMensaje('Presupuesto enviado a oficina para su revisión.');
        const actualizados = await pedir('/presupuestos', { token });
        setPresupuestos(Array.isArray(actualizados) ? actualizados : []);
        setLugarTrabajo('');
        setDescripcion('');
        setItems([nuevoItem()]);
      }
    } catch (err) {
      setError(err.message || 'No se pudo enviar el presupuesto.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="pantalla">
      <h1>Presupuesto en terreno</h1>

      {orden ? (
        <p>
          Orden: <strong>{orden.codigo_orden_erp}</strong> · <strong>{orden.titulo}</strong>
        </p>
      ) : (
        <div className="tarjeta">
          <p className="alerta">No hay una orden seleccionada para presupuestar.</p>
          <button type="button" className="boton" onClick={() => navigate('/mis-trabajos')}>
            Ir a mis trabajos
          </button>
        </div>
      )}

      {mensaje && <p className="ok" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {orden && (
        <form onSubmit={enviarPresupuesto} className="tarjeta">
          <h2>Datos del presupuesto</h2>

          <div className="campo">
            <label htmlFor="lugar-trabajo" className="etiqueta">Lugar del trabajo</label>
            <input
              id="lugar-trabajo"
              type="text"
              value={lugarTrabajo}
              onChange={(evento) => setLugarTrabajo(evento.target.value)}
              placeholder="Ej. Planta Chillán - Sala de máquinas"
            />
          </div>

          <div className="campo">
            <label htmlFor="descripcion-presupuesto" className="etiqueta">Descripción del trabajo</label>
            <textarea
              id="descripcion-presupuesto"
              rows="3"
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              placeholder="Trabajo a presupuestar y alcance"
              required
            />
          </div>

          <h3>Ítems (sin precios)</h3>
          <ul className="lista-simple">
            {items.map((item, indice) => (
              <li key={item.id}>
                <div className="campo">
                  <label htmlFor={`item-desc-${item.id}`} className="etiqueta">
                    Ítem {indice + 1}
                  </label>
                  <input
                    id={`item-desc-${item.id}`}
                    type="text"
                    value={item.descripcion}
                    onChange={(evento) => cambiarItem(item.id, 'descripcion', evento.target.value)}
                    placeholder="Ej. Cambio de filtro secador"
                  />
                </div>

                <div className="botonera">
                  <div className="campo">
                    <label htmlFor={`item-cant-${item.id}`} className="etiqueta">Cantidad</label>
                    <input
                      id={`item-cant-${item.id}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(evento) => cambiarItem(item.id, 'cantidad', evento.target.value)}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor={`item-uni-${item.id}`} className="etiqueta">Unidad</label>
                    <input
                      id={`item-uni-${item.id}`}
                      type="text"
                      value={item.unidad_medida}
                      onChange={(evento) => cambiarItem(item.id, 'unidad_medida', evento.target.value)}
                    />
                  </div>
                </div>

                <button type="button" className="boton boton-secundario" onClick={() => quitarItem(item.id)}>
                  Quitar ítem
                </button>
              </li>
            ))}
          </ul>

          <div className="botonera">
            <button type="button" className="boton boton-secundario" onClick={agregarItem}>
              Agregar ítem
            </button>
            <button type="submit" className="boton" disabled={guardando}>
              {guardando ? 'Enviando...' : 'Enviar presupuesto'}
            </button>
          </div>
        </form>
      )}

      <section className="tarjeta">
        <h2>Mis presupuestos</h2>
        {cargando && <p>Cargando presupuestos...</p>}
        {!cargando && presupuestos.length === 0 && <p>No has enviado presupuestos todavía.</p>}
        <ul className="lista-simple">
          {presupuestos.map((presupuesto) => (
            <li key={presupuesto.id_presupuesto}>
              <strong>{presupuesto.descripcion || 'Presupuesto'}</strong>
              <span>Orden: {presupuesto.codigo_orden_erp || 'Sin código'}</span>
              <span>Estado: <strong>{presupuesto.estado}</strong></span>
              <span className="etiqueta">
                {new Date(presupuesto.fecha_creacion).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="boton boton-secundario" onClick={() => navigate('/orden')}>
        Volver al detalle de la orden
      </button>
    </main>
  );
}
