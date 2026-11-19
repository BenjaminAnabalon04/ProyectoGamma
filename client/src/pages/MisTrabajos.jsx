import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedir } from '../api/api';

// Desarrollado por: Robert Ramírez
export default function MisTrabajos() {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    async function cargarOrdenes() {
      try {
        const datos = await pedir('/ordenes', { token });
        setOrdenes(Array.isArray(datos) ? datos : []);
      } catch (err) {
        if (err.estado === 401 || err.estado === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          navigate('/login');
          return;
        }
        setError(err.message || 'No se pudieron cargar las órdenes.');
      } finally {
        setCargando(false);
      }
    }

    cargarOrdenes();
  }, [token, navigate]);

  function abrirOrden(orden) {
    localStorage.setItem('orden_actual', JSON.stringify(orden));
    navigate('/orden', { state: { orden } });
  }

  function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('orden_actual');
    localStorage.removeItem('hoja_actual');
    navigate('/login');
  }

  return (
    <main className="pantalla">
      <h1>Mis trabajos</h1>
      {usuario && <p>Técnico: <strong>{usuario.nombre}</strong></p>}

      {cargando && <p>Cargando órdenes asignadas...</p>}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!cargando && !error && ordenes.length === 0 && (
        <p>No tienes órdenes asignadas.</p>
      )}

      <ul className="lista-pantallas">
        {ordenes.map((orden) => (
          <li key={orden.id_orden}>
            <strong>
              {orden.codigo_orden_erp} - {orden.titulo}
            </strong>
            <span className="etiqueta">Estado: {orden.estado}</span>
            <span>Tipo: {orden.tipo_servicio} | Prioridad: {orden.prioridad}</span>
            {orden.cliente && <span>Cliente: {orden.cliente}</span>}
            {orden.equipo && <span>Equipo: {orden.equipo}</span>}
            <button
              type="button"
              className="boton"
              onClick={() => abrirOrden(orden)}
            >
              Ver detalle
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="boton" onClick={cerrarSesion}>
        Cerrar sesión
      </button>
    </main>
  );
}