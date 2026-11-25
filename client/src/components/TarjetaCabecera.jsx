// Desarrollado por: Robert Ramírez

import { Link } from 'react-router-dom';
import Icono from './Icono';

export default function TarjetaCabecera({ paso, titulo, subtitulo, volver }) {
  return (
    <header className="tarjeta-hero">
      <div className="hero-fila">
        <div>
          {paso && <span className="micro">{paso}</span>}
          <h1>{titulo}</h1>
          {subtitulo && <p className="ficha-hero-serie">{subtitulo}</p>}
        </div>

        {volver && (
          <Link className="hero-volver" to={volver}>
            <Icono nombre="flecha-izquierda" tamano={16} />
            Volver
          </Link>
        )}
      </div>
    </header>
  );
}
