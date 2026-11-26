// Desarrollado por: Aaron Ponse

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';
import { guardarBorrador, leerBorrador } from '../api/borrador';
import ImagenEvidencia from '../components/ImagenEvidencia';
import Icono from '../components/Icono';
import TarjetaCabecera from '../components/TarjetaCabecera';
import { rutValido } from '../utils/rut';

const FORMATOS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const PESO_MAXIMO = 1024 * 1024;
const LADO_MAXIMO = 1280;

function leerLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || 'null');
  } catch {
    return null;
  }
}

function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };
    imagen.src = url;
  });
}

async function comprimirFoto(archivo) {
  const imagen = await cargarImagen(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, Math.round(imagen.width * escala));
  lienzo.height = Math.max(1, Math.round(imagen.height * escala));

  const contexto = lienzo.getContext('2d');
  contexto.fillStyle = '#ffffff';
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);
  contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

  let calidad = 0.8;
  let dataUrl = lienzo.toDataURL('image/jpeg', calidad);
  while (dataUrl.length * 0.75 > PESO_MAXIMO && calidad > 0.35) {
    calidad = Number((calidad - 0.1).toFixed(2));
    dataUrl = lienzo.toDataURL('image/jpeg', calidad);
  }
  return { dataUrl, formato: 'jpg' };
}

function fechaCorta(valor) {
  if (!valor) return 'Sin fecha';
  return new Date(valor).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EvidenciasFirma() {
  const navigate = useNavigate();
  const token = obtenerToken();
  const [orden] = useState(() => leerLocal('orden_actual'));
  const [hoja] = useState(() => leerLocal('hoja_actual'));
  const [evidencias, setEvidencias] = useState([]);
  const [resumenServicio, setResumenServicio] = useState(null);
  const [nombreFirmante, setNombreFirmante] = useState('');
  const [rutFirmante, setRutFirmante] = useState('');
  const [coordenadas, setCoordenadas] = useState(null);
  const [cargando, setCargando] = useState(Boolean(hoja?.id_hoja));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const lienzoRef = useRef(null);
  const dibujandoRef = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }
    if (!hoja?.id_hoja) return undefined;

    let activo = true;
    Promise.allSettled([
      pedir(`/evidencias/${hoja.id_hoja}`, { token }),
      pedir(`/servicios/${hoja.id_hoja}`, { token }),
    ])
      .then(([resEvidencias, resServicio]) => {
        if (!activo) return;

        const fallo = [resEvidencias, resServicio].find((res) => res.status === 'rejected');
        if (fallo && (fallo.reason?.estado === 401 || fallo.reason?.estado === 403)) {
          cerrarSesion();
          navigate('/login', { replace: true });
          return;
        }

        if (resEvidencias.status === 'fulfilled') {
          const servidor = Array.isArray(resEvidencias.value) ? resEvidencias.value : [];
          const local = leerBorrador(hoja.id_hoja);
          const locales = Array.isArray(local?.evidencias) ? local.evidencias : [];
          const ids = new Set(servidor.map((item) => item.id_evidencia));
          setEvidencias([
            ...servidor,
            ...locales.filter((item) => !ids.has(item.id_evidencia)),
          ]);
        }
        if (resServicio.status === 'fulfilled') {
          setResumenServicio(resServicio.value);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token, hoja?.id_hoja, navigate]);

  useEffect(() => {
    if (!hoja?.id_hoja || !navigator.geolocation) return undefined;

    let activo = true;
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        if (!activo) return;
        setCoordenadas({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );

    return () => {
      activo = false;
    };
  }, [hoja?.id_hoja]);

  function puntoDelTrazo(evento) {
    const lienzo = lienzoRef.current;
    const rectangulo = lienzo.getBoundingClientRect();
    return {
      x: (evento.clientX - rectangulo.left) * (lienzo.width / rectangulo.width),
      y: (evento.clientY - rectangulo.top) * (lienzo.height / rectangulo.height),
    };
  }

  function iniciarTrazo(evento) {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    evento.preventDefault();
    const contexto = lienzo.getContext('2d');
    const punto = puntoDelTrazo(evento);
    contexto.lineWidth = 3;
    contexto.lineCap = 'round';
    contexto.lineJoin = 'round';
    contexto.strokeStyle = '#123762';
    contexto.beginPath();
    contexto.moveTo(punto.x, punto.y);
    dibujandoRef.current = true;
  }

  function continuarTrazo(evento) {
    if (!dibujandoRef.current || !lienzoRef.current) return;
    evento.preventDefault();
    const contexto = lienzoRef.current.getContext('2d');
    const punto = puntoDelTrazo(evento);
    contexto.lineTo(punto.x, punto.y);
    contexto.stroke();
  }

  function terminarTrazo() {
    dibujandoRef.current = false;
  }

  function limpiarFirma() {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    lienzo.getContext('2d').clearRect(0, 0, lienzo.width, lienzo.height);
  }

  function obtenerUbicacion() {
    if (!navigator.geolocation) {
      setError('Este dispositivo no permite obtener la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setCoordenadas({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
        });
        setError('');
      },
      () => setError('No se pudo obtener la ubicación. Puedes continuar sin ella.'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function guardarEvidencia(cuerpo) {
    if (!hoja?.id_hoja) return false;
    const { archivo, ...detalles } = cuerpo;
    const idEvidencia = crypto.randomUUID();
    const fechaCaptura = new Date().toISOString();

    setGuardando(true);
    setMensaje('');
    setError('');

    try {
      const respuesta = await pedir('/evidencias', {
        metodo: 'POST',
        token,
        cuerpo: {
          id_hoja: hoja.id_hoja,
          id_evidencia: idEvidencia,
          archivo,
          fecha_captura: fechaCaptura,
          latitud: coordenadas?.latitud ?? null,
          longitud: coordenadas?.longitud ?? null,
          ...detalles,
        },
      });

      setEvidencias((previo) => [
        ...previo,
        {
          id_evidencia: respuesta.id_evidencia || idEvidencia,
          id_hoja: hoja.id_hoja,
          ...detalles,
          latitud: coordenadas?.latitud ?? null,
          longitud: coordenadas?.longitud ?? null,
          dataUrl: archivo,
          sha256: respuesta.sha256 ?? null,
          fecha_captura: fechaCaptura,
          url: respuesta.url ?? null,
          pendiente: Boolean(respuesta.pendiente),
        },
      ]);
      const local = leerBorrador(hoja.id_hoja);
      const previas = Array.isArray(local?.evidencias) ? local.evidencias : [];
      guardarBorrador(hoja.id_hoja, {
        evidencias: [
          ...previas.filter((item) => item.id_evidencia !== idEvidencia),
          {
            id_evidencia: respuesta.id_evidencia || idEvidencia,
            tipo: detalles.tipo,
            fecha_captura: fechaCaptura,
            latitud: coordenadas?.latitud ?? null,
            longitud: coordenadas?.longitud ?? null,
            nombre_firmante: detalles.nombre_firmante || null,
            rut_firmante: detalles.rut_firmante || null,
            pendiente: Boolean(respuesta.pendiente),
          },
        ],
        pendiente: Boolean(respuesta.pendiente),
      });
      setMensaje(
        respuesta.pendiente
          ? 'Evidencia guardada en el equipo. Se enviará al reconectar.'
          : 'Evidencia guardada correctamente.'
      );
      return true;
    } catch (err) {
      setError(err.message || 'No se pudo guardar la evidencia.');
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function subirFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    if (!FORMATOS[archivo.type]) {
      setError('Formato no admitido. Usa JPG, PNG o WEBP.');
      return;
    }

    try {
      const { dataUrl, formato } = await comprimirFoto(archivo);
      if (dataUrl.length * 0.75 > PESO_MAXIMO) {
        setError('La foto sigue siendo muy grande después de comprimirla. Intenta con otra.');
        return;
      }
      await guardarEvidencia({ tipo: 'foto', archivo: dataUrl, formato });
    } catch (err) {
      setError(err.message || 'No se pudo preparar la foto.');
    }
  }

  async function guardarFirma(evento) {
    evento.preventDefault();
    const lienzo = lienzoRef.current;
    if (!lienzo) return;

    if (!nombreFirmante.trim() || !rutFirmante.trim()) {
      setError('La firma necesita el nombre y el RUT de quien firma.');
      return;
    }

    if (!rutValido(rutFirmante)) {
      setError('El RUT ingresado no es válido. Revisa el dígito verificador.');
      return;
    }

    const contexto = lienzo.getContext('2d');
    const pixeles = contexto.getImageData(0, 0, lienzo.width, lienzo.height).data;
    const hayTrazo = pixeles.some((valor, indice) => indice % 4 === 3 && valor > 0);
    if (!hayTrazo) {
      setError('Dibuja la firma en el recuadro antes de guardar.');
      return;
    }

    const guardado = await guardarEvidencia({
      tipo: 'firma',
      archivo: lienzo.toDataURL('image/png'),
      formato: 'png',
      nombre_firmante: nombreFirmante.trim(),
      rut_firmante: rutFirmante.trim(),
    });
    if (guardado) limpiarFirma();
  }

  const fotos = evidencias.filter((item) => item.tipo === 'foto');
  const firmas = evidencias.filter((item) => item.tipo === 'firma');
  const respuestasResumen = resumenServicio?.respuestas || [];
  const respondidasResumen = respuestasResumen.filter((respuesta) => respuesta.resultado).length;
  const consumosResumen = resumenServicio?.consumos || [];

  function continuarResumen() {
    if (fotos.length === 0) {
      setError('Adjunta al menos una fotografía antes de continuar.');
      return;
    }
    if (firmas.length === 0) {
      setError('Falta la firma del cliente antes de continuar.');
      return;
    }
    navigate('/resumen');
  }

  return (
    <main className="pantalla">
      <section className="tarjeta-pasos">
        <TarjetaCabecera
          paso="Paso 2 de 3"
          titulo="Evidencias y Validación del Cliente"
          subtitulo={orden ? `${orden.codigo_orden_erp || `OT-${orden.id_orden}`} · ${orden.equipo || orden.titulo}` : undefined}
          volver="/orden"
        />

        <div className="tarjeta-cuerpo">
          {!hoja?.id_hoja && (
            <>
              <p className="mensaje mensaje-alerta">
                Primero inicia el servicio en la ficha de la orden para poder adjuntar evidencias.
              </p>
              <button type="button" className="boton" onClick={() => navigate('/orden')}>
                Ir a la ficha de la orden
              </button>
            </>
          )}

          {cargando && <p className="vacio">Cargando evidencias...</p>}
          {mensaje && <p className="mensaje mensaje-ok" role="status">{mensaje}</p>}
          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

          {hoja?.id_hoja && (
            <>
              <div className="seccion-titulo">
                <Icono nombre="camara" tamano={20} />
                Fotografías del servicio
                <span
                  className={fotos.length > 0 ? 'pildora pildora-ok' : 'pildora pildora-pendiente'}
                  style={{ marginLeft: 'auto' }}
                >
                  {fotos.length} foto{fotos.length === 1 ? '' : 's'}
                </span>
              </div>

              <p className="micro">Mínimo una fotografía por servicio.</p>

              <div className="fotos-grid">
                {fotos.map((foto) => (
                  <div key={foto.id_evidencia} className="foto">
                    <ImagenEvidencia
                      idEvidencia={foto.id_evidencia}
                      dataUrl={foto.dataUrl}
                      alt="Evidencia del servicio"
                      className=""
                    />
                    <div className="foto-pie">
                      {foto.latitud !== null && foto.latitud !== undefined && (
                        <div>
                          <Icono nombre="pin" tamano={11} />
                          {Number(foto.latitud).toFixed(3)}, {Number(foto.longitud).toFixed(3)}
                        </div>
                      )}
                      <div>{fechaCorta(foto.fecha_captura)}</div>
                    </div>
                  </div>
                ))}

                <label className="foto-agregar">
                  <Icono nombre="mas" tamano={30} />
                  <span>{guardando ? 'Guardando...' : 'Capturar foto'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(evento) => void subirFoto(evento)}
                    disabled={guardando}
                  />
                </label>
              </div>

              <button
                type="button"
                className="boton boton-claro boton-compacto"
                onClick={obtenerUbicacion}
                style={{ marginTop: '12px' }}
              >
                <Icono nombre="pin" tamano={16} />
                Adjuntar ubicación actual
              </button>
              {coordenadas ? (
                <p className="micro" style={{ marginTop: '8px' }}>
                  Ubicación: {coordenadas.latitud.toFixed(5)}, {coordenadas.longitud.toFixed(5)}
                </p>
              ) : (
                <p className="micro" style={{ marginTop: '8px' }}>
                  Sin ubicación GPS. Puedes adjuntarla manualmente.
                </p>
              )}

              {resumenServicio && (
                <>
                  <div className="seccion-titulo">
                    <Icono nombre="resumen" tamano={20} />
                    Resumen previo a la firma
                  </div>

                  <p className="tenue">
                    Revisa estos datos con el cliente antes de pedir la firma.
                  </p>

                  <div className="resumen-filas">
                    <div className="fila">
                      <span>Equipo</span>
                      <strong>{resumenServicio.orden?.equipo || orden?.equipo || 'No indicado'}</strong>
                    </div>
                    <div className="fila">
                      <span>Orden</span>
                      <strong>{resumenServicio.orden?.codigo_orden_erp || orden?.codigo_orden_erp || 'Sin código'}</strong>
                    </div>
                    <div className="fila">
                      <span>Cliente</span>
                      <strong>{resumenServicio.orden?.cliente || orden?.cliente || 'No indicado'}</strong>
                    </div>
                    <div className="fila">
                      <span>Checklist</span>
                      <strong>
                        {respondidasResumen} / {respuestasResumen.length} respondidos
                      </strong>
                    </div>
                    <div className="fila">
                      <span>Materiales</span>
                      <strong>
                        {consumosResumen.length}{' '}
                        {consumosResumen.length === 1 ? 'material' : 'materiales'}
                      </strong>
                    </div>
                    <div className="fila">
                      <span>Fotografías</span>
                      <strong>{fotos.length}</strong>
                    </div>
                  </div>

                  <details className="detalle-registros">
                    <summary>Ver checklist y materiales</summary>

                    <h3>Checklist</h3>
                    {respuestasResumen.length === 0 && (
                      <p className="tenue">Sin respuestas registradas.</p>
                    )}
                    <ul className="lista-simple">
                      {respuestasResumen.map((respuesta) => (
                        <li key={respuesta.id_item}>
                          <strong>{respuesta.pregunta_texto}</strong>
                          <span className="tenue">
                            {respuesta.resultado || 'Sin responder'}
                            {respuesta.observacion ? ` · ${respuesta.observacion}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <h3>Materiales</h3>
                    {consumosResumen.length === 0 && (
                      <p className="tenue">Sin materiales registrados.</p>
                    )}
                    <ul className="consumos">
                      {consumosResumen.map((consumo) => (
                        <li key={consumo.id_consumo}>
                          <span>{consumo.nombre}</span>
                          <span className="cantidad">
                            {Number(consumo.cantidad)} {consumo.unidad_medida || ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              )}

              <div className="seccion-titulo">
                <Icono nombre="documento" tamano={20} />
                Firma de conformidad
              </div>
              <form onSubmit={guardarFirma} className="firma-caja">
                <div className="campo">
                  <label htmlFor="nombre-firmante" className="etiqueta">Nombre de quien firma</label>
                  <input
                    id="nombre-firmante"
                    type="text"
                    value={nombreFirmante}
                    onChange={(evento) => setNombreFirmante(evento.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="campo">
                  <label htmlFor="rut-firmante" className="etiqueta">RUT de quien firma</label>
                  <input
                    id="rut-firmante"
                    type="text"
                    value={rutFirmante}
                    onChange={(evento) => setRutFirmante(evento.target.value)}
                    placeholder="12.345.678-5"
                  />
                </div>

                <div className="firma-cabecera">
                  <span className="etiqueta" style={{ margin: 0 }}>Firma</span>
                  <button type="button" className="enlace-boton" onClick={limpiarFirma}>
                    Limpiar firma
                  </button>
                </div>

                <canvas
                  ref={lienzoRef}
                  className="firma-canvas"
                  width="600"
                  height="200"
                  onPointerDown={iniciarTrazo}
                  onPointerMove={continuarTrazo}
                  onPointerUp={terminarTrazo}
                  onPointerLeave={terminarTrazo}
                  onPointerCancel={terminarTrazo}
                  aria-label="Área para dibujar la firma"
                />
                <p className="firma-ayuda">Dibuja con el dedo o puntero en la zona delimitada.</p>

                <button type="submit" className="boton" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar firma'}
                </button>
              </form>

              {firmas.length > 0 && (
                <ul className="lista-simple">
                  {firmas.map((firma) => (
                    <li key={firma.id_evidencia}>
                      <div className="firma-cabecera">
                        <strong>{firma.nombre_firmante || 'Firma registrada'}</strong>
                        <span className={firma.pendiente ? 'pildora pildora-proceso' : 'pildora pildora-ok'}>
                          {firma.pendiente ? 'Por enviar' : 'Guardada'}
                        </span>
                      </div>
                      <span className="micro">{firma.rut_firmante}</span>
                      <ImagenEvidencia
                        idEvidencia={firma.id_evidencia}
                        dataUrl={firma.dataUrl}
                        alt="Firma capturada"
                      />
                      <span className="micro">{fechaCorta(firma.fecha_captura)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      <button type="button" className="boton" onClick={continuarResumen}>
        Revisar Resumen y Sincronizar
        <Icono nombre="flecha-derecha" tamano={18} />
      </button>

      <button type="button" className="boton boton-claro" onClick={() => navigate('/orden')}>
        Volver a la ficha de la orden
      </button>
    </main>
  );
}
