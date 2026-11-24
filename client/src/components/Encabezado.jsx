// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerUsuario, pendientesEnvio } from '../api/api';

export default function Encabezado() {
  const navigate = useNavigate();
  const usuario = obtenerUsuario();
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(pendientesEnvio());

  useEffect(() => {
    const actualizarRed = () => setEnLinea(navigator.onLine);
    const actualizarCola = (evento) => setPendientes(evento.detail?.pendientes ?? 0);
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
    <header className="encabezado">
      <div className="encabezado-superior">
        <Link to="/" className="marca">FYAG · Terreno</Link>
        <div className="encabezado-estado">
          <span className={enLinea ? 'chip chip-ok' : 'chip chip-alerta'}>
            {enLinea ? 'En línea' : 'Sin conexión'}
          </span>
          {pendientes > 0 && <span className="chip chip-alerta">{pendientes} por enviar</span>}
        </div>
      </div>

      {usuario && (
        <div className="encabezado-usuario">
          <span>{usuario.nombre} · {usuario.rol}</span>
          <button type="button" className="enlace-boton" onClick={salir}>Cerrar sesión</button>
        </div>
      )}

      <nav className="navegacion" aria-label="Navegación principal">
        <Link to="/mis-trabajos">Mis trabajos</Link>
        <Link to="/escaner">Escanear QR</Link>
        <Link to="/checklist-insumos">Checklist</Link>
        <Link to="/evidencias-firma">Fotos y firma</Link>
        <Link to="/resumen">Resumen</Link>
        <Link to="/presupuesto">Presupuesto</Link>
        {usuario?.rol === 'administrador' && <Link to="/administracion">Administración</Link>}
      </nav>
    </header>
  );
}
