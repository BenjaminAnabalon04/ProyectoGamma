// Desarrollado por: Robert Ramírez

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { guardarSesion, obtenerToken, pedir } from '../api/api';
import Icono from '../components/Icono';

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
    <main className="pantalla pantalla-login">
      <section className="tarjeta login-tarjeta">
        <div className="login-hero">
          <span className="login-icono">
            <Icono nombre="usuario-engranaje" tamano={38} />
          </span>
          <h1>Portal de Terreno FYAG</h1>
          <p>Autenticación de Personal Operativo</p>
        </div>

        <form className="login-form" onSubmit={manejarEnvio}>
          <div className="campo">
            <label htmlFor="rut" className="etiqueta">RUT / ID de usuario</label>
            <div className="campo-icono">
              <Icono nombre="tarjeta" />
              <input
                id="rut"
                type="text"
                value={rut}
                onChange={(evento) => setRut(evento.target.value)}
                placeholder="12.345.678-5"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="password" className="etiqueta">Contraseña</label>
            <div className="campo-icono">
              <Icono nombre="candado" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

          <button type="submit" className="boton" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar a la PWA'}
            {!cargando && <Icono nombre="flecha-derecha" tamano={18} />}
          </button>
        </form>
      </section>
    </main>
  );
}
