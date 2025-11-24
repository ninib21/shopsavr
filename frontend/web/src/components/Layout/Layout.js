import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import './Layout.css';

const Layout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // For homepage, don't render the standard layout components
  if (isHomePage) {
    return (
      <div className="layout homepage-layout">
        <main className="main-content full-width">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <Header />
      <div className="layout-content">
        {isAuthenticated && <Sidebar />}
        <main className={`main-content ${isAuthenticated ? 'with-sidebar' : 'full-width'}`}>
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;