import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import LiveBoardPage from './pages/LiveBoardPage';
import AttendancePage from './pages/AttendancePage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import ReportsPage from './pages/ReportsPage';
import ReportsPrintPage from './pages/ReportsPrintPage';
import SchedulePage from './pages/SchedulePage';
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
        {/* No Layout chrome — this route is a print-only view. */}
        <Route
          path="/reports/print"
          element={
            <RequireAuth>
              <ReportsPrintPage />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<LiveBoardPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/:id" element={<EmployeeDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
