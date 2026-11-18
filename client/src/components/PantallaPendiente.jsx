import { Link } from 'react-router-dom';

// Marcador de posición para pantallas que aún no se construyen.
// Quien construya la pantalla reemplaza el contenido del archivo de la página
// (en src/pages/) y deja de usar este componente.
export default function PantallaPendiente({ titulo, historia }) {
  return (
    <main className="pantalla">
      <h1>{titulo}</h1>
      <p className="etiqueta">{historia} · pendiente</p>
      <p>
        Esta pantalla aún no está construida. Reemplaza el contenido de este archivo
        con la pantalla real (ver docs/tareas.md).
      </p>
      <Link className="boton" to="/">Volver al inicio</Link>
    </main>
  );
}
