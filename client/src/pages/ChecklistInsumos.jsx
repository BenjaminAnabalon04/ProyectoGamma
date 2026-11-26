// Desarrollado por: Aaron Ponse

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';
import { guardarBorrador, leerBorrador } from '../api/borrador';
import Icono from '../components/Icono';
import TarjetaCabecera from '../components/TarjetaCabecera';

const OPCIONES_RESULTADO = [
  { valor: 'OK', etiqueta: 'OK / Conforme' },
  { valor: 'OBS', etiqueta: 'Observación' },
  { valor: 'FALLA', etiqueta: 'Falla / No conforme' },
  { valor: 'NA', etiqueta: 'No aplica' },
];

function leerLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || 'null');
  } catch {
    return null;
  }
}

export default function ChecklistInsumos() {
  const navigate = useNavigate();
  const token = obtenerToken();
  const [orden] = useState(() => leerLocal('orden_actual'));
  const [hoja] = useState(() => leerLocal('hoja_actual'));
  const [plantilla, setPlantilla] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(Boolean(hoja?.id_hoja));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mensajeAuto, setMensajeAuto] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }
    if (!hoja?.id_hoja) return undefined;

    let activo = true;
    const parametros = new URLSearchParams({ id_hoja: hoja.id_hoja });

    async function cargarPlantilla() {
      try {
        return await pedir(`/checklists?${parametros.toString()}`, { token });
      } catch (err) {
        if (err.estado === 0 && orden?.tipo_servicio) {
          const respaldo = `tipo_servicio=${encodeURIComponent(orden.tipo_servicio)}`;
          return pedir(`/checklists?${respaldo}`, { token });
        }
        throw err;
      }
    }

    cargarPlantilla()
      .then((datosChecklist) => {
        if (!activo) return;
        setPlantilla(datosChecklist);

        const mapa = {};
        (datosChecklist.items || []).forEach((item) => {
          mapa[item.id_item] = {
            id_item: item.id_item,
            resultado: '',
            observacion: '',
          };
        });
        (datosChecklist.respuestas || []).forEach((respuesta) => {
          mapa[respuesta.id_item] = {
            id_item: respuesta.id_item,
            resultado: respuesta.resultado || '',
            observacion: respuesta.observacion || '',
          };
        });
        const local = leerBorrador(hoja.id_hoja);
        if (local?.pendiente) {
          (local.respuestas || []).forEach((respuesta) => {
            mapa[respuesta.id_item] = {
              id_item: respuesta.id_item,
              resultado: respuesta.resultado || '',
              observacion: respuesta.observacion || '',
            };
          });
        }
        setRespuestas(mapa);
      })
      .catch((err) => {
        if (!activo) return;
        if (err.estado === 401 || err.estado === 403) {
          cerrarSesion();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'No se pudo cargar el checklist.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token, hoja?.id_hoja, navigate, orden?.tipo_servicio]);

  async function guardarRespuesta(idItem, resultado, observacion) {
    if (!hoja?.id_hoja) return;

    setMensajeAuto('');
    setGuardando(true);
    try {
      const respuesta = await pedir(`/checklists/respuestas/${hoja.id_hoja}`, {
        metodo: 'PUT',
        token,
        cuerpo: {
          respuestas: [{ id_item: idItem, resultado, observacion }],
        },
      });
      setMensajeAuto(
        respuesta.pendiente
          ? 'Guardado en el equipo. Se enviará al reconectar.'
          : 'Guardado automáticamente.'
      );
      const lista = Object.values({
        ...respuestas,
        [idItem]: { id_item: idItem, resultado, observacion },
      }).map((item) => ({
        id_item: item.id_item,
        resultado: item.resultado || '',
        observacion: item.observacion || '',
      }));
      guardarBorrador(hoja.id_hoja, {
        respuestas: lista,
        pendiente: Boolean(respuesta.pendiente),
      });
    } catch (err) {
      setError(err.message || 'No se pudo guardar esta respuesta.');
    } finally {
      setGuardando(false);
    }
  }

  function cambiarResultado(idItem, valor) {
    setMensaje('');
    setMensajeAuto('');
    setError('');
    setRespuestas((previo) => ({
      ...previo,
      [idItem]: {
        id_item: idItem,
        resultado: valor,
        observacion: previo[idItem]?.observacion || '',
      },
    }));
    void guardarRespuesta(idItem, valor, respuestas[idItem]?.observacion || '');
  }

  function cambiarObservacion(idItem, texto) {
    setMensaje('');
    setMensajeAuto('');
    setError('');
    setRespuestas((previo) => ({
      ...previo,
      [idItem]: {
        id_item: idItem,
        resultado: previo[idItem]?.resultado || '',
        observacion: texto,
      },
    }));
  }

  async function guardarChecklist(evento) {
    evento.preventDefault();
    setMensaje('');
    setMensajeAuto('');
    setError('');

    const faltantes = (plantilla?.items || []).filter(
      (item) => item.obligatorio && !(respuestas[item.id_item]?.resultado || '').trim()
    );
    if (faltantes.length > 0) {
      setError(`Faltan ${faltantes.length} ítem(s) obligatorio(s): ${faltantes.map((item) => item.pregunta).join(', ')}`);
      return;
    }
    if (!hoja?.id_hoja) return;

    setGuardando(true);
    try {
      const lista = (plantilla?.items || []).map((item) => ({
        id_item: item.id_item,
        resultado: respuestas[item.id_item]?.resultado || '',
        observacion: respuestas[item.id_item]?.observacion || '',
      }));
      const respuesta = await pedir(`/checklists/respuestas/${hoja.id_hoja}`, {
        metodo: 'PUT',
        token,
        cuerpo: { respuestas: lista },
      });
      setMensaje(
        respuesta.pendiente
          ? 'Checklist guardado en el equipo. Se enviará al reconectar.'
          : `Checklist guardado (${respuesta.guardadas ?? lista.length} respuestas).`
      );
      guardarBorrador(hoja.id_hoja, {
        respuestas: lista,
        pendiente: Boolean(respuesta.pendiente),
      });
    } catch (err) {
      setError(err.message || 'No se pudieron guardar las respuestas.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="pantalla">
      <section className="tarjeta-pasos">
        <TarjetaCabecera
          paso="Checklist del servicio"
          titulo="Puntos de inspección"
          subtitulo={orden ? `Orden ${orden.codigo_orden_erp || orden.id_orden} · ${orden.tipo_servicio}` : undefined}
          volver="/orden"
        />

        <div className="tarjeta-cuerpo">
          {plantilla && (
            <p className="micro">
              Plantilla {plantilla.nombre} · versión {plantilla.version}
            </p>
          )}
          {guardando && <p className="micro">Guardando...</p>}
          {!guardando && mensajeAuto && (
            <p className="micro ok" role="status" aria-live="polite">
              {mensajeAuto}
            </p>
          )}

          {!hoja?.id_hoja && (
            <>
              <p className="mensaje mensaje-alerta">
                Primero inicia el servicio en la ficha de la orden para poder registrar datos.
              </p>
              <button type="button" className="boton" onClick={() => navigate('/orden')}>
                Ir a la ficha de la orden
              </button>
            </>
          )}

          {cargando && <p className="vacio">Cargando checklist...</p>}
          {mensaje && <p className="mensaje mensaje-ok" role="status">{mensaje}</p>}
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

          {!cargando && plantilla && hoja?.id_hoja && (
            <form onSubmit={guardarChecklist}>
              <div className="seccion-titulo">
                <Icono nombre="checklist" tamano={20} />
                Puntos de inspección técnica
              </div>

              <ol className="lista-chequeo">
                {(plantilla.items || []).map((item) => {
                  const actual = respuestas[item.id_item] || { resultado: '', observacion: '' };
                  return (
                    <li key={item.id_item} className="chequeo">
                      <div className="chequeo-titulo">
                        <span>{item.pregunta}</span>
                        <span className={item.obligatorio ? 'pildora pildora-proceso' : 'pildora pildora-pendiente'}>
                          {item.obligatorio ? 'Obligatorio' : 'Opcional'}
                        </span>
                      </div>
                      <label htmlFor={`res-${item.id_item}`} className="etiqueta">Resultado</label>
                      <select
                        id={`res-${item.id_item}`}
                        value={actual.resultado}
                        onChange={(evento) => cambiarResultado(item.id_item, evento.target.value)}
                      >
                        <option value="">Selecciona una opción</option>
                        {OPCIONES_RESULTADO.map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>
                            {opcion.etiqueta}
                          </option>
                        ))}
                      </select>
                      <input
                        id={`obs-${item.id_item}`}
                        type="text"
                        value={actual.observacion}
                        onChange={(evento) => cambiarObservacion(item.id_item, evento.target.value)}
                        onBlur={(evento) =>
                          void guardarRespuesta(
                            item.id_item,
                            actual.resultado || '',
                            evento.target.value
                          )
                        }
                        placeholder="Observación (opcional)"
                        aria-label={`Observación de ${item.pregunta}`}
                      />
                    </li>
                  );
                })}
              </ol>

              <button type="submit" className="boton" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar checklist'}
              </button>
            </form>
          )}
        </div>
      </section>

      {hoja?.id_hoja && (
        <button type="button" className="boton" onClick={() => navigate('/materiales')}>
          Continuar a Materiales
          <Icono nombre="flecha-derecha" tamano={18} />
        </button>
      )}

      <button type="button" className="boton boton-claro" onClick={() => navigate('/orden')}>
        Volver a la ficha de la orden
      </button>
    </main>
  );
}
