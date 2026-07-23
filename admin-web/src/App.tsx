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
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import FlagsPage from './pages/FlagsPage';
import NotAuthorizedPage from './pages/NotAuthorizedPage';
import { useAuthStore } from './store/auth.store';

// Every page in this panel currently maps to a backend endpoint gated to
// OWNER/MANAGER — there is no EMPLOYEE-facing surface here yet.
const OWNER_OR_MANAGER = ['OWNER', 'MANAGER'];

function RequireAuth({
  children,
  roles,
}: {
  children: ReactElement;
  roles?: string[];
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/not-authorized" replace />;
  }
  return children;
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
            <RequireAuth roles={OWNER_OR_MANAGER}>
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
          <Route
            index
            element={
              <RequireAuth roles={OWNER_OR_MANAGER}>
                <LiveBoardPage />
              </RequireAuth>
            }
          />
          <Route
            path="schedule"
            element={
              <RequireAuth roles={OWNER_OR_MANAGER}>
                <SchedulePage />
              </RequireAuth>
            }
          />
          <Route
            path="attendance"
            element={
              <RequireAuth roles={OWNER_OR_MANAGER}>
                <AttendancePage />
              </RequireAuth>
            }
          />
          <Route
            path="flags"
            element={
              <RequireAuth roles={OWNER_OR_MANAGER}>
                <FlagsPage />
              </RequireAuth>
            }
          />
          <Route
            path="employees"
            element={
              <RequireAuth roles={OWNER_OR_MANAGER}>
                <EmployeesPage />
              </RequireAuth>
            }
          />
          <Route
            path="employees/:id"
            element={
              <RequireAuth roles={OWNER_OR_MANAGER}>
                <EmployeeDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="reports"
            element={
              <RequireAuth roles={OWNER_OR_MANAGER}>
                <ReportsPage />
              </RequireAuth>
            }
          />
          <Route
            path="leave"
            element={
              <RequireAuth roles={OWNER_OR_MANAGER}>
                <LeaveRequestsPage />
              </RequireAuth>
            }
          />
          <Route path="not-authorized" element={<NotAuthorizedPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
