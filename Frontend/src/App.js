import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext, SidebarProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import AttendanceManager from './pages/AttendanceManager';
import AttendanceScanner from './pages/AttendanceScanner';
import Shifts from './pages/Shifts';
import LeaveRequests from './pages/LeaveRequests';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import Payroll from './pages/Payroll';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Router>
          <AppContent />
        </Router>
      </SidebarProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user } = React.useContext(AuthContext);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {user && <Sidebar />}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${user ? 'lg:pl-64' : ''}`}>
        {user && <Navbar />}
        <main className="flex-grow p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/attendance" element={user ? <Attendance /> : <Navigate to="/login" />} />
            <Route path="/attendance-manager" element={user && (user.role === 'admin' || user.role === 'hr' || user.role === 'attendance_manager') ? <AttendanceManager /> : <Navigate to="/dashboard" />} />
            <Route path="/scanner" element={user && (user.role === 'admin' || user.role === 'hr' || user.role === 'attendance_manager') ? <AttendanceScanner /> : <Navigate to="/dashboard" />} />
            <Route path="/shifts" element={user ? <Shifts /> : <Navigate to="/login" />} />
            <Route path="/leaves" element={user ? <LeaveRequests /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/employees" element={user && (user.role === 'admin' || user.role === 'hr') ? <Employees /> : <Navigate to="/dashboard" />} />
            <Route path="/payroll" element={user && (user.role === 'admin' || user.role === 'hr') ? <Payroll /> : <Navigate to="/dashboard" />} />
            <Route path="/reports" element={user && (user.role === 'admin' || user.role === 'hr') ? <Reports /> : <Navigate to="/dashboard" />} />
            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          </Routes>
        </main>
        {user && <Footer />}
      </div>
    </div>
  );
}

export default App;