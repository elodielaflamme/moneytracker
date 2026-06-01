import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import './Content.css';

const now = new Date();
const YEAR = now.getFullYear();
const MOIS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const TYPES = ['Storytelling', 'Autorité', 'Embodiment'];
const TYPE_CLASS = { Storytelling: 'type-story', Autorité: 'type-auto', Embodiment: 'type-embody' };

function getTodayJour() {
  const start = new Date(YEAR, 0, 1);
  return Math.min(365, Math.floor((now - start) / 86400000) + 1);
}

function getJoursForMonth(month) {
  // month: 0-indexed
  let start = 1;
  for (let m = 0; m < month; m++) start += new Date(YEAR, m + 1, 0).getDate();
  const count = new Date(YEAR, month + 1, 0).getDate();
  return { start, count };
}

function fmtDate(jour) {
  const d = new Date(YEAR, 0, jour);
  return `${d.getDate()} ${MOIS_COURT[d.getMonth()]}`;
}

export default function Content() {
  const [entries, setEntries] = useState([]);
  const [selMois, setSelMois] = useState(now.getMonth()); // 0-indexed
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({ type: '', hook: '' });
  const [loading, setLoading] = useState(false);
  const todayRef = useRef(null);
  const todayJour = getTodayJour();

  const fetchEntries = useCallback(async () => {
    const { data } = await axios.get('/api/content');
    setEntries(data);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const goToToday = () => {
    setSelMois(now.getMonth());
    setTimeout(() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditForm({ type: entry.type, hook: entry.hook });
  };

  const closeEdit = () => setEditEntry(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`/api/content/${editEntry.jour}`, editForm);
      setEntries(entries.map(en => en.jour === editEntry.jour ? { ...en, ...editForm, custom: true } : en));
      closeEdit();
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!window.confirm('Réinitialiser cette suggestion ?')) return;
    setLoading(true);
    try {
      await axios.delete(`/api/content/${editEntry.jour}`);
      await fetchEntries();
      closeEdit();
    } finally { setLoading(false); }
  };

  const { start, count } = getJoursForMonth(selMois);
  const monthEntries = entries.filter(e => e.jour >= start && e.jour < start + count);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📅 Content Calendar</h1>
        <p className="page-subtitle">365 suggestions de contenu — une par jour.</p>
      </div>

      {/* Navigation par mois */}
      <div className="card content-nav-card">
        <div className="content-nav-top">
          <button className="mois-arrow" onClick={() => setSelMois(m => Math.max(0, m - 1))}>‹</button>
          <div className="mois-titre">
            <span className="mois-nom">{MOIS_LONG[selMois]}</span>
            <span className="mois-annee">{YEAR}</span>
            {selMois === now.getMonth() && <span className="mois-badge-actuel">Mois actuel</span>}
          </div>
          <button className="mois-arrow" onClick={() => setSelMois(m => Math.min(11, m + 1))}>›</button>
        </div>
        <div className="mois-chips">
          {MOIS_COURT.map((label, i) => (
            <button key={i} className={`mois-chip ${selMois === i ? 'active' : ''}`} onClick={() => setSelMois(i)}>
              {label}
            </button>
          ))}
        </div>
        <button className="mois-retour-btn" onClick={goToToday}>→ Aujourd'hui (Jour {todayJour})</button>
      </div>

      {/* Légende types */}
      <div className="content-legend">
        {TYPES.map(t => (
          <span key={t} className={`content-type-badge ${TYPE_CLASS[t]}`}>{t}</span>
        ))}
      </div>

      {/* Liste du mois */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          {MOIS_LONG[selMois]} {YEAR}
          <span className="card-title-count"> ({count} jours)</span>
        </h3>
        <div className="content-list">
          {monthEntries.map(entry => {
            const isToday = entry.jour === todayJour;
            return (
              <div
                key={entry.jour}
                ref={isToday ? todayRef : null}
                className={`content-row ${isToday ? 'content-row-today' : ''} ${entry.custom ? 'content-row-custom' : ''}`}
              >
                <div className="content-jour">
                  <span className="content-jour-num">Jour {entry.jour}</span>
                  <span className="content-jour-date">{fmtDate(entry.jour)}</span>
                  {isToday && <span className="content-aujourd-hui">Aujourd'hui</span>}
                </div>
                <span className={`content-type-badge ${TYPE_CLASS[entry.type]}`}>{entry.type}</span>
                <span className="content-hook">{entry.hook}</span>
                <button className="btn-edit content-edit-btn" onClick={() => openEdit(entry)}>✏️</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal d'édition */}
      {editEntry && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeEdit()}>
          <div className="modal">
            <h2 className="modal-title">✏️ Modifier — Jour {editEntry.jour} ({fmtDate(editEntry.jour)})</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Type de contenu</label>
                <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Hook / Accroche</label>
                <textarea rows={3} value={editForm.hook} onChange={e => setEditForm({ ...editForm, hook: e.target.value })} required placeholder="Écris ton accroche ici..." />
              </div>
              <div className="modal-actions">
                {editEntry.custom && (
                  <button type="button" className="btn-secondary" onClick={handleReset} disabled={loading}>
                    Réinitialiser
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={closeEdit}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
