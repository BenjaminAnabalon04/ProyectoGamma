// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { API_URL, obtenerToken } from '../api/api';
import { guardarArchivo, leerArchivo } from '../api/offline';

const MAXIMO_CACHE = 40;
const cache = new Map();

function guardarEnCache(id, url) {
  if (cache.size >= MAXIMO_CACHE) {
    const [primeraClave, primeraUrl] = cache.entries().next().value;
    URL.revokeObjectURL(primeraUrl);
    cache.delete(primeraClave);
  }
  cache.set(id, url);
}

export default function ImagenEvidencia({
  idEvidencia,
  alt = 'Evidencia',
  className = 'miniatura',
  dataUrl,
}) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  const mostrada = dataUrl || cache.get(idEvidencia) || url;

  useEffect(() => {
    if (!dataUrl || !idEvidencia) return;
    void guardarArchivo(idEvidencia, dataUrl);
  }, [dataUrl, idEvidencia]);

  useEffect(() => {
    if (dataUrl || !idEvidencia) return undefined;
    if (cache.get(idEvidencia)) return undefined;

    let activo = true;
    const token = obtenerToken();

    fetch(`${API_URL}/evidencias/${idEvidencia}/archivo`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error('No se pudo cargar la imagen');
        return respuesta.blob();
      })
      .then((blob) => {
        if (!activo) return;
        const nueva = URL.createObjectURL(blob);
        guardarEnCache(idEvidencia, nueva);
        setUrl(nueva);
        setError('');
        void guardarArchivo(idEvidencia, blob);
      })
      .catch(async () => {
        const guardada = await leerArchivo(idEvidencia).catch(() => null);
        if (!activo) return;
        if (guardada instanceof Blob) {
          const nueva = URL.createObjectURL(guardada);
          guardarEnCache(idEvidencia, nueva);
          setUrl(nueva);
          setError('');
          return;
        }
        if (typeof guardada === 'string') {
          setUrl(guardada);
          setError('');
          return;
        }
        setError('Imagen no disponible');
      });

    return () => {
      activo = false;
    };
  }, [idEvidencia, dataUrl]);

  if (error) return <p className="etiqueta">{error}</p>;
  if (!mostrada) return <p className="etiqueta">Cargando imagen...</p>;
  return <img className={className} src={mostrada} alt={alt} />;
}