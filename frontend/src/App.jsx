import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ActivateAccount from './pages/ActivateAccount';
import DashboardLayout from './layouts/DashboardLayout';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookTransport from './pages/BookTransport';
import ProfileSettings from './pages/ProfileSettings';
import DriverLogin from './pages/DriverLogin';
import DriverDashboard from './pages/DriverDashboard';

import { User, Camera, Moon, Sun, Monitor, Bell, Shield, Key, Save } from 'lucide-react';

// Theme Management
const ThemeContext = React.createContext();

export const useTheme = () => React.useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'system');

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<ActivateAccount />} />
        <Route path="/driver-login" element={<DriverLogin />} />
        <Route path="/driver" element={<DriverDashboard />} />

        {/* Protected layout */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="book" element={<BookTransport />} />
          <Route path="my-bookings" element={<EmployeeDashboard />} />
          <Route path="settings" element={<ProfileSettings />} />

          {/* Admin routes */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/analytics" element={<AdminDashboard />} />
          <Route path="admin/employees" element={<AdminDashboard />} />
          <Route path="admin/vehicles" element={<AdminDashboard />} />
          <Route path="admin/drivers" element={<AdminDashboard />} />
          <Route path="admin/bookings" element={<AdminDashboard />} />
          <Route path="admin/external" element={<AdminDashboard />} />
          <Route path="admin/routes" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
