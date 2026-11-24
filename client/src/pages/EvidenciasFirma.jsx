// Desarrollado por: Aaron Ponse

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, pedir } from '../api/api';

const FORMATOS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const TAMANO_MAXIMO = 5 * 1024 * 1024;

function leerLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || 'null');
  } catch {
    return null;
  }
}

function leerArchivo(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    lector.readAsDataURL(archivo);
  });
}

export default function EvidenciasFirma() {
  const navigate = useNavigate();
  const token = obtenerToken();
  const [orden] = useState(() => leerLocal('orden_actual'));
  const [hoja] = useState(() => leerLocal('hoja_actual'));
  const [evidencias, setEvidencias] = useState([]);
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
    pedir(`/evidencias/${hoja.id_hoja}`, { token })
      .then((datos) => {
        if (activo) setEvidencias(Array.isArray(datos) ? datos : []);
      })
      .catch((err) => {
        if (!activo) return;
        if (err.estado === 401 || err.estado === 403) {
          cerrarSesion();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'No se pudieron cargar las evidencias.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token, hoja?.id_hoja, navigate]);

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
    contexto.strokeStyle = '#0b1f33';
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
          latitud: coordenadas?.latitud ?? null,
          longitud: coordenadas?.longitud ?? null,
          ...detalles,
        },
      });

      setEvidencias((previo) => [
        ...previo,
        {
          id_evidencia: idEvidencia,
          id_hoja: hoja.id_hoja,
          ...detalles,
          fecha_captura: new Date().toISOString(),
          url: null,
          pendiente: Boolean(respuesta.pendiente),
        },
      ]);
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

    const formato = FORMATOS[archivo.type];
    if (!formato) {
      setError('Formato no admitido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (archivo.size > TAMANO_MAXIMO) {
      setError('La foto debe pesar menos de 5 MB.');
      return;
    }

    try {
      const archivoBase64 = await leerArchivo(archivo);
      await guardarEvidencia({ tipo: 'foto', archivo: archivoBase64, formato });
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

  return (
    <main className="pantalla">
      <h1>Fotos y firma del cliente</h1>

      {orden && (
        <p>
          Orden: <strong>{orden.codigo_orden_erp}</strong> ·{' '}
          <strong>{orden.titulo}</strong>
        </p>
      )}

      {!hoja?.id_hoja && (
        <div className="tarjeta">
          <p className="alerta">
            Primero inicia el servicio en el detalle de la orden para poder adjuntar evidencias.
          </p>
          <button type="button" className="boton" onClick={() => navigate('/orden')}>
            Ir al detalle de la orden
          </button>
        </div>
      )}

      {cargando && <p>Cargando evidencias...</p>}
      {mensaje && <p className="ok" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {hoja?.id_hoja && (
        <>
          <section className="tarjeta">
            <h2>Fotos del servicio</h2>
            <div className="campo">
              <label htmlFor="foto-servicio" className="etiqueta">Seleccionar foto</label>
              <input
                id="foto-servicio"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(evento) => void subirFoto(evento)}
                disabled={guardando}
              />
            </div>
            <button type="button" className="boton boton-secundario" onClick={obtenerUbicacion}>
              Adjuntar ubicación actual
            </button>
            {coordenadas && (
              <p className="ok">
                Ubicación: {coordenadas.latitud.toFixed(5)}, {coordenadas.longitud.toFixed(5)}
              </p>
            )}

            {fotos.length === 0 && <p>No hay fotos registradas en este servicio.</p>}
            <ul className="lista-simple">
              {fotos.map((foto) => (
                <li key={foto.id_evidencia}>
                  <strong>Foto</strong>
                  {foto.url && <img className="miniatura" src={foto.url} alt="Evidencia del servicio" />}
                  <span className="etiqueta">
                    {foto.pendiente ? 'Por enviar' : new Date(foto.fecha_captura).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="tarjeta">
            <h2>Firma del cliente o responsable</h2>

            <form onSubmit={guardarFirma}>
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
                  placeholder="12.345.678-9"
                />
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

              <div className="botonera">
                <button type="button" className="boton boton-secundario" onClick={limpiarFirma}>
                  Limpiar firma
                </button>
                <button type="submit" className="boton" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar firma'}
                </button>
              </div>
            </form>

            {firmas.length === 0 && <p>No hay firmas registradas en este servicio.</p>}
            <ul className="lista-simple">
              {firmas.map((firma) => (
                <li key={firma.id_evidencia}>
                  <strong>{firma.nombre_firmante || 'Firma registrada'}</strong>
                  <span>{firma.rut_firmante}</span>
                  {firma.url && <img className="miniatura" src={firma.url} alt="Firma capturada" />}
                  <span className="etiqueta">
                    {firma.pendiente ? 'Por enviar' : new Date(firma.fecha_captura).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <button type="button" className="boton boton-secundario" onClick={() => navigate('/orden')}>
        Volver al detalle de la orden
      </button>
    </main>
  );
}
