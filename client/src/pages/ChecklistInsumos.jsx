// Desarrollado por: Aaron Ponse

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }
    if (!hoja?.id_hoja) return undefined;

    let activo = true;
    const parametros = new URLSearchParams({ id_hoja: hoja.id_hoja });

    pedir(`/checklists?${parametros.toString()}`, { token })
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
  }, [token, hoja?.id_hoja, navigate]);

  function cambiarResultado(idItem, valor) {
    setMensaje('');
    setError('');
    setRespuestas((previo) => ({
      ...previo,
      [idItem]: {
        id_item: idItem,
        resultado: valor,
        observacion: previo[idItem]?.observacion || '',
      },
    }));
  }

  function cambiarObservacion(idItem, texto) {
    setMensaje('');
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
