// Desarrollado por: Robert Ramírez

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion, obtenerToken, obtenerUsuario, pedir } from '../api/api';
import ChipEstado from '../components/ChipEstado';
import Icono from '../components/Icono';

function hora(valor) {
  if (!valor) return 'Sin hora';
  return new Date(valor).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function fechaHoy() {
  return new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function iniciales(nombre) {
  const partes = String(nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return 'FY';
  return `${partes[0][0]}${partes[1]?.[0] || ''}`.toUpperCase();
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

        let guardada = null;
        let previa = null;
        try {
          guardada = JSON.parse(localStorage.getItem('hoja_actual') || 'null');
          previa = JSON.parse(
            localStorage.getItem(`hoja_usuario_${usuario?.id_usuario}`) || 'null'
          );
        } catch {
          guardada = null;
          previa = null;
        }

        const candidata = guardada || previa;
        const ordenCandidata = candidata
          ? datos.find((orden) => orden.id_hoja === candidata.id_hoja)
          : null;
        const activa =
          datos.find((orden) => orden.id_hoja && orden.estado_servicio === 'EN_EJECUCION') ||
          datos.find((orden) => orden.id_hoja);

        const restaurar = ordenCandidata || activa;
        if (restaurar) {
          localStorage.setItem(
            'hoja_actual',
            JSON.stringify({
              id_hoja: restaurar.id_hoja,
              id_asignacion: restaurar.id_asignacion,
              estado_servicio: restaurar.estado_servicio,
              estado_envio_erp: restaurar.estado_envio_erp,
            })
          );
          localStorage.setItem('orden_actual', JSON.stringify(restaurar));
        } else {
          localStorage.removeItem('hoja_actual');
          localStorage.removeItem('orden_actual');
          if (usuario?.id_usuario) {
            localStorage.removeItem(`hoja_usuario_${usuario.id_usuario}`);
            localStorage.removeItem(`orden_usuario_${usuario.id_usuario}`);
          }
        }
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
  }, [token, navigate, usuario?.id_usuario]);

  function abrirOrden(orden) {
    localStorage.setItem('orden_actual', JSON.stringify(orden));
    navigate('/orden', { state: { orden } });
  }

  const asignadas = ordenes.length;
  const enProceso = ordenes.filter((orden) => orden.estado === 'EN_EJECUCION').length;
  const completadas = ordenes.filter((orden) => orden.estado === 'COMPLETADO').length;

  return (
    <main className="pantalla">
      <section className="perfil">
        <div>
          <span className="micro">Técnico de terreno</span>
          <div className="perfil-nombre">{usuario?.nombre || 'Técnico'}</div>
          <div className="perfil-zona">
            <Icono nombre="pin" tamano={14} />
            {usuario?.zona || 'Sin zona asignada'}
          </div>
        </div>
        <span className="perfil-avatar">{iniciales(usuario?.nombre)}</span>
      </section>

      <div className="kpis">
        <div className="kpi kpi-azul">
          <strong>{asignadas}</strong>
          <span>Asignadas</span>
        </div>
        <div className="kpi kpi-ambar">
          <strong>{enProceso}</strong>
          <span>En proceso</span>
        </div>
        <div className="kpi kpi-verde">
          <strong>{completadas}</strong>
          <span>Completadas</span>
        </div>
      </div>

      <div className="seccion-titulo">
        <Icono nombre="trabajos" tamano={20} />
        Órdenes de trabajo
        <span className="chip chip-ok" style={{ marginLeft: 'auto' }}>{fechaHoy()}</span>
      </div>

      {cargando && <p className="vacio">Cargando órdenes asignadas...</p>}
      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}
      {!cargando && !error && ordenes.length === 0 && (
        <p className="vacio">No tienes órdenes asignadas.</p>
      )}

      <ul className="lista-ordenes">
        {ordenes.map((orden) => (
          <li
            key={orden.id_orden}
            className={orden.estado === 'EN_EJECUCION' ? 'orden activa' : 'orden'}
          >
            <div className="orden-cabecera">
              <div>
                <span className="orden-codigo">
                  {orden.codigo_orden_erp || `OT-${orden.id_orden}`}
                </span>
                <strong className="orden-titulo">{orden.titulo}</strong>
              </div>
              <ChipEstado estado={orden.estado} />
            </div>

            <p className="orden-equipo">
              <Icono nombre="camion" tamano={16} />
              {orden.equipo || 'Equipo no indicado'}
            </p>

            <div className="orden-pie">
              <span className="icono-hora">
                <Icono nombre="reloj" tamano={15} />
                {hora(orden.fecha_programada)}
              </span>
              <button type="button" onClick={() => abrirOrden(orden)}>
                Ver ficha
                <Icono nombre="flecha-derecha" tamano={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button type="button" className="boton boton-ambar" onClick={() => navigate('/escaner')}>
        <Icono nombre="qr" tamano={20} />
        Escanear Código QR de Maquinaria
      </button>
    </main>
  );
}
