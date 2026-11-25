// Desarrollado por: Robert Ramírez

import { Link } from 'react-router-dom';
import Icono from '../components/Icono';

const pantallas = [
  { ruta: '/estado', nombre: 'Estado del sistema', historia: 'Base', icono: 'edificio' },
  { ruta: '/login', nombre: 'Inicio de sesión', historia: 'HU-01', icono: 'usuario' },
  { ruta: '/mis-trabajos', nombre: 'Mis trabajos asignados', historia: 'HU-02', icono: 'trabajos' },
  { ruta: '/orden', nombre: 'Detalle e inicio/fin del servicio', historia: 'HU-03', icono: 'camion' },
  { ruta: '/escaner', nombre: 'Escáner QR del equipo', historia: 'HU-10', icono: 'qr' },
  { ruta: '/checklist-insumos', nombre: 'Checklist del servicio', historia: 'HU-04', icono: 'checklist' },
  { ruta: '/materiales', nombre: 'Materiales y repuestos', historia: 'HU-05', icono: 'caja' },
  { ruta: '/evidencias-firma', nombre: 'Fotos y firma del cliente', historia: 'HU-05 y HU-06', icono: 'camara' },
  { ruta: '/resumen', nombre: 'Resumen y envío', historia: 'HU-07', icono: 'resumen' },
  { ruta: '/presupuesto', nombre: 'Presupuesto en terreno', historia: 'HU-08', icono: 'documento' },
  { ruta: '/administracion', nombre: 'Panel de administración', historia: 'HU-11', icono: 'admin' },
];

export default function Inicio() {
  return (
    <main className="pantalla">
      <section className="tarjeta">
        <h1>Portal de Terreno FYAG</h1>
        <p className="tenue">Mapa de pantallas del proyecto. Todas las pantallas están operativas.</p>

        <ul className="lista-pantallas">
          {pantallas.map((pantalla) => (
            <li key={pantalla.ruta}>
              <Link to={pantalla.ruta}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Icono nombre={pantalla.icono} tamano={18} />
                  {pantalla.nombre}
                </span>
              </Link>
              <span className="micro">
                {pantalla.historia} ·{' '}
                <span className="pildora pildora-ok">listo</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
