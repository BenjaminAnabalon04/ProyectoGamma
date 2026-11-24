// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, obtenerUsuario, pedir } from '../api/api';

function fechaLegible(valor) {
  if (!valor) return 'Sin fecha';
  return new Date(valor).toLocaleString();
}

export default function MisTrabajos() {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = obtenerToken();
  const usuario = obtenerUsuario();

  useEffect(() => {
    async function cargarOrdenes() {
      try {
        const datos = await pedir('/ordenes', { token });
        setOrdenes(Array.isArray(datos) ? datos : []);
      } catch (err) {
        if (err.estado === 401 || err.estado === 403) {
          cerrarSesion();
          navigate('/login', { replace: true });
          return;
        }
        setError(err.message || 'No se pudieron cargar las órdenes.');
      } finally {
        setCargando(false);
      }
    }

    void cargarOrdenes();
  }, [token, navigate]);

  function abrirOrden(orden) {
    localStorage.setItem('orden_actual', JSON.stringify(orden));
    navigate('/orden', { state: { orden } });
  }

  function salir() {
    cerrarSesion();
    navigate('/login', { replace: true });
  }

  return (
    <main className="pantalla">
      <h1>Mis trabajos</h1>
      {usuario && <p>Técnico: <strong>{usuario.nombre}</strong></p>}

      {cargando && <p>Cargando órdenes asignadas...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!cargando && !error && ordenes.length === 0 && <p>No tienes órdenes asignadas.</p>}

      <ul className="lista-pantallas">
        {ordenes.map((orden) => (
          <li key={orden.id_orden}>
            <strong>{orden.codigo_orden_erp} · {orden.titulo}</strong>
            <span className="etiqueta">Estado: {orden.estado}</span>
            <span>Tipo: {orden.tipo_servicio} · Prioridad: {orden.prioridad}</span>
            <span>Programada: {fechaLegible(orden.fecha_programada)}</span>
            {orden.cliente && <span>Cliente: {orden.cliente}</span>}
            {orden.equipo && <span>Equipo: {orden.equipo}</span>}
            <button type="button" className="boton" onClick={() => abrirOrden(orden)}>
              Ver detalle
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="boton boton-secundario" onClick={salir}>
        Cerrar sesión
      </button>
    </main>
  );
}
