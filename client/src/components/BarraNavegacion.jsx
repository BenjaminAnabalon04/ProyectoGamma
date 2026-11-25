// Desarrollado por: Robert Ramírez

import { Link, useLocation } from 'react-router-dom';
import Icono from './Icono';
import { ENLACES } from '../navegacion';

export default function BarraNavegacion() {
  const location = useLocation();
  const enlaces = ENLACES.filter((enlace) => enlace.movil);

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
