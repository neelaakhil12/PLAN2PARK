import React, { useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';

import SeekerLogin from './pages/SeekerLogin';
import OwnerLogin from './pages/OwnerLogin';
import AdminLogin from './pages/AdminLogin';

import SeekerRegister from './pages/SeekerRegister';
import OwnerRegister from './pages/OwnerRegister';

import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import SeekerDashboard from './pages/SeekerDashboard';

import LoginChoice from './pages/LoginChoice';
import RegisterChoice from './pages/RegisterChoice';
import About from './pages/About';
import Invoice from './pages/Invoice';
import Terms from './pages/Terms';
import RefundPolicy from './pages/RefundPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// ─── PROTECTED ROUTE COMPONENT BY ROLE ──────────────────────────────────────
const ProtectedRoute = ({ children, allowedRole, redirectPath }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to={redirectPath} replace />;

  if (user.role !== allowedRole) {
    switch (user.role) {
      case 'admin': return <Navigate to="/admin/dashboard" replace />;
      case 'owner': return <Navigate to="/owner/dashboard" replace />;
      case 'seeker': return <Navigate to="/seeker/dashboard" replace />;
      default: return <Navigate to="/" replace />;
    }
  }

  return children;
};

const DashboardDispatcher = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'admin': return <Navigate to="/admin/dashboard" replace />;
    case 'owner': return <Navigate to="/owner/dashboard" replace />;
    case 'seeker': return <Navigate to="/seeker/dashboard" replace />;
    default: return <Navigate to="/" replace />;
  }
};

// Inner component inside Router so it can use useLocation
const AppContent = () => {
  const location = useLocation();

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
    // Find all scrollable mains / container views and reset scroll positions
    const scrollableElements = document.querySelectorAll('.overflow-y-auto, main');
    scrollableElements.forEach(el => {
      el.scrollTop = 0;
    });
  }, [location.pathname]);

  // Admin dashboard has its own full-screen layout — hide global Navbar for /admin
  const noNavPaths = ['/admin'];
  const showNavbar = !noNavPaths.some(p => location.pathname.startsWith(p)) || 
                     ['/admin/login'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {showNavbar && <Navbar />}
      <main className="flex-grow">
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/invoice/:id" element={<Invoice />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* Seeker Routes */}
          <Route path="/seeker/login" element={<SeekerLogin />} />
          <Route path="/seeker/register" element={<SeekerRegister />} />
          <Route path="/seeker/dashboard" element={
            <ProtectedRoute allowedRole="seeker" redirectPath="/seeker/login">
              <SeekerDashboard />
            </ProtectedRoute>
          } />

          {/* Owner Routes */}
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner/register" element={<OwnerRegister />} />
          <Route path="/owner/*" element={
            <ProtectedRoute allowedRole="owner" redirectPath="/owner/login">
              <OwnerDashboard />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRole="admin" redirectPath="/admin/login">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Choice & Legacy Redirection Pages */}
          <Route path="/login" element={<LoginChoice />} />
          <Route path="/register" element={<RegisterChoice />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<DashboardDispatcher />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showNavbar && <Footer />}
    </div>
  );
};

import Loader from './components/Loader';

function App() {
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 1500); // 1.5 seconds loading state on refresh
    return () => clearTimeout(timer);
  }, []);

  if (appLoading) {
    return <Loader />;
  }

  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
