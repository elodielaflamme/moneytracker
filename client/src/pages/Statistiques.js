import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import './Statistiques.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MOIS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const fmtCAD = (n) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' });
const currentYear = new Date().getFullYear();

export default function Statistiques() {
  const [annee, setAnnee] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await axios.get(`/api/stats/annuelles?annee=${annee}`);
      setData(d);
    } finally { setLoading(false); }
  }, [annee]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const mois = data?.mois || [];

  const totalLeads = mois.reduce((s, m) => s + m.leads_collectes, 0);
  const totalConvertis = mois.reduce((s, m) => s + m.leads_convertis, 0);
  const totalVentes = mois.reduce((s, m) => s + m.montant_total, 0);
  const tauxConversion = totalLeads > 0 ? Math.round((totalConvertis / totalLeads) * 100) : 0;

  const barData = {
    labels: MOIS_LABELS,
    datasets: [
      {
        label: 'Leads collectés',
        data: mois.map(m => m.leads_collectes),
        backgroundColor: 'rgba(232,160,160,0.7)',
        borderColor: '#c97b7b',
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Leads convertis',
        data: mois.map(m => m.leads_convertis),
        backgroundColor: 'rgba(201,169,110,0.7)',
        borderColor: '#a07840',
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };

  const lineData = {
    labels: MOIS_LABELS,
    datasets: [{
      label: 'Revenus (CAD)',
      data: mois.map(m => Math.round(m.montant_total * 100) / 100),
      borderColor: '#c9a96e',
      backgroundColor: 'rgba(201,169,110,0.15)',
      borderWidth: 3,
      pointBackgroundColor: '#a07840',
      pointRadius: 5,
      fill: true,
      tension: 0.35,
    }]
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${fmtCAD(ctx.raw)}` } }
    },
    scales: { y: { beginAtZero: true, ticks: { callback: v => `${v} $` } } }
  };

  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Statistiques Annuelles</h1>
        <p className="page-subtitle">Récapitulatif mensuel de vos leads et revenus.</p>
      </div>

      <div className="stats-controls">
        <div className="year-selector">
          {years.map(y => (
            <button key={y} className={`year-btn ${annee === y ? 'active' : ''}`} onClick={() => setAnnee(y)}>{y}</button>
          ))}
        </div>
      </div>

      <div className="annuelles-summary">
        <div className="annuelle-card">
          <div className="annuelle-icon">🎯</div>
          <div className="annuelle-value">{totalLeads}</div>
          <div className="annuelle-label">Leads collectés</div>
        </div>
        <div className="annuelle-card">
          <div className="annuelle-icon">✅</div>
          <div className="annuelle-value">{totalConvertis}</div>
          <div className="annuelle-label">Convertis en clients</div>
        </div>
        <div className="annuelle-card">
          <div className="annuelle-icon">📈</div>
          <div className="annuelle-value">{tauxConversion}%</div>
          <div className="annuelle-label">Taux de conversion</div>
        </div>
        <div className="annuelle-card highlight">
          <div className="annuelle-icon">💰</div>
          <div className="annuelle-value">{fmtCAD(totalVentes)}</div>
          <div className="annuelle-label">Revenus totaux {annee}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card-annuelle">
          <h3 className="chart-title">Leads collectés vs convertis — {annee}</h3>
          {loading ? <div className="stats-loading">Chargement...</div> : <Bar data={barData} options={barOptions} />}
        </div>
        <div className="card chart-card-annuelle">
          <h3 className="chart-title">Courbe des revenus — {annee}</h3>
          {loading ? <div className="stats-loading">Chargement...</div> : <Line data={lineData} options={lineOptions} />}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Détail mensuel {annee}</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Leads collectés</th>
                <th>Leads convertis</th>
                <th>Taux</th>
                <th>Revenus (CAD)</th>
              </tr>
            </thead>
            <tbody>
              {mois.map((m, i) => (
                <tr key={m.mois} className={m.montant_total > 0 ? 'row-active' : ''}>
                  <td className="mois-label">{MOIS_LONG[i]}</td>
                  <td>{m.leads_collectes > 0 ? <span className="badge badge-cold">{m.leads_collectes}</span> : '—'}</td>
                  <td>{m.leads_convertis > 0 ? <span className="badge badge-purchased">{m.leads_convertis}</span> : '—'}</td>
                  <td>
                    {m.leads_collectes > 0
                      ? <span className="taux-bar"><span className="taux-fill" style={{ width: `${Math.round(m.leads_convertis / m.leads_collectes * 100)}%` }} />{Math.round(m.leads_convertis / m.leads_collectes * 100)}%</span>
                      : '—'}
                  </td>
                  <td className={m.montant_total > 0 ? 'montant-actif' : 'montant-zero'}>
                    {m.montant_total > 0 ? fmtCAD(m.montant_total) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
