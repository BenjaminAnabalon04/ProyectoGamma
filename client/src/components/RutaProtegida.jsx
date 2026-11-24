// Desarrollado por: Robert Ramírez

import { Navigate, Outlet } from 'react-router-dom';
import { obtenerToken, obtenerUsuario } from '../api/api';

export default function RutaProtegida({ rol }) {
  const token = obtenerToken();
  const usuario = obtenerUsuario();

  if (!token) return <Navigate to="/login" replace />;
  if (rol && usuario?.rol !== rol) return <Navigate to="/mis-trabajos" replace />;

  return <Outlet />;
}
