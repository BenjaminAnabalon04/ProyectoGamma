import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Inicio from './pages/Inicio';
import Estado from './pages/Estado';
import Login from './pages/Login';
import MisTrabajos from './pages/MisTrabajos';
import DetalleOrden from './pages/DetalleOrden';
import ChecklistInsumos from './pages/ChecklistInsumos';
import EvidenciasFirma from './pages/EvidenciasFirma';
import Resumen from './pages/Resumen';
import Presupuesto from './pages/Presupuesto';

// Aquí se declara qué pantalla se muestra en cada dirección.
// Para agregar una pantalla nueva: crear el archivo en src/pages/ y sumar una línea <Route>.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/estado" element={<Estado />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mis-trabajos" element={<MisTrabajos />} />
        <Route path="/orden" element={<DetalleOrden />} />
        <Route path="/checklist-insumos" element={<ChecklistInsumos />} />
        <Route path="/evidencias-firma" element={<EvidenciasFirma />} />
        <Route path="/resumen" element={<Resumen />} />
        <Route path="/presupuesto" element={<Presupuesto />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
