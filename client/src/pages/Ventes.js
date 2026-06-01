import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './Ventes.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const now = new Date();
const todayISO = now.toISOString().slice(0, 10);

const emptyForm = {
  nom_client: '', nom_offre: '',
  plan_paiement: 'PIF', devise: 'CAD',
  montant: '',
  montant_mensuel: '',
  date_vente: todayISO,
};

const PLANS = ['PIF', 'Plan 3 mois', 'Plan 4 mois', 'Plan 6 mois', 'Plan 8 mois', 'Plan 12 mois'];
const DEVISES = ['CAD', 'USD', 'EUR'];
const MOIS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const TAUX = { CAD: 1, USD: 1.36, EUR: 1.48 };

const toCAD = (n, d) => (parseFloat(n) || 0) * (TAUX[d] || 1);
const fmt = (n, d = 'CAD') => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: d });
const fmtCAD = (n) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' });

function nbMoisFromPlan(plan) {
  const m = (plan || '').match(/(\d+)/);
  return m ? parseInt(m[1]) : 1;
}

function fmtDateCourt(iso) {
  if (!iso) return '';
  const [, m, d] = iso.slice(0, 10).split('-');
  const mois = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${parseInt(d, 10)} ${mois[parseInt(m, 10) - 1]}`;
}

const BADGE_PLAN = {
  'PIF': 'badge-pif', 'Plan 3 mois': 'badge-plan3', 'Plan 4 mois': 'badge-plan4',
  'Plan 6 mois': 'badge-plan6', 'Plan 8 mois': 'badge-plan8', 'Plan 12 mois': 'badge-plan12',
};
const BADGE_DEVISE = { CAD: 'badge-cad', USD: 'badge-usd', EUR: 'badge-eur' };

function statutBadgeClass(statut) {
  if (statut === '✓ Paiement complété') return 'badge-purchased';
  if ((statut || '').startsWith('Plan')) return 'badge-plan-cours';
  return 'badge-warm';
}

function MontantCell({ v }) {
  const devise = v.devise || 'CAD';
  if (v.montant_mensuel && v.plan_paiement !== 'PIF') {
    const nb = nbMoisFromPlan(v.plan_paiement);
    return (
      <div className="montant-plan-cell">
        <span className="montant-mensuel-text">{fmt(v.montant_mensuel, devise)}/mois × {nb}</span>
        <span className="montant-total-text">= {fmt(v.montant, devise)} total</span>
      </div>
    );
  }
  return <span className="vente-montant">{fmt(v.montant, devise)}</span>;
}

export default function Ventes() {
  const [ventes, setVentes] = useState([]);
  const [annuelStats, setAnnuelStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [planToast, setPlanToast] = useState(null);

  // Navigation par mois
  const [selAnnee, setSelAnnee] = useState(now.getFullYear());
  const [selMois, setSelMois] = useState(now.getMonth() + 1); // 1-12

  const fetchAll = useCallback(async () => {
    const [v, s] = await Promise.all([axios.get('/api/ventes'), axios.get('/api/ventes/stats')]);
    setVentes(v.data);
    setAnnuelStats(s.data);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Navigation mois ─────────────────────────────────────────────
  const goMonth = (delta) => {
    let m = selMois + delta;
    let a = selAnnee;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setSelMois(m);
    setSelAnnee(a);
  };

  const monthKey = `${selAnnee}-${String(selMois).padStart(2, '0')}`;
  const isCurrentMonth = monthKey === now.toISOString().slice(0, 7);

  // ─── Filtrage par mois sélectionné ───────────────────────────────
  const ventesMois = ventes.filter(v => (v.date_vente || '').slice(0, 7) === monthKey);

  // ─── Stats calculées localement ──────────────────────────────────
  const statsMois = ventesMois.reduce((acc, v) => {
    const cad = toCAD(v.montant, v.devise || 'CAD');
    const isPif = (v.plan_paiement || 'PIF') === 'PIF';
    acc.total += cad;
    if (isPif) acc.pif += cad;
    if (v.nom_client) acc.clients.add(v.nom_client);
    return acc;
  }, { total: 0, pif: 0, clients: new Set() });

  const todayStr = now.toISOString().slice(0, 10);
  const todayTotal = isCurrentMonth
    ? ventesMois.filter(v => (v.date_vente || '').slice(0, 10) === todayStr)
        .reduce((s, v) => s + toCAD(v.montant, v.devise || 'CAD'), 0)
    : 0;

  const statCards = [
    { icon: '📅', label: isCurrentMonth ? "Aujourd'hui" : `${fmtDateCourt(todayStr)}`, value: fmtCAD(todayTotal), dim: !isCurrentMonth },
    { icon: '📆', label: `Ventes — ${MOIS_COURT[selMois - 1]}`, value: fmtCAD(statsMois.total) },
    { icon: '✅', label: `Cash — ${MOIS_COURT[selMois - 1]}`, value: fmtCAD(statsMois.pif) },
  ];

  // ─── Graphique jour par jour du mois ─────────────────────────────
  const nbJours = new Date(selAnnee, selMois, 0).getDate();
  const dailySales = Array(nbJours).fill(0);
  const dailyCash = Array(nbJours).fill(0);
  for (const v of ventesMois) {
    const day = parseInt((v.date_vente || '').slice(8, 10), 10) - 1;
    if (day < 0 || day >= nbJours) continue;
    const cad = toCAD(v.montant, v.devise || 'CAD');
    const cashCad = (v.plan_paiement || 'PIF') === 'PIF'
      ? cad
      : toCAD(v.montant_mensuel || 0, v.devise || 'CAD');
    dailySales[day] += cad;
    dailyCash[day] += cashCad;
  }
  const dailyLabels = Array.from({ length: nbJours }, (_, i) => String(i + 1));

  const chartJours = {
    labels: dailyLabels,
    datasets: [
      {
        label: 'Ventes',
        data: dailySales.map(v => Math.round(v * 100) / 100),
        backgroundColor: 'rgba(201,169,110,0.6)',
        borderColor: '#a07840', borderWidth: 2, borderRadius: 6,
      },
      {
        label: 'Cash',
        data: dailyCash.map(v => Math.round(v * 100) / 100),
        backgroundColor: 'rgba(34,197,94,0.6)',
        borderColor: '#16a34a', borderWidth: 2, borderRadius: 6,
      }
    ]
  };

  // ─── Graphique annuel ────────────────────────────────────────────
  const mensuelTotal = annuelStats?.mensuelTotal || Array(12).fill(0);
  const mensuelPif   = annuelStats?.mensuelPif   || Array(12).fill(0);

  const chartAnnuel = {
    labels: MOIS_COURT,
    datasets: [
      {
        label: 'Ventes',
        data: mensuelTotal.map(v => Math.round(v * 100) / 100),
        backgroundColor: MOIS_COURT.map((_, i) => i === selMois - 1 ? 'rgba(201,169,110,0.9)' : 'rgba(201,169,110,0.45)'),
        borderColor: '#a07840', borderWidth: 2, borderRadius: 6,
      },
      {
        label: 'Cash',
        data: mensuelPif.map(v => Math.round(v * 100) / 100),
        backgroundColor: MOIS_COURT.map((_, i) => i === selMois - 1 ? 'rgba(34,197,94,0.85)' : 'rgba(34,197,94,0.4)'),
        borderColor: '#16a34a', borderWidth: 2, borderRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { callbacks: { label: ctx => ` ${fmtCAD(ctx.raw)}` } }
    },
    scales: { y: { beginAtZero: true, ticks: { callback: v => `${v} $` } } }
  };

  // ─── Form helpers ─────────────────────────────────────────────────
  const isPlan = form.plan_paiement !== 'PIF';
  const nbMois = nbMoisFromPlan(form.plan_paiement);
  const computedTotal = isPlan && form.montant_mensuel ? parseFloat(form.montant_mensuel) * nbMois : null;
  const baseAmount = isPlan ? (computedTotal || 0) : (parseFloat(form.montant) || 0);
  const cadPreview = form.devise !== 'CAD' && baseAmount ? baseAmount * TAUX[form.devise] : null;

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({
      nom_client: v.nom_client || '',
      nom_offre: v.nom_offre || '',
      plan_paiement: v.plan_paiement || 'PIF',
      devise: v.devise || 'CAD',
      montant: v.plan_paiement === 'PIF' ? v.montant : '',
      montant_mensuel: v.montant_mensuel || '',
      date_vente: (v.date_vente || '').slice(0, 10),
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (isPlan) delete payload.montant;
      else delete payload.montant_mensuel;

      if (editing) {
        await axios.put(`/api/ventes/${editing.id}`, payload);
      } else {
        const { data } = await axios.post('/api/ventes', payload);
        if (data.plan) {
          const nom = form.nom_client || 'le plan';
          setPlanToast(`✓ ${data.count} versements créés pour ${nom} !`);
          setTimeout(() => setPlanToast(null), 6000);
        }
      }
      await fetchAll();
      closeForm();
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette vente ?')) return;
    await axios.delete(`/api/ventes/${id}`);
    await fetchAll();
  };

  return (
    <div>
      {planToast && <div className="lead-toast">{planToast}</div>}
      <div className="page-header">
        <h1 className="page-title">💰 Suivi des Ventes</h1>
        <p className="page-subtitle">Naviguez par mois pour analyser vos performances.</p>
      </div>

      {/* ── 1. Sélecteur de mois ── */}
      <div className="mois-nav-card card">
        <div className="mois-nav-top">
          <button className="mois-arrow" onClick={() => goMonth(-1)}>‹</button>
          <div className="mois-titre">
            <span className="mois-nom">{MOIS_LONG[selMois - 1]}</span>
            <span className="mois-annee">{selAnnee}</span>
            {isCurrentMonth && <span className="mois-badge-actuel">Mois actuel</span>}
          </div>
          <button className="mois-arrow" onClick={() => goMonth(1)}>›</button>
        </div>
        <div className="mois-chips">
          {MOIS_COURT.map((label, i) => (
            <button
              key={i}
              className={`mois-chip ${selMois === i + 1 ? 'active' : ''}`}
              onClick={() => setSelMois(i + 1)}
            >
              {label}
            </button>
          ))}
        </div>
        {!isCurrentMonth && (
          <button className="mois-retour-btn" onClick={() => { setSelMois(now.getMonth() + 1); setSelAnnee(now.getFullYear()); }}>
            ↩ Revenir au mois actuel
          </button>
        )}
      </div>

      {/* ── 2. Cartes stats ── */}
      <div className="stats-row">
        {statCards.map(s => (
          <div key={s.label} className={`stat-mini ${s.dim ? 'stat-mini-dim' : ''}`}>
            <span className="stat-mini-icon">{s.icon}</span>
            <div className="stat-mini-value">{s.value}</div>
            <div className="stat-mini-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── 3. Formulaire ── */}
      {showForm ? (
        <div className="card vente-form-card">
          <div className="card-header">
            <h3 className="card-title">{editing ? 'Modifier la vente' : '+ Nouvelle vente'}</h3>
            <button className="btn-secondary" onClick={closeForm}>Annuler</button>
          </div>
          <form onSubmit={handleSave} className="vente-inline-form">
            <div className="form-group">
              <label>Nom du client</label>
              <input type="text" placeholder="Ex : Marie Dupont" value={form.nom_client} onChange={e => setForm({ ...form, nom_client: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Nom de l'offre / produit</label>
              <input type="text" placeholder="Ex : Académie Brave, Coaching 1-1..." value={form.nom_offre} onChange={e => setForm({ ...form, nom_offre: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Plan de paiement</label>
              <select value={form.plan_paiement} onChange={e => setForm({ ...form, plan_paiement: e.target.value, montant: '', montant_mensuel: '' })}>
                {PLANS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Devise</label>
              <select value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value })}>
                {DEVISES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {isPlan ? (
              <div className="form-group">
                <label>Montant mensuel * ({form.devise}/mois)</label>
                <input type="number" step="0.01" min="0" placeholder="Ex : 100.00" value={form.montant_mensuel} onChange={e => setForm({ ...form, montant_mensuel: e.target.value })} required />
              </div>
            ) : (
              <div className="form-group">
                <label>Montant total * ({form.devise})</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} required />
              </div>
            )}
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date_vente} onChange={e => setForm({ ...form, date_vente: e.target.value })} />
            </div>
            {isPlan && computedTotal !== null && (
              <div className="form-group plan-calcul-preview">
                <span className="plan-calcul-detail">{fmt(parseFloat(form.montant_mensuel), form.devise)}/mois × {nbMois} mois</span>
                <span className="plan-calcul-total">= {fmt(computedTotal, form.devise)} total</span>
                {form.devise !== 'CAD' && <span className="plan-calcul-cad">≈ {fmtCAD(computedTotal * TAUX[form.devise])} CAD</span>}
              </div>
            )}
            {!isPlan && cadPreview && (
              <div className="form-group devise-preview-inline">≈ {fmtCAD(cadPreview)} CAD</div>
            )}
            <div className="form-group statut-auto-preview">
              {isPlan && nbMois > 0 && form.montant_mensuel
                ? <>{nbMois} versements de <strong>{fmt(parseFloat(form.montant_mensuel), form.devise)}</strong> seront créés automatiquement</>
                : <>Statut : <strong>✓ Paiement complété</strong></>
              }
            </div>
            <div className="form-group">
              <button type="submit" className="btn-primary btn-full-form" disabled={loading}>
                {loading ? 'Création...' : editing ? 'Mettre à jour' : isPlan ? `Créer le plan (${nbMois} versements)` : 'Ajouter la vente'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="add-vente-bar">
          <button className="btn-primary" onClick={openNew}>+ Ajouter une vente</button>
        </div>
      )}

      {/* ── 4. Tableau du mois ── */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          Ventes de {MOIS_LONG[selMois - 1]} {selAnnee}
          <span className="card-title-count"> ({ventesMois.length})</span>
        </h3>
        <div className="table-wrapper">
          {ventesMois.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <p>Aucune vente en {MOIS_LONG[selMois - 1].toLowerCase()} {selAnnee}.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Nom client</th><th>Offre</th>
                  <th>Montant</th><th>Devise</th><th>Plan</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ventesMois.map(v => (
                  <tr key={v.id}>
                    <td className="vente-date">{fmtDateCourt(v.date_vente)}</td>
                    <td className="vente-client">{v.nom_client || <span className="vente-empty">—</span>}</td>
                    <td className="vente-offre">{v.nom_offre || <span className="vente-empty">—</span>}</td>
                    <td><MontantCell v={v} /></td>
                    <td><span className={`badge ${BADGE_DEVISE[v.devise || 'CAD']}`}>{v.devise || 'CAD'}</span></td>
                    <td><span className={`badge ${BADGE_PLAN[v.plan_paiement || 'PIF'] || 'badge-pif'}`}>{v.plan_paiement || 'PIF'}</span></td>
                    <td><span className={`badge ${statutBadgeClass(v.statut)}`}>{v.statut}</span></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-edit" onClick={() => openEdit(v)}>✏️</button>
                        <button className="btn-danger" onClick={() => handleDelete(v.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── 5. Graphiques ── */}
      <div className="charts-bottom-grid">
        <div className="card chart-card">
          <div className="chart-header">
            <h3 className="chart-title">📅 {MOIS_LONG[selMois - 1]} — par jour</h3>
            <div className="chart-total">
              Ventes : <strong>{fmtCAD(dailySales.reduce((a, b) => a + b, 0))}</strong>
              <span className="chart-total-note"> · Cash : </span>
              <strong>{fmtCAD(dailyCash.reduce((a, b) => a + b, 0))}</strong>
            </div>
          </div>
          <Bar data={chartJours} options={chartOptions} />
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <h3 className="chart-title">📆 Vue annuelle — {selAnnee}</h3>
            <div className="chart-total">
              Total : <strong>{fmtCAD(mensuelTotal.reduce((a, b) => a + b, 0))}</strong>
              <span className="chart-total-note"> CAD</span>
            </div>
          </div>
          <Bar data={chartAnnuel} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
