import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import './Layout.css';

const Layout = ({ children }) => {
  const { isAuthenticated } = useAuth();

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