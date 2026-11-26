// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { actualizarOrdenEnCache, borrarHojaActual, guardarHojaActual, obtenerToken, pedir } from '../api/api';
import { borrarBorrador, guardarBorrador, leerBorrador } from '../api/borrador';
import ChipEstado from '../components/ChipEstado';
import Icono from '../components/Icono';
import TarjetaCabecera from '../components/TarjetaCabecera';

function leerOrden(location) {
  return location.state?.orden || JSON.parse(localStorage.getItem('orden_actual') || 'null');
}

function leerHoja(orden) {
  const guardada = JSON.parse(localStorage.getItem('hoja_actual') || 'null');
  if (!guardada || !orden || guardada.id_asignacion !== orden.id_asignacion) return null;
  const borrador = leerBorrador(guardada.id_hoja) || {};
  return { ...borrador, ...guardada, id_asignacion: orden.id_asignacion };
}

function numero(valor, sufijo = '') {
  if (valor === null || valor === undefined || valor === '') return 'No registrado';
  return `${Number(valor).toLocaleString('es-CL')}${sufijo}`;
}

function fecha(valor) {
  if (!valor) return 'No registrada';
  return new Date(valor).toLocaleDateString('es-CL');
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

function etiquetaResultado(valor) {
  const etiquetas = {
    OPERATIVO: 'Operativo',
    REQUIERE_SEGUIMIENTO: 'Requiere seguimiento',
    FUERA_DE_SERVICIO: 'Fuera de servicio',
  };
  return etiquetas[valor] || 'Sin registrar';
}

function horometroTexto(hoja, orden) {
  const valor = hoja?.horometro_servicio ?? orden?.horometro_actual;
  if (valor === null || valor === undefined || valor === '') return 'Sin registrar';
  const sufijo = hoja?.horometro_servicio === null || hoja?.horometro_servicio === undefined
    ? ' hrs (equipo)'
    : ' hrs';
  return `${Number(valor).toLocaleString('es-CL')}${sufijo}`;
}

function unirPresupuestos(servidor, local) {
  const mapa = new Map();
  for (const item of Array.isArray(servidor) ? servidor : []) {
    mapa.set(String(item.id_presupuesto), item);
  }
  for (const item of Array.isArray(local) ? local : []) {
    mapa.set(String(item.id_presupuesto), item);
  }
  return [...mapa.values()];
}

function presupuestoMasReciente(lista) {
  return (Array.isArray(lista) ? lista : []).reduce((ultimo, actual) => {
    if (!ultimo) return actual;
    return new Date(actual.fecha_creacion || 0) >= new Date(ultimo.fecha_creacion || 0)
      ? actual
      : ultimo;
  }, null);
}

export default function DetalleOrden() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = obtenerToken();
  const [orden] = useState(() => leerOrden(location));
  const [hoja, setHoja] = useState(() => leerHoja(leerOrden(location)));
  const [presupuestos, setPresupuestos] = useState([]);
  const [horometro, setHorometro] = useState(() =>
    orden?.horometro_actual === null || orden?.horometro_actual === undefined
      ? ''
      : String(orden.horometro_actual)
  );
  const [actividades, setActividades] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [resultado, setResultado] = useState('OPERATIVO');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const pendienteLocal = hoja?.pendiente;
  const enviado =
    hoja?.estado_envio_erp === 'ENVIADO' || hoja?.estado_envio_erp === 'SINCRONIZADO';
  const presupuestoUltimo = presupuestoMasReciente(presupuestos);
  const presupuestoAprobado = presupuestoUltimo?.estado === 'APROBADO';
  const presupuestoPendiente =
    presupuestoUltimo?.estado === 'ENVIADO' || presupuestoUltimo?.estado === 'EN_COSTEO';
  const requiereAprobacion = presupuestoUltimo?.estado === 'RECHAZADO';
  const completado =
    hoja?.estado_servicio === 'FINALIZADO' &&
    !presupuestoPendiente &&
    (enviado || presupuestoAprobado);
  const enRevision =
    hoja?.estado_servicio === 'FINALIZADO' && presupuestoPendiente && !completado;

  useEffect(() => {
    if (!orden) {
      navigate('/mis-trabajos', { replace: true });
    }
  }, [orden, navigate]);

  useEffect(() => {
    const idHoja = hoja?.id_hoja || orden?.id_hoja;
    if (!idHoja) return;

    let activo = true;
    async function sincronizar() {
      try {
        const datos = await pedir(`/servicios/${idHoja}`, { token });
        if (!activo) return;
        const local = leerBorrador(idHoja);
        const presupuestoRechazado = Array.isArray(datos.presupuestos)
          ? datos.presupuestos.some((presupuesto) => presupuesto.estado === 'RECHAZADO')
          : false;
        const servidorReabierto =
          datos.estado_servicio === 'EN_EJECUCION' && presupuestoRechazado;
        const actualizada = {
          ...datos,
          ...(local?.pendiente && !servidorReabierto ? local : {}),
          id_asignacion: orden.id_asignacion,
          pendiente: servidorReabierto
            ? false
            : local?.pendiente ?? pendienteLocal,
        };
        setHoja(actualizada);
        if (servidorReabierto) {
          guardarBorrador(idHoja, {
            estado_servicio: 'EN_EJECUCION',
            estado_envio_erp: datos.estado_envio_erp,
            fecha_fin: datos.fecha_fin,
            pendiente: false,
          });
        }
        const listaServidor = Array.isArray(datos.presupuestos) ? datos.presupuestos : [];
        const listaLocal = Array.isArray(local?.presupuestos) ? local.presupuestos : [];
        setPresupuestos(unirPresupuestos(listaServidor, listaLocal));
        guardarHojaActual(actualizada);
        setActividades(datos.actividades || '');
        setObservaciones(datos.observaciones_tecnicas || '');
        setHorometro(
          datos.horometro_servicio ??
            (orden.horometro_actual === null || orden.horometro_actual === undefined
              ? ''
              : String(orden.horometro_actual))
        );
        if (datos.resultado) setResultado(datos.resultado);
      } catch (err) {
        if (!activo) return;
        if (err.estado === 404) {
          const local = leerBorrador(idHoja);
          if (local?.pendiente || pendienteLocal) return;
          borrarHojaActual();
          borrarBorrador(idHoja);
          setHoja(null);
        }
      }
    }

    void sincronizar();
    return () => {
      activo = false;
    };
  }, [hoja?.id_hoja, pendienteLocal, orden, token]);
  useEffect(() => {
    if (!orden) return undefined;
    const actualizar = () => {
      const local = leerHoja(orden);
      if (!local) return;
      setHoja(local);
      if (Array.isArray(local.presupuestos)) setPresupuestos(local.presupuestos);
    };
    window.addEventListener('gamma:hoja', actualizar);
    return () => window.removeEventListener('gamma:hoja', actualizar);
  }, [orden]);

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
      const nuevaHoja = {
        ...datos,
        id_asignacion: orden.id_asignacion,
        fecha_inicio: datos.fecha_inicio || new Date().toISOString(),
      };
      setHoja(nuevaHoja);
      setPresupuestos([]);
      guardarHojaActual(nuevaHoja);
      guardarBorrador(nuevaHoja.id_hoja, {
        id_asignacion: orden.id_asignacion,
        estado_servicio: 'EN_EJECUCION',
        estado_envio_erp: 'PENDIENTE',
        fecha_inicio: nuevaHoja.fecha_inicio,
        pendiente: Boolean(datos.pendiente),
        orden,
        respuestas: [],
        consumos: [],
        evidencias: [],
        presupuestos: [],
      });
      void actualizarOrdenEnCache(orden.id_asignacion, {
        id_hoja: nuevaHoja.id_hoja,
        estado: 'EN_EJECUCION',
        estado_servicio: 'EN_EJECUCION',
        estado_envio_erp: 'PENDIENTE',
        fecha_inicio_servicio: nuevaHoja.fecha_inicio,
      });
      setHorometro(
        datos.horometro_servicio ??
          (orden.horometro_actual === null || orden.horometro_actual === undefined
            ? ''
            : String(orden.horometro_actual))
      );
      setMensaje(datos.pendiente ? 'Servicio registrado; se enviará al reconectar.' : 'Servicio iniciado correctamente.');
    } catch (err) {
      if (err.estado === 409 && err.datos?.id_hoja) {
        try {
          const datos = await pedir(`/servicios/${err.datos.id_hoja}`, { token });
          const recuperada = {
            ...datos,
            id_asignacion: orden.id_asignacion,
          };
          setHoja(recuperada);
          setPresupuestos(Array.isArray(datos.presupuestos) ? datos.presupuestos : []);
          guardarHojaActual(recuperada);
          guardarBorrador(recuperada.id_hoja, { ...datos, pendiente: false });
          setMensaje('Se recuperó el servicio que ya estaba en ejecución.');
          return;
        } catch {
          setError(err.message || 'Esta orden ya tiene un servicio en ejecución.');
          return;
        }
      }
      setError(err.message || 'No se pudo iniciar el servicio.');
    } finally {
      setCargando(false);
    }
  }

  async function faltantesFinalizacion() {
    const local = leerBorrador(hoja.id_hoja) || {};
    const usarLocal = Boolean(local.pendiente);
    const respuestas = usarLocal && Array.isArray(local.respuestas)
      ? local.respuestas
      : Array.isArray(hoja.respuestas)
        ? hoja.respuestas
        : [];
    const evidencias = usarLocal && Array.isArray(local.evidencias)
      ? local.evidencias
      : Array.isArray(hoja.evidencias)
        ? hoja.evidencias
        : [];
    const listaPresupuestos = unirPresupuestos(
      presupuestos,
      Array.isArray(local.presupuestos) ? local.presupuestos : []
    );

    const faltantes = [];
    if (!actividades.trim()) faltantes.push('actividades realizadas');
    if (!resultado) faltantes.push('resultado del servicio');

    const plantilla = await pedir(
      `/checklists?tipo_servicio=${encodeURIComponent(orden.tipo_servicio || '')}`,
      { token }
    ).catch(() => null);

    if (!plantilla) {
      faltantes.push('plantilla del checklist disponible');
    } else {
      const resultados = new Map(
        respuestas.map((respuesta) => [Number(respuesta.id_item), respuesta.resultado || ''])
      );
      for (const item of plantilla.items || []) {
        if (item.obligatorio && !String(resultados.get(Number(item.id_item)) || '').trim()) {
          faltantes.push(item.pregunta);
        }
      }
    }

    if (!evidencias.some((evidencia) => evidencia.tipo === 'foto')) {
      faltantes.push('al menos una fotografía');
    }
    if (!evidencias.some((evidencia) => evidencia.tipo === 'firma')) {
      faltantes.push('la firma del cliente');
    }
    const presupuestoRechazado = presupuestoMasReciente(listaPresupuestos);
    if (presupuestoRechazado?.estado === 'RECHAZADO') {
      faltantes.push('crear un nuevo presupuesto o esperar la aprobación');
    }

    return faltantes;
  }

  async function finalizarServicio(evento) {
    evento.preventDefault();
    if (!hoja?.id_hoja) return;

    setError('');
    setMensaje('');
    setCargando(true);

    try {
      const faltantes = await faltantesFinalizacion();
      if (faltantes.length > 0) {
        setError(`No puedes finalizar todavía: ${faltantes.join(', ')}.`);
        return;
      }

      const datos = await pedir(`/servicios/${hoja.id_hoja}/finalizar`, {
        metodo: 'PUT',
        token,
        cuerpo: {
          horometro_servicio: horometro === '' ? null : Number(horometro),
          actividades,
          observaciones_tecnicas: observaciones,
          resultado,
        },
      });
      const finalizada = {
        ...hoja,
        ...datos,
        estado_servicio: 'FINALIZADO',
        fecha_fin: datos.fecha_fin || new Date().toISOString(),
        horometro_servicio:
          datos.horometro_servicio ?? (horometro === '' ? null : Number(horometro)),
        resultado: datos.resultado || resultado,
        pendiente: Boolean(datos.pendiente),
      };
      setHoja(finalizada);
      guardarHojaActual(finalizada);
      guardarBorrador(finalizada.id_hoja, {
        estado_servicio: 'FINALIZADO',
        estado_envio_erp: 'PENDIENTE',
        fecha_fin: finalizada.fecha_fin,
        horometro_servicio: finalizada.horometro_servicio,
        actividades,
        observaciones_tecnicas: observaciones,
        resultado: finalizada.resultado,
        pendiente: Boolean(datos.pendiente),
      });
      void actualizarOrdenEnCache(orden.id_asignacion, {
        estado: presupuestoPendiente ? 'EN_REVISION' : 'FINALIZADO',
        estado_servicio: 'FINALIZADO',
        fecha_fin_servicio: finalizada.fecha_fin,
      });
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
      <section className="tarjeta-pasos">
        <TarjetaCabecera
          paso="Ficha del equipo"
          titulo={orden.equipo || orden.titulo}
          subtitulo={`N° Serie: ${orden.numero_serie || 'No registrada'} · Ficha ${orden.numero_ficha || 'sin número'}`}
          volver="/mis-trabajos"
        />

        <div className="tarjeta-cuerpo">
          <div className="grilla-datos">
            <div className="dato">
              <span>Horómetro actual</span>
              <strong>{numero(orden.horometro_actual, ' hrs')}</strong>
            </div>
            <div className="dato">
              <span>Último mantenimiento</span>
              <strong>{fecha(orden.ultima_mantencion)}</strong>
            </div>
            <div className="dato">
              <span>Ubicación actual</span>
              <strong>{orden.ubicacion || 'No registrada'}</strong>
            </div>
            <div className="dato">
              <span>Estado general</span>
              <strong>{orden.estado_general || 'Sin evaluación'}</strong>
            </div>
          </div>

          <ul className="detalle-lista">
            <li>
              <span>Orden</span>
              <strong>{orden.codigo_orden_erp || `OT-${orden.id_orden}`}</strong>
            </li>
            <li>
              <span>Servicio</span>
              <strong>{orden.titulo}</strong>
            </li>
            <li>
              <span>Tipo</span>
              <strong>{orden.tipo_servicio}</strong>
            </li>
            <li>
              <span>Cliente</span>
              <strong>{orden.cliente || 'No indicado'}</strong>
            </li>
            <li>
              <span>Prioridad</span>
              <strong>{orden.prioridad}</strong>
            </li>
            <li>
              <span>Programada</span>
              <strong>{orden.fecha_programada ? new Date(orden.fecha_programada).toLocaleString('es-CL') : 'Sin fecha'}</strong>
            </li>
            <li>
              <span>Estado del servicio</span>
              <ChipEstado
                estado={
                  hoja
                    ? completado
                      ? 'COMPLETADO'
                      : enRevision
                        ? 'EN_REVISION'
                        : hoja.estado_servicio
                    : orden.estado
                }
              />
            </li>
          </ul>

          {hoja && (
            <div className="resumen-filas" style={{ marginTop: '14px' }}>
              <div className="fila">
                <span>Inicio</span>
                <strong>{fechaHora(hoja.fecha_inicio, 'En curso')}</strong>
              </div>
              <div className="fila">
                <span>Término</span>
                <strong>{fechaHora(hoja.fecha_fin, 'En curso')}</strong>
              </div>
              <div className="fila">
                <span>Horómetro</span>
                <strong>{horometroTexto(hoja, orden)}</strong>
              </div>
              <div className="fila">
                <span>Resultado</span>
                <strong>{etiquetaResultado(hoja.resultado)}</strong>
              </div>
            </div>
          )}

          {presupuestos.length > 0 && (
            <p
              className={
                presupuestoAprobado
                  ? 'mensaje mensaje-ok'
                  : presupuestoPendiente
                    ? 'mensaje mensaje-alerta'
                    : 'mensaje mensaje-error'
              }
            >
              {presupuestoAprobado
                ? 'Presupuesto aprobado por la oficina. Servicio completado.'
                : presupuestoPendiente
                  ? enRevision
                    ? 'Servicio en revisión. Esperando la aprobación del presupuesto por la oficina.'
                    : 'Presupuesto pendiente. Puedes finalizar; al reconectar quedará en revisión hasta que la oficina lo apruebe.'
                  : 'Presupuesto rechazado. Crea uno nuevo desde Presupuesto antes de finalizar.'}
            </p>
          )}

          {hoja?.pendiente && (
            <p className="mensaje mensaje-alerta">Cambios pendientes de sincronización.</p>
          )}
        </div>
      </section>

      {mensaje && <p className="mensaje mensaje-ok" role="status">{mensaje}</p>}
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

      {!hoja && (
        <button type="button" className="boton" onClick={iniciarServicio} disabled={cargando}>
          <Icono nombre="check" tamano={18} />
          {cargando ? 'Iniciando...' : 'Iniciar servicio'}
        </button>
      )}

      {hoja && !completado && (
        <>
          <div className="seccion-titulo">
            <Icono nombre="checklist" tamano={20} />
            Registro del servicio
          </div>

          <div className="botonera">
            <button type="button" className="boton" onClick={() => navigate('/checklist-insumos')}>
              Checklist
            </button>
            <button type="button" className="boton boton-claro" onClick={() => navigate('/materiales')}>
              Materiales
            </button>
            <button type="button" className="boton boton-claro" onClick={() => navigate('/presupuesto')}>
              Presupuesto
            </button>
            <button type="button" className="boton boton-claro" onClick={() => navigate('/evidencias-firma')}>
              Fotos y firma
            </button>
          </div>

          {hoja.estado_servicio !== 'FINALIZADO' && (
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

              {requiereAprobacion && (
                <p className="mensaje mensaje-alerta" style={{ marginBottom: 0 }}>
                  El presupuesto fue rechazado. Crea uno nuevo o espera la aprobación de la oficina.
                </p>
              )}

              <button type="submit" className="boton" disabled={cargando || requiereAprobacion}>
                {cargando ? 'Finalizando...' : 'Finalizar servicio'}
              </button>
            </form>
          )}
        </>
      )}

      {hoja && hoja.estado_servicio === 'FINALIZADO' && !completado && (
        <button type="button" className="boton boton-verde" onClick={() => navigate('/resumen')}>
          <Icono nombre="flecha-derecha" tamano={18} />
          Ir a resumen y envío
        </button>
      )}

      {enRevision && (
        <p className="mensaje mensaje-alerta" role="status">
          Servicio finalizado y en revisión. Se completará cuando la oficina apruebe el presupuesto.
        </p>
      )}

      {completado && (
        <p className="mensaje mensaje-ok" role="status">
          {enviado
            ? 'Servicio completado y enviado al ERP.'
            : 'Servicio completado con presupuesto aprobado.'}
        </p>
      )}

      <button
        type="button"
        className="boton boton-claro"
        onClick={() => navigate('/mis-trabajos')}
      >
        Volver a mis trabajos
      </button>
    </main>
  );
}
