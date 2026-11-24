// Desarrollado por: Robert Ramírez

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerToken, pedir } from '../api/api';

export default function EscanerQR() {
  const navigate = useNavigate();
  const token = obtenerToken();
  const videoRef = useRef(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);

  const buscar = useCallback(
    async (valor) => {
      const limpio = String(valor || '').trim();
      if (!limpio) return;
      setError('');
      setBuscando(true);
      try {
        const orden = await pedir(`/ordenes/por-qr/${encodeURIComponent(limpio)}`, { token });
        localStorage.setItem('orden_actual', JSON.stringify(orden));
        navigate('/orden', { state: { orden } });
      } catch (err) {
        setError(err.message || 'No se pudo encontrar una orden con ese código.');
      } finally {
        setBuscando(false);
      }
    },
    [navigate, token]
  );

  useEffect(() => {
    let stream;
    let intervalo;
    let activo = true;

    async function iniciarCamara() {
      if (typeof BarcodeDetector === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

      try {
        const formatos = await BarcodeDetector.getSupportedFormats();
        if (!formatos.includes('qr_code')) return;

        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!activo || !videoRef.current) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamaraActiva(true);

        intervalo = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const detectados = await detector.detect(videoRef.current);
            if (detectados.length > 0) {
              clearInterval(intervalo);
              await buscar(detectados[0].rawValue);
            }
          } catch {
            setError('No se pudo leer el código QR. Puedes escribirlo manualmente.');
          }
        }, 700);
      } catch {
        if (activo) setError('No se pudo activar la cámara. Puedes escribir el código manualmente.');
      }
    }

    void iniciarCamara();

    return () => {
      activo = false;
      clearInterval(intervalo);
      stream?.getTracks().forEach((pista) => pista.stop());
    };
  }, [buscar]);

  return (
    <main className="pantalla">
      <h1>Escáner QR del equipo</h1>
      <p>Apunta la cámara al código QR del equipo o escribe el código impreso.</p>

      <div className="tarjeta">
        {camaraActiva ? (
          <video ref={videoRef} className="miniatura" playsInline muted autoPlay />
        ) : (
          <p className="alerta">Cámara no disponible en este dispositivo o navegador.</p>
        )}
      </div>

      <form
        className="tarjeta"
        onSubmit={(evento) => {
          evento.preventDefault();
          void buscar(codigo);
        }}
      >
        <div className="campo">
          <label htmlFor="codigo-qr" className="etiqueta">Código QR o código de orden</label>
          <input
            id="codigo-qr"
            type="text"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            placeholder="QR-EQ-001 u OT-8842"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="boton" disabled={buscando}>
          {buscando ? 'Buscando...' : 'Buscar orden'}
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
    </main>
  );
}
