// Desarrollado por: Aaron Ponse

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';

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
  const [materiales, setMateriales] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [consulta, setConsulta] = useState('');
  const [idMaterial, setIdMaterial] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [cargando, setCargando] = useState(Boolean(hoja?.id_hoja));
  const [guardando, setGuardando] = useState(false);
  const [agregando, setAgregando] = useState(false);
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
      pedir(`/checklists?${parametros.toString()}`, { token }),
      pedir(`/materiales/consumos/${hoja.id_hoja}`, { token }),
      pedir('/materiales', { token }),
    ])
      .then(([datosChecklist, datosConsumos, datosMateriales]) => {
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
        setConsumos(Array.isArray(datosConsumos) ? datosConsumos : []);
        setMateriales(Array.isArray(datosMateriales) ? datosMateriales : []);
      })
      .catch((err) => {
        if (!activo) return;
        if (err.estado === 401 || err.estado === 403) {
          cerrarSesion();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'No se pudo cargar el checklist o los materiales.');
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

  async function registrarConsumo(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    const materialSeleccionado = materiales.find((item) => item.id_material === Number(idMaterial));
    const valor = Number(cantidad);

    if (!materialSeleccionado) {
      setError('Selecciona un material de la lista.');
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      setError('La cantidad debe ser mayor que 0.');
      return;
    }
    if (!hoja?.id_hoja) return;

    const idConsumo = crypto.randomUUID();
    setAgregando(true);
    try {
      const respuesta = await pedir('/materiales/consumos', {
        metodo: 'POST',
        token,
        cuerpo: {
          id_hoja: hoja.id_hoja,
          id_consumo: idConsumo,
          id_material: materialSeleccionado.id_material,
          cantidad: valor,
        },
      });

      if (respuesta.pendiente) {
        setConsumos((previo) => [
          ...previo,
          {
            id_consumo: idConsumo,
            id_material: materialSeleccionado.id_material,
            nombre: materialSeleccionado.nombre,
            unidad_medida: materialSeleccionado.unidad_medida,
            cantidad: valor,
            fecha_registro: new Date().toISOString(),
            pendiente: true,
          },
        ]);
        setMensaje('Consumo guardado en el equipo. Se enviará al reconectar.');
      } else {
        const actualizados = await pedir(`/materiales/consumos/${hoja.id_hoja}`, { token });
        setConsumos(Array.isArray(actualizados) ? actualizados : []);
        setMensaje('Consumo registrado correctamente.');
      }

      setIdMaterial('');
      setCantidad('1');
      setConsulta('');
    } catch (err) {
      setError(err.message || 'No se pudo registrar el consumo.');
    } finally {
      setAgregando(false);
    }
  }

  const textoConsulta = consulta.trim().toLowerCase();
  const materialesVisibles = materiales.filter((item) =>
    `${item.nombre} ${item.codigo_material_erp || ''}`.toLowerCase().includes(textoConsulta)
  );

  return (
    <main className="pantalla">
      <h1>Checklist y materiales</h1>

      {orden && (
        <p>
          Orden: <strong>{orden.codigo_orden_erp}</strong> · Tipo:{' '}
          <strong>{orden.tipo_servicio}</strong>
        </p>
      )}
      {plantilla && (
        <p>
          Plantilla: <strong>{plantilla.nombre}</strong> (v{plantilla.version})
        </p>
      )}

      {!hoja?.id_hoja && (
        <div className="tarjeta">
          <p className="alerta">
            Primero inicia el servicio en el detalle de la orden para poder registrar datos.
          </p>
          <button type="button" className="boton" onClick={() => navigate('/orden')}>
            Ir al detalle de la orden
          </button>
        </div>
      )}

      {cargando && <p>Cargando checklist, materiales y consumos...</p>}
      {mensaje && <p className="ok" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {!cargando && plantilla && hoja?.id_hoja && (
        <form onSubmit={guardarChecklist}>
          <h2>Ítems del checklist</h2>
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

                  <div className="campo">
                    <label htmlFor={`res-${item.id_item}`} className="etiqueta">
                      Resultado
                    </label>
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
                  </div>

                  <div className="campo">
                    <label htmlFor={`obs-${item.id_item}`} className="etiqueta">
                      Observación
                    </label>
                    <input
                      id={`obs-${item.id_item}`}
                      type="text"
                      value={actual.observacion}
                      onChange={(evento) => cambiarObservacion(item.id_item, evento.target.value)}
                      placeholder="Detalle opcional"
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

      {hoja?.id_hoja && (
        <>
          <h2>Materiales consumidos</h2>

          <form onSubmit={registrarConsumo} className="tarjeta">
            <div className="campo">
              <label htmlFor="buscar-material" className="etiqueta">Buscar material</label>
              <input
                id="buscar-material"
                type="text"
                value={consulta}
                onChange={(evento) => setConsulta(evento.target.value)}
                placeholder="Nombre o código ERP"
              />
            </div>

            <div className="campo">
              <label htmlFor="id-material" className="etiqueta">Material</label>
              <select
                id="id-material"
                value={idMaterial}
                onChange={(evento) => setIdMaterial(evento.target.value)}
                required
              >
                <option value="">Selecciona un material</option>
                {materialesVisibles.map((item) => (
                  <option key={item.id_material} value={item.id_material}>
                    {item.nombre} · {item.unidad_medida}
                    {item.stock_referencial !== undefined ? ` · Stock ${item.stock_referencial}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="cantidad-material" className="etiqueta">Cantidad</label>
              <input
                id="cantidad-material"
                type="number"
                min="0.01"
                step="0.01"
                value={cantidad}
                onChange={(evento) => setCantidad(evento.target.value)}
                required
              />
            </div>

            <button type="submit" className="boton" disabled={agregando || materialesVisibles.length === 0}>
              {agregando ? 'Agregando...' : 'Agregar consumo'}
            </button>
          </form>

          {consumos.length === 0 ? (
            <p>No hay materiales registrados en este servicio.</p>
          ) : (
            <div className="contenedor-tabla">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {consumos.map((consumo) => (
                    <tr key={consumo.id_consumo}>
                      <td>{consumo.nombre}</td>
                      <td>{Number(consumo.cantidad)} {consumo.unidad_medida || ''}</td>
                      <td>{consumo.pendiente ? <span className="alerta">Por enviar</span> : 'Registrado'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <button type="button" className="boton boton-secundario" onClick={() => navigate('/orden')}>
        Volver al detalle de la orden
      </button>
    </main>
  );
}
