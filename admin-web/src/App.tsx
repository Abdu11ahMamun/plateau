import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import LiveBoardPage from './pages/LiveBoardPage';
import AttendancePage from './pages/AttendancePage';
import { useAuthStore } from './store/auth.store';

function RequireAuth({ children }: { children: ReactElement }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<LiveBoardPage />} />
          <Route path="attendance" element={<AttendancePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
