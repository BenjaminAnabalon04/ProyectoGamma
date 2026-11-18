import { Link } from 'react-router-dom';

// Mapa de pantallas del proyecto (herramienta de desarrollo).
// Cuando una pantalla quede lista y probada, cambia su estado a 'listo'.
const pantallas = [
  { ruta: '/estado', nombre: 'Estado del sistema', historia: 'Base', estado: 'listo' },
  { ruta: '/login', nombre: 'Inicio de sesión', historia: 'HU-01', estado: 'pendiente' },
  { ruta: '/mis-trabajos', nombre: 'Mis trabajos asignados', historia: 'HU-02', estado: 'pendiente' },
  { ruta: '/orden', nombre: 'Detalle e inicio/fin del servicio', historia: 'HU-03', estado: 'pendiente' },
  { ruta: '/checklist-insumos', nombre: 'Checklist y materiales', historia: 'HU-04 y HU-05', estado: 'pendiente' },
  { ruta: '/evidencias-firma', nombre: 'Fotos y firma del cliente', historia: 'HU-05 y HU-06', estado: 'pendiente' },
  { ruta: '/resumen', nombre: 'Resumen y envío', historia: 'HU-07', estado: 'pendiente' },
  { ruta: '/presupuesto', nombre: 'Presupuesto en terreno', historia: 'HU-08', estado: 'pendiente' },
];

export default function Inicio() {
  return (
    <main className="pantalla">
      <h1>Portal de Terreno FYAG</h1>
      <p>Mapa de pantallas del proyecto.</p>
      <ul className="lista-pantallas">
        {pantallas.map((p) => (
          <li key={p.ruta}>
            <Link to={p.ruta}>{p.nombre}</Link>
            <span className="etiqueta">{p.historia} · {p.estado}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
