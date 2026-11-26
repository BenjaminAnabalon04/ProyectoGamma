// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, obtenerUsuario, pendientesEnvio } from '../api/api';
import BarraNavegacion from './BarraNavegacion';
import Icono from './Icono';
import { ENLACES } from '../navegacion';

export default function Encabezado() {
  const navigate = useNavigate();
  const usuario = obtenerUsuario();
  const autenticado = Boolean(obtenerToken());
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    const actualizarRed = () => setEnLinea(navigator.onLine);
    const actualizarCola = () => {
      void pendientesEnvio().then(setPendientes);
    };

    actualizarCola();

    window.addEventListener('online', actualizarRed);
    window.addEventListener('offline', actualizarRed);
    window.addEventListener('gamma:cola', actualizarCola);
    return () => {
      window.removeEventListener('online', actualizarRed);
      window.removeEventListener('offline', actualizarRed);
      window.removeEventListener('gamma:cola', actualizarCola);
    };
  }, []);

  function salir() {
    cerrarSesion();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="barra">
        <div className="barra-contenido">
          <Link to="/" className="marca">
            <span className="marca-logo">
              <Icono nombre="camion" tamano={26} />
            </span>
            <span className="marca-texto">FYAG Movilidad</span>
          </Link>

          <div className="barra-acciones">
            <span className={enLinea ? 'pildora-red' : 'pildora-red sin-red'}>
              {enLinea ? 'En línea' : 'Sin conexión'}
            </span>

            {autenticado && (
              <Link
                to="/mis-trabajos"
                className="boton-barra"
                aria-label="Mis trabajos"
                title="Mis trabajos"
              >
                <Icono nombre="trabajos" tamano={18} />
                <span className="texto-boton">Mis trabajos</span>
              </Link>
            )}

            <Link
              to="/pendientes"
              className={pendientes > 0 ? 'boton-barra con-aviso' : 'boton-barra'}
              aria-label="Envíos pendientes"
              title="Envíos pendientes"
            >
              <Icono nombre="nube" tamano={18} />
              {pendientes > 0 ? pendientes : null}
            </Link>

            {usuario?.rol === 'administrador' && (
              <Link
                to="/administracion"
                className="boton-barra"
                aria-label="Panel de administración"
                title="Panel de administración"
              >
                <Icono nombre="edificio" tamano={18} />
              </Link>
            )}

            {autenticado && (
              <button
                type="button"
                className="boton-barra"
                onClick={salir}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <Icono nombre="salir" tamano={18} />
              </button>
            )}
          </div>
        </div>

        {autenticado && (
          <nav className="navegacion-superior" aria-label="Navegación principal">
            {ENLACES.map((enlace) => (
              <Link key={enlace.ruta} to={enlace.ruta}>
                {enlace.nombre}
              </Link>
            ))}
            {usuario?.rol === 'administrador' && <Link to="/administracion">Administración</Link>}
          </nav>
        )}
      </header>

      {autenticado && <BarraNavegacion />}
    </>
  );
}
