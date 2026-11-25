// Desarrollado por: Aaron Ponse

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';
import ChipEstado from '../components/ChipEstado';
import Icono from '../components/Icono';
import TarjetaCabecera from '../components/TarjetaCabecera';

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
    id_material: null,
    descripcion: '',
    cantidad: '1',
    unidad_medida: 'un',
  };
}

function itemDesdeConsumo(consumo) {
  return {
    id: crypto.randomUUID(),
    id_material: consumo.id_material,
    descripcion: consumo.nombre,
    cantidad: String(consumo.cantidad),
    unidad_medida: consumo.unidad_medida || 'un',
  };
}

function fecha(valor) {
  return valor ? new Date(valor).toLocaleString('es-CL') : 'Sin fecha';
}

export default function Presupuesto() {
  const navigate = useNavigate();
  const token = obtenerToken();
  const [orden] = useState(() => leerLocal('orden_actual'));
  const [hoja] = useState(() => leerLocal('hoja_actual'));
  const [lugarTrabajo, setLugarTrabajo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems] = useState(() => [nuevoItem()]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [detalleActivo, setDetalleActivo] = useState(null);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(Boolean(hoja?.id_hoja));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }
    if (!hoja?.id_hoja) return undefined;

    let activo = true;
    const parametros = new URLSearchParams({ id_hoja: hoja.id_hoja });

    Promise.all([
      pedir(`/presupuestos?${parametros.toString()}`, { token }),
      pedir(`/materiales/consumos/${hoja.id_hoja}`, { token }),
    ])
      .then(([datosPresupuestos, datosConsumos]) => {
        if (!activo) return;
        const lista = Array.isArray(datosPresupuestos) ? datosPresupuestos : [];
        const materiales = Array.isArray(datosConsumos) ? datosConsumos : [];
        setPresupuestos(lista);
        setConsumos(materiales);
        setItems(materiales.length > 0 ? materiales.map(itemDesdeConsumo) : [nuevoItem()]);

        const pendiente = lista.find(
          (presupuesto) => presupuesto.estado === 'ENVIADO' || presupuesto.estado === 'APROBADO'
        );
        if (pendiente) {
          void pedir(`/presupuestos/${pendiente.id_presupuesto}`, { token })
            .then((detalle) => {
              if (activo) setDetalleActivo(detalle);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (!activo) return;
        if (err.estado === 401 || err.estado === 403) {
          cerrarSesion();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'No se pudo cargar el presupuesto del servicio.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token, hoja?.id_hoja, navigate]);

  const presupuestoActivo = presupuestos.find(
    (presupuesto) =>
      presupuesto.estado === 'ENVIADO' ||
      presupuesto.estado === 'EN_COSTEO' ||
      presupuesto.estado === 'APROBADO'
  );

  function iniciarNuevo() {
    setItems(consumos.length > 0 ? consumos.map(itemDesdeConsumo) : [nuevoItem()]);
    setMensaje('');
    setError('');
    setCreando(true);
  }

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

  function actualizarDesdeMateriales() {
    if (consumos.length === 0) {
      setMensaje('No hay materiales registrados en este servicio.');
      return;
    }
    setItems(consumos.map(itemDesdeConsumo));
    setMensaje('Ítems actualizados desde los materiales del servicio.');
  }

  async function enviarPresupuesto(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    if (!hoja?.id_hoja) {
      setError('Primero inicia el servicio en la ficha de la orden.');
      return;
    }
    if (!descripcion.trim()) {
      setError('Describe el trabajo presupuestado.');
      return;
    }

    const detalles = items
      .filter((item) => item.descripcion.trim())
      .map((item) => ({
        id_material: item.id_material || null,
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
          id_hoja: hoja.id_hoja,
          id_orden: orden?.id_orden,
          lugar_trabajo: lugarTrabajo.trim() || null,
          descripcion: descripcion.trim(),
          items: detalles,
        },
      });

      if (respuesta.pendiente) {
        setMensaje('Presupuesto guardado en el equipo. Se enviará al reconectar.');
      } else {
        setMensaje('Presupuesto del servicio enviado a oficina para su revisión.');
        setCreando(false);
        const parametros = new URLSearchParams({ id_hoja: hoja.id_hoja });
        const actualizados = await pedir(`/presupuestos?${parametros.toString()}`, { token });
        setPresupuestos(Array.isArray(actualizados) ? actualizados : []);
      }
    } catch (err) {
      setError(err.message || 'No se pudo enviar el presupuesto.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="pantalla">
      <section className="tarjeta-pasos">
        <TarjetaCabecera
          paso="Presupuesto del servicio"
          titulo={orden?.equipo || orden?.titulo || 'Presupuesto'}
          subtitulo={orden ? `Orden ${orden.codigo_orden_erp || orden.id_orden}` : undefined}
          volver="/orden"
        />

        <div className="tarjeta-cuerpo">
          {!hoja?.id_hoja && (
            <>
              <p className="mensaje mensaje-alerta">
                Primero inicia el servicio en la ficha de la orden para presupuestar sus materiales.
              </p>
              <button type="button" className="boton" onClick={() => navigate('/orden')}>
                Ir a la ficha de la orden
              </button>
            </>
          )}

          {cargando && <p className="vacio">Cargando presupuesto del servicio...</p>}
          {mensaje && <p className="mensaje mensaje-ok" role="status">{mensaje}</p>}
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

          {hoja?.id_hoja && presupuestoActivo && (
            <div className="tarjeta" style={{ marginTop: 0 }}>
              <div className="orden-cabecera">
                <div>
                  <span className="micro">Presupuesto del servicio</span>
                  <strong className="orden-titulo">
                    {presupuestoActivo.descripcion || 'Presupuesto enviado'}
                  </strong>
                </div>
                <ChipEstado
                  estado={presupuestoActivo.estado}
                  etiqueta={presupuestoActivo.estado === 'ENVIADO' ? 'Pendiente' : undefined}
                />
              </div>
              <p className="micro" style={{ marginTop: '8px' }}>
                Creado: {fecha(presupuestoActivo.fecha_creacion)}
              </p>

              {detalleActivo?.detalles?.length > 0 && (
                <ul className="consumos">
                  {detalleActivo.detalles.map((detalle) => (
                    <li key={detalle.id_detalle}>
                      <span>{detalle.descripcion}</span>
                      <span className="cantidad">
                        {Number(detalle.cantidad)} {detalle.unidad_medida || ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="tenue" style={{ marginTop: '12px' }}>
                {presupuestoActivo.estado === 'APROBADO'
                  ? 'Presupuesto aprobado por la oficina. Ya puedes volver a la ficha y finalizar el servicio.'
                  : 'Presupuesto enviado. Debes esperar la aprobación de la oficina antes de finalizar el servicio.'}
              </p>
            </div>
          )}

          {hoja?.id_hoja && !presupuestoActivo && !creando && (
            <div className="tarjeta" style={{ marginTop: 0 }}>
              <div className="seccion-titulo" style={{ marginTop: 0 }}>
                <Icono nombre="documento" tamano={20} />
                Nuevo presupuesto
              </div>
              <p className="tenue">
                El presupuesto es opcional. Si lo creas, la oficina deberá aprobarlo antes de
                finalizar el servicio.
              </p>
              {presupuestos[0]?.estado === 'RECHAZADO' && (
                <p className="mensaje mensaje-error">
                  El presupuesto anterior fue rechazado. Puedes crear uno nuevo.
                </p>
              )}
              <button type="button" className="boton" onClick={iniciarNuevo}>
                <Icono nombre="mas" tamano={18} />
                Nuevo presupuesto
              </button>
            </div>
          )}

          {hoja?.id_hoja && !presupuestoActivo && creando && (
            <form onSubmit={enviarPresupuesto}>
              <div className="seccion-titulo" style={{ marginTop: 0 }}>
                <Icono nombre="caja" tamano={20} />
                Materiales del servicio
              </div>

              <p className="tenue">
                {consumos.length > 0
                  ? `${consumos.length} ${consumos.length === 1 ? 'material registrado' : 'materiales registrados'} en este servicio.`
                  : 'Aún no hay materiales registrados en este servicio.'}
              </p>

              {consumos.length > 0 && (
                <button
                  type="button"
                  className="boton boton-claro boton-compacto"
                  onClick={actualizarDesdeMateriales}
                  style={{ marginTop: '8px' }}
                >
                  <Icono nombre="sincronizar" tamano={16} />
                  Actualizar desde materiales
                </button>
              )}

              <div className="campo" style={{ marginTop: '14px' }}>
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
                <label htmlFor="descripcion-presupuesto" className="etiqueta">
                  Descripción del trabajo
                </label>
                <textarea
                  id="descripcion-presupuesto"
                  rows="3"
                  value={descripcion}
                  onChange={(evento) => setDescripcion(evento.target.value)}
                  placeholder="Trabajo a presupuestar y alcance"
                  required
                />
              </div>

              <div className="seccion-titulo">
                <Icono nombre="documento" tamano={20} />
                Ítems del presupuesto
              </div>

              <ul className="lista-simple">
                {items.map((item, indice) => (
                  <li key={item.id}>
                    <div className="orden-cabecera">
                      <strong>Ítem {indice + 1}</strong>
                      {item.id_material && (
                        <span className="pildora pildora-ok">Del servicio</span>
                      )}
                    </div>

                    <div className="campo">
                      <label htmlFor={`item-desc-${item.id}`} className="etiqueta">Descripción</label>
                      <input
                        id={`item-desc-${item.id}`}
                        type="text"
                        value={item.descripcion}
                        onChange={(evento) => cambiarItem(item.id, 'descripcion', evento.target.value)}
                        placeholder="Ej. Cambio de filtro secador"
                      />
                    </div>

                    <div className="campo-fila">
                      <div>
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

                      <div>
                        <label htmlFor={`item-uni-${item.id}`} className="etiqueta">Unidad</label>
                        <input
                          id={`item-uni-${item.id}`}
                          type="text"
                          value={item.unidad_medida}
                          onChange={(evento) => cambiarItem(item.id, 'unidad_medida', evento.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="enlace-boton"
                      style={{ color: 'var(--error)', fontSize: '13px' }}
                      onClick={() => quitarItem(item.id)}
                    >
                      Quitar ítem
                    </button>
                  </li>
                ))}
              </ul>

              <div className="botonera">
                <button type="button" className="boton boton-claro" onClick={agregarItem}>
                  <Icono nombre="mas" tamano={18} />
                  Agregar ítem
                </button>
                <button type="submit" className="boton" disabled={guardando}>
                  {guardando ? 'Enviando...' : 'Enviar presupuesto'}
                </button>
              </div>

              <button
                type="button"
                className="boton boton-claro"
                onClick={() => setCreando(false)}
              >
                Cancelar
              </button>
            </form>
          )}

          {presupuestos.length > 0 && (
            <>
              <div className="seccion-titulo">
                <Icono nombre="documento" tamano={20} />
                Historial del servicio
              </div>
              <ul className="lista-simple">
                {presupuestos.map((presupuesto) => (
                  <li key={presupuesto.id_presupuesto}>
                    <div className="orden-cabecera">
                      <strong>{presupuesto.descripcion || 'Presupuesto'}</strong>
                      <ChipEstado
                        estado={presupuesto.estado}
                        etiqueta={presupuesto.estado === 'ENVIADO' ? 'Pendiente' : undefined}
                      />
                    </div>
                    <span className="micro">{fecha(presupuesto.fecha_creacion)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {hoja?.id_hoja && (
        <button
          type="button"
          className="boton"
          onClick={() => navigate('/evidencias-firma')}
        >
          Continuar a Fotos y firma
          <Icono nombre="flecha-derecha" tamano={18} />
        </button>
      )}

      <button type="button" className="boton boton-claro" onClick={() => navigate('/orden')}>
        Volver a la ficha de la orden
      </button>
    </main>
  );
}
