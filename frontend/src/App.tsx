import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api/client';
import { LoginPage } from './features/auth/LoginPage';
import { CotizacionesPage } from './features/cotizaciones/CotizacionesPage';
import { CotizacionEditorPage } from './features/cotizaciones/CotizacionEditorPage';
import { DatosPage } from './features/datos/DatosPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cotizaciones" element={<RequireAuth><CotizacionesPage /></RequireAuth>} />
        <Route path="/cotizaciones/:id" element={<RequireAuth><CotizacionEditorPage /></RequireAuth>} />
        <Route path="/datos" element={<RequireAuth><DatosPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/cotizaciones" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
