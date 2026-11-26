// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icono from './Icono';
import { ENLACES, ENLACES_SERVICIO, RUTAS_SERVICIO } from '../navegacion';

function leerHoja() {
  try {
    return JSON.parse(localStorage.getItem('hoja_actual') || 'null');
  } catch {
    return null;
  }
}

export default function BarraNavegacion() {
  const location = useLocation();
  const [hoja, setHoja] = useState(leerHoja);

  useEffect(() => {
    const actualizar = () => setHoja(leerHoja());
    window.addEventListener('gamma:hoja', actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener('gamma:hoja', actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);

  const enviado =
    hoja?.estado_envio_erp === 'ENVIADO' || hoja?.estado_envio_erp === 'SINCRONIZADO';
  const enPantallaServicio = RUTAS_SERVICIO.includes(location.pathname);
  const enlaces = hoja?.id_hoja && !enviado && enPantallaServicio
    ? ENLACES_SERVICIO
    : ENLACES.filter((enlace) => enlace.movil);

  return (
    <nav className="navegacion-inferior" aria-label="Navegación principal">
      {enlaces.map((enlace) => (
        <Link
          key={enlace.ruta}
          to={enlace.ruta}
          className={location.pathname === enlace.ruta ? 'activo' : undefined}
        >
          <Icono nombre={enlace.icono} tamano={22} />
          <span>{enlace.nombre}</span>
        </Link>
      ))}
    </nav>
  );
}
