// Desarrollado por: Robert Ramírez

import { Link } from 'react-router-dom';

const pantallas = [
  { ruta: '/estado', nombre: 'Estado del sistema', historia: 'Base', estado: 'listo' },
  { ruta: '/login', nombre: 'Inicio de sesión', historia: 'HU-01', estado: 'listo' },
  { ruta: '/mis-trabajos', nombre: 'Mis trabajos asignados', historia: 'HU-02', estado: 'listo' },
  { ruta: '/orden', nombre: 'Detalle e inicio/fin del servicio', historia: 'HU-03', estado: 'listo' },
  { ruta: '/escaner', nombre: 'Escáner QR del equipo', historia: 'HU-10', estado: 'listo' },
  { ruta: '/checklist-insumos', nombre: 'Checklist y materiales', historia: 'HU-04 y HU-05', estado: 'listo' },
  { ruta: '/evidencias-firma', nombre: 'Fotos y firma del cliente', historia: 'HU-05 y HU-06', estado: 'listo' },
  { ruta: '/resumen', nombre: 'Resumen y envío', historia: 'HU-07', estado: 'listo' },
  { ruta: '/presupuesto', nombre: 'Presupuesto en terreno', historia: 'HU-08', estado: 'listo' },
  { ruta: '/administracion', nombre: 'Panel de administración', historia: 'HU-11', estado: 'listo' },
];

export default function Inicio() {
  return (
    <main className="pantalla">
      <h1>Portal de Terreno FYAG</h1>
      <p>Mapa de pantallas del proyecto. Todas las pantallas están operativas.</p>
      <ul className="lista-pantallas">
        {pantallas.map((pantalla) => (
          <li key={pantalla.ruta}>
            <Link to={pantalla.ruta}>{pantalla.nombre}</Link>
            <span className="etiqueta">{pantalla.historia} · {pantalla.estado}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
