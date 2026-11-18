import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedir } from '../api/api';

// Desarrollado por: Robert Ramírez
export default function Login() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const datos = await pedir('/auth/login', {
        metodo: 'POST',
        cuerpo: { rut: rut.trim(), password },
      });

      localStorage.setItem('token', datos.token);
      localStorage.setItem('usuario', JSON.stringify(datos.usuario));
      navigate('/mis-trabajos');
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

      <form onSubmit={manejarEnvio}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="rut" className="etiqueta">
            RUT
          </label>
          <input
            id="rut"
            type="text"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder="11.111.111-1"
            required
            style={{ width: '100%', minHeight: '48px', padding: '10px', fontSize: '18px', marginTop: '6px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="password" className="etiqueta">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', minHeight: '48px', padding: '10px', fontSize: '18px', marginTop: '6px' }}
          />
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="boton" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}