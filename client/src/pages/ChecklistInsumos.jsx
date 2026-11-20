import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedir } from '../api/api';

const OPCIONES_RESULTADO = [
  { valor: 'OK', etiqueta: 'OK / Conforme' },
  { valor: 'OBS', etiqueta: 'Observación' },
  { valor: 'FALLA', etiqueta: 'Falla / No conforme' },
  { valor: 'NA', etiqueta: 'No aplica' },
];

export default function ChecklistInsumos() {
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const orden = JSON.parse(localStorage.getItem('orden_actual') || 'null');
  const hoja = JSON.parse(localStorage.getItem('hoja_actual') || 'null');

  const [plantilla, setPlantilla] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    async function cargarChecklist() {
      setCargando(true);
      setError('');

      try {
        const params = new URLSearchParams();
        if (hoja?.id_hoja) params.set('id_hoja', hoja.id_hoja);
        if (orden?.tipo_servicio) params.set('tipo_servicio', orden.tipo_servicio);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        const endpoint = queryString ? `/checklists${queryString}` : '/checklists/1';

        const datos = await pedir(endpoint, { token });
        setPlantilla(datos);

        const mapaInicial = {};
        (datos.items || []).forEach((item) => {
          mapaInicial[item.id_item] = {
            id_item: item.id_item,
            resultado: '',
            observacion: '',
          };
        });

        (datos.respuestas || []).forEach((rp) => {
          mapaInicial[rp.id_item] = {
            id_item: rp.id_item,
            resultado: rp.resultado || '',
            observacion: rp.observacion || '',
          };
        });

        setRespuestas(mapaInicial);
      } catch (err) {
        if (err.estado === 401 || err.estado === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          navigate('/login');
          return;
        }
        setError(err.message || 'No se pudo cargar el checklist.');
      } finally {
        setCargando(false);
      }
    }

    cargarChecklist();
  }, [token, navigate, hoja?.id_hoja, orden?.tipo_servicio]);

  function cambiarResultado(idItem, valor) {
    setMensaje('');
    setError('');
    setRespuestas((prev) => ({
      ...prev,
      [idItem]: {
        id_item: idItem,
        resultado: valor,
        observacion: prev[idItem]?.observacion || '',
      },
    }));
  }

  function cambiarObservacion(idItem, texto) {
    setMensaje('');
    setRespuestas((prev) => ({
      ...prev,
      [idItem]: {
        id_item: idItem,
        resultado: prev[idItem]?.resultado || '',
        observacion: texto,
      },
    }));
  }

  function validarObligatorios() {
    if (!plantilla?.items) return [];
    return plantilla.items.filter(
      (item) => item.obligatorio && !(respuestas[item.id_item]?.resultado || '').trim()
    );
  }

  async function guardarPasoAPaso(e) {
    e.preventDefault();
    setMensaje('');
    setError('');

    const faltantes = validarObligatorios();
    if (faltantes.length > 0) {
      setError(
        `Faltan responder ${faltantes.length} ítem(s) obligatorio(s) antes de guardar/continuar.`
      );
      return;
    }

    if (!hoja?.id_hoja) {
      setError(
        'No hay una hoja de servicio activa (id_hoja). Primero inicia el servicio en "Detalle de la orden".'
      );
      return;
    }

    setGuardando(true);
    try {
      const listaRespuestas = (plantilla?.items || []).map((item) => ({
        id_item: item.id_item,
        resultado: respuestas[item.id_item]?.resultado || '',
        observacion: respuestas[item.id_item]?.observacion || '',
      }));

      const res = await pedir(`/checklists/respuestas/${hoja.id_hoja}`, {
        metodo: 'PUT',
        token,
        cuerpo: { respuestas: listaRespuestas },
      });

      setMensaje(`Respuestas guardadas (${res.guardadas ?? listaRespuestas.length}).`);
    } catch (err) {
      setError(err.message || 'No se pudieron guardar las respuestas.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="pantalla">
      <h1>Checklist del servicio (HU-04)</h1>

      {orden && (
        <p>
          Orden: <strong>{orden.codigo_orden_erp}</strong> — Tipo:{' '}
          <strong>{orden.tipo_servicio}</strong>
        </p>
      )}

      {plantilla && (
        <p>
          Plantilla: <strong>{plantilla.nombre}</strong> (v{plantilla.version})
        </p>
      )}

      {cargando && <p>Cargando ítems del checklist...</p>}

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

      {!cargando && plantilla && (
        <form onSubmit={guardarPasoAPaso}>
          <ol className="lista-pantallas">
            {(plantilla.items || []).map((item) => {
              const actual = respuestas[item.id_item] || { resultado: '', observacion: '' };
              return (
                <li key={item.id_item}>
                  <p>
                    <strong>{item.pregunta}</strong>{' '}
                    <span className="etiqueta">
                      {item.obligatorio ? 'Obligatorio' : 'Opcional'}
                    </span>
                  </p>

                  <div style={{ marginBottom: '8px' }}>
                    <label htmlFor={`res-${item.id_item}`} className="etiqueta">
                      Estado / Resultado
                    </label>
                    <select
                      id={`res-${item.id_item}`}
                      value={actual.resultado}
                      onChange={(e) => cambiarResultado(item.id_item, e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '48px',
                        padding: '10px',
                        fontSize: '16px',
                        marginTop: '4px',
                      }}
                    >
                      <option value="">-- Selecciona --</option>
                      {OPCIONES_RESULTADO.map((op) => (
                        <option key={op.valor} value={op.valor}>
                          {op.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`obs-${item.id_item}`} className="etiqueta">
                      Observación (opcional)
                    </label>
                    <input
                      id={`obs-${item.id_item}`}
                      type="text"
                      value={actual.observacion}
                      onChange={(e) => cambiarObservacion(item.id_item, e.target.value)}
                      placeholder="Ej. Sin fugas, nivel ok..."
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '8px 10px',
                        fontSize: '16px',
                        marginTop: '4px',
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>

          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar checklist'}
          </button>
        </form>
      )}

      <button
        type="button"
        className="boton"
        onClick={() => navigate('/orden')}
      >
        Volver al detalle de la orden
      </button>
    </main>
  );
}