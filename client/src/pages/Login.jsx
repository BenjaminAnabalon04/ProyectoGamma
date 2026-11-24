// Desarrollado por: Robert Ramírez

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { guardarSesion, obtenerToken, pedir } from '../api/api';

export default function Login() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  if (obtenerToken()) return <Navigate to="/mis-trabajos" replace />;

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError('');
    setCargando(true);

    try {
      const datos = await pedir('/auth/login', {
        metodo: 'POST',
        cuerpo: { rut: rut.trim(), password },
        sinCola: true,
      });
      guardarSesion(datos);
      navigate('/mis-trabajos', { replace: true });
    } catch (err) {
      setError(err.message || 'Credenciales inválidas.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="pantalla">
      <h1>Iniciar sesión</h1>
      <p>Portal de Terreno FYAG</p>

      <form onSubmit={manejarEnvio} className="tarjeta">
        <div className="campo">
          <label htmlFor="rut" className="etiqueta">RUT</label>
          <input
            id="rut"
            type="text"
            value={rut}
            onChange={(evento) => setRut(evento.target.value)}
            placeholder="11.111.111-1"
            autoComplete="username"
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="password" className="etiqueta">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="boton" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
