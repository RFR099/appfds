import { Navigate, Route, Routes } from "react-router-dom"
import AppLayout from "./layout/AppLayout"
import AlertasPage from "./pages/AlertasPage"
import FDSCreatePage from "./pages/FDSCreatePage"
import FDSDetailPage from "./pages/FDSDetailPage"
import FDSListPage from "./pages/FDSListPage"
import SimpleListPage from "./pages/SimpleListPage"

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/fds" replace />} />
        <Route path="/fds" element={<FDSListPage />} />
        <Route path="/fds/nova" element={<FDSCreatePage />} />
        <Route path="/fds/:id" element={<FDSDetailPage />} />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/obras" element={<SimpleListPage titulo="Obras" endpoint="/obras" />} />
        <Route
          path="/centros-produtivos"
          element={<SimpleListPage titulo="Centros Produtivos" endpoint="/centros-produtivos" />}
        />
        <Route path="*" element={<Navigate to="/fds" replace />} />
      </Route>
    </Routes>
  )
}
