import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';

// Layout Components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('./pages/Home/HomePage'));
const LoginPage = React.lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard/DashboardPage'));
const WishlistPage = React.lazy(() => import('./pages/Wishlist/WishlistPage'));
const CouponsPage = React.lazy(() => import('./pages/Coupons/CouponsPage'));
const SavingsPage = React.lazy(() => import('./pages/Savings/SavingsPage'));
const SettingsPage = React.lazy(() => import('./pages/Settings/SettingsPage'));
const UpgradePage = React.lazy(() => import('./pages/Upgrade/UpgradePage'));
const ProfilePage = React.lazy(() => import('./pages/Profile/ProfilePage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFound/NotFoundPage'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const { theme } = useTheme();
  
  // Apply theme to document
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <div className="App" data-theme={theme}>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <HomePage />
                </Suspense>
              </Layout>
            }
          />
          
          {/* Authentication Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <LoginPage />
                </Suspense>
              </PublicRoute>
            }
          />
          
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <RegisterPage />
                </Suspense>
              </PublicRoute>
            }
          />
          
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <ForgotPasswordPage />
                </Suspense>
              </PublicRoute>
            }
          />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <DashboardPage />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <WishlistPage />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/coupons"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <CouponsPage />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/savings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <SavingsPage />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <SettingsPage />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProfilePage />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Upgrade Route (accessible to all authenticated users) */}
          <Route
            path="/upgrade"
            element={
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <UpgradePage />
                </Suspense>
              </Layout>
            }
          />
          
          {/* 404 Route */}
          <Route
            path="*"
            element={
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <NotFoundPage />
                </Suspense>
              </Layout>
            }
          />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;