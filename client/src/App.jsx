// Desarrollado por: Robert Ramírez

import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Encabezado from './components/Encabezado';
import RutaProtegida from './components/RutaProtegida';
import { vaciarCola } from './api/api';
import Inicio from './pages/Inicio';
import Estado from './pages/Estado';
import Login from './pages/Login';
import MisTrabajos from './pages/MisTrabajos';
import DetalleOrden from './pages/DetalleOrden';
import EscanerQR from './pages/EscanerQR';
import ChecklistInsumos from './pages/ChecklistInsumos';
import Materiales from './pages/Materiales';
import EvidenciasFirma from './pages/EvidenciasFirma';
import Resumen from './pages/Resumen';
import Presupuesto from './pages/Presupuesto';
import Administracion from './pages/Administracion';
import Pendientes from './pages/Pendientes';

function App() {
  useEffect(() => {
    void vaciarCola();
    const alConectar = () => void vaciarCola();
    window.addEventListener('online', alConectar);
    const intervalo = window.setInterval(() => void vaciarCola(), 60000);
    return () => {
      window.removeEventListener('online', alConectar);
      window.clearInterval(intervalo);
    };
  }, []);

  return (
    <BrowserRouter>
      <Encabezado />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/estado" element={<Estado />} />
        <Route path="/login" element={<Login />} />

        <Route element={<RutaProtegida />}>
          <Route path="/mis-trabajos" element={<MisTrabajos />} />
          <Route path="/orden" element={<DetalleOrden />} />
          <Route path="/escaner" element={<EscanerQR />} />
          <Route path="/checklist-insumos" element={<ChecklistInsumos />} />
          <Route path="/materiales" element={<Materiales />} />
          <Route path="/evidencias-firma" element={<EvidenciasFirma />} />
          <Route path="/resumen" element={<Resumen />} />
          <Route path="/presupuesto" element={<Presupuesto />} />
          <Route path="/pendientes" element={<Pendientes />} />
        </Route>

        <Route element={<RutaProtegida rol="administrador" />}>
          <Route path="/administracion" element={<Administracion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;