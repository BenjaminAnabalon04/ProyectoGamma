// Desarrollado por: Aaron Ponse

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';
import Icono from '../components/Icono';
import TarjetaCabecera from '../components/TarjetaCabecera';

function leerLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || 'null');
  } catch {
    return null;
  }
}

export default function Materiales() {
  const navigate = useNavigate();
  const token = obtenerToken();
  const [orden] = useState(() => leerLocal('orden_actual'));
  const [hoja] = useState(() => leerLocal('hoja_actual'));
  const [materiales, setMateriales] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [consulta, setConsulta] = useState('');
  const [idMaterial, setIdMaterial] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [cargando, setCargando] = useState(Boolean(hoja?.id_hoja));
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
    Promise.all([
      pedir(`/materiales/consumos/${hoja.id_hoja}`, { token }),
      pedir('/materiales', { token }),
    ])
      .then(([datosConsumos, datosMateriales]) => {
        if (!activo) return;
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
        setError(err.message || 'No se pudieron cargar los materiales.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token, hoja?.id_hoja, navigate]);

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
      <section className="tarjeta-pasos">
        <TarjetaCabecera
          paso="Materiales del servicio"
          titulo="Materiales y repuestos"
          subtitulo={orden ? `Orden ${orden.codigo_orden_erp || orden.id_orden} · ${orden.equipo || orden.titulo}` : undefined}
          volver="/orden"
        />

        <div className="tarjeta-cuerpo">
          {!hoja?.id_hoja && (
            <>
              <p className="mensaje mensaje-alerta">
                Primero inicia el servicio en la ficha de la orden para registrar materiales.
              </p>
              <button type="button" className="boton" onClick={() => navigate('/orden')}>
                Ir a la ficha de la orden
              </button>
            </>
          )}

          {cargando && <p className="vacio">Cargando materiales y consumos...</p>}
          {mensaje && <p className="mensaje mensaje-ok" role="status">{mensaje}</p>}
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

          {hoja?.id_hoja && (
            <>
              <form onSubmit={registrarConsumo} className="tarjeta">
                <div className="seccion-titulo" style={{ marginTop: 0 }}>
                  <Icono nombre="caja" tamano={20} />
                  Agregar material
                </div>

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

                <div className="fila-material">
                  <div>
                    <label htmlFor="id-material" className="etiqueta">Material</label>
                    <select
                      id="id-material"
                      value={idMaterial}
                      onChange={(evento) => setIdMaterial(evento.target.value)}
                      required
                    >
                      <option value="">Selecciona</option>
                      {materialesVisibles.map((item) => (
                        <option key={item.id_material} value={item.id_material}>
                          {item.nombre} · {item.unidad_medida}
                          {item.stock_referencial !== undefined ? ` · Stock ${item.stock_referencial}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
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

                  <button
                    type="submit"
                    className="boton boton-ambar"
                    disabled={agregando || materialesVisibles.length === 0}
                    aria-label="Agregar consumo"
                    title="Agregar consumo"
                  >
                    <Icono nombre="mas" tamano={22} />
                  </button>
                </div>
              </form>

              <div className="seccion-titulo">
                <Icono nombre="check" tamano={20} />
                Registrados en este servicio
              </div>

              {consumos.length === 0 ? (
                <p className="vacio">No hay materiales registrados en este servicio.</p>
              ) : (
                <ul className="consumos">
                  {consumos.map((consumo) => (
                    <li key={consumo.id_consumo}>
                      <span>{consumo.nombre}</span>
                      <span className="cantidad">
                        {Number(consumo.cantidad)} {consumo.unidad_medida || ''}
                      </span>
                      <span className={consumo.pendiente ? 'pildora pildora-proceso' : 'pildora pildora-ok'}>
                        {consumo.pendiente ? 'Por enviar' : 'Registrado'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      {hoja?.id_hoja && (
        <button type="button" className="boton" onClick={() => navigate('/presupuesto')}>
          Continuar a Presupuesto
          <Icono nombre="flecha-derecha" tamano={18} />
        </button>
      )}

      <button type="button" className="boton boton-claro" onClick={() => navigate('/orden')}>
        Volver a la ficha de la orden
      </button>
    </main>
  );
}
