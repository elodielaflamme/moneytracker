import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/leads', label: '🎯 Lead Tracker' },
    { to: '/ventes', label: '💰 Ventes' },
    { to: '/clients', label: '👥 Clients' },
    { to: '/content', label: '📅 Content' },
    { to: '/statistiques', label: '📊 Stats' },
  ];

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-logo">✨</span>
          <span className="nav-title">Sales Tracker</span>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-user">
          <NavLink to="/" className="nav-user-name" onClick={() => setMenuOpen(false)}>Bonjour, {user?.prenom} 👋</NavLink>
          <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
