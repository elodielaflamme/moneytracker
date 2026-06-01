import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';

function useDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}

export default function Dashboard() {
  const { user } = useAuth();
  const now = useDateTime();
  const [stats, setStats] = useState(null);
  const [leadsCount, setLeadsCount] = useState(0);

  useEffect(() => {
    axios.get('/api/ventes/stats').then(r => setStats(r.data)).catch(() => {});
    axios.get('/api/leads').then(r => setLeadsCount(r.data.length)).catch(() => {});
  }, []);

  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' });

  const quickLinks = [
    { to: '/leads', icon: '🎯', label: 'Lead Tracker', desc: `${leadsCount} lead${leadsCount > 1 ? 's' : ''} actif${leadsCount > 1 ? 's' : ''}`, color: '#fee2e2' },
    { to: '/ventes', icon: '💰', label: 'Ventes', desc: `${fmt(stats?.today)} aujourd'hui`, color: '#d1fae5' },
    { to: '/clients', icon: '👥', label: 'Clients', desc: `${stats?.clients_fermes || 0} client${(stats?.clients_fermes || 0) > 1 ? 's' : ''}`, color: '#dbeafe' },
    { to: '/notes', icon: '📝', label: 'Notes', desc: 'Mémos & rappels', color: '#fef3c7' },
  ];

  return (
    <div>
      <div className="dashboard-welcome">
        <div>
          <h1 className="welcome-title">Bonjour, {user?.prenom} ! 👋</h1>
          <p className="welcome-date">{dateStr} · {timeStr}</p>
          <p className="welcome-sub">Prête à écraser tes objectifs aujourd'hui ? 💪</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <div className="stat-value">{fmt(stats?.today)}</div>
            <div className="stat-label">Ventes aujourd'hui</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-value">{fmt(stats?.week)}</div>
            <div className="stat-label">Cette semaine</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <div className="stat-value">{fmt(stats?.month)}</div>
            <div className="stat-label">Ce mois</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-info">
            <div className="stat-value">{fmt(stats?.cash)}</div>
            <div className="stat-label">Cash reçu</div>
          </div>
        </div>
      </div>

      <h2 className="section-title">Navigation rapide</h2>
      <div className="quick-links">
        {quickLinks.map(link => (
          <Link key={link.to} to={link.to} className="quick-link" style={{ '--link-color': link.color }}>
            <span className="quick-link-icon">{link.icon}</span>
            <span className="quick-link-label">{link.label}</span>
            <span className="quick-link-desc">{link.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
