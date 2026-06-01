import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './LeadTracker.css';

const STATUTS = ['Tous', 'Hot', 'Warm', 'Cold', 'Purchased'];
const STATUT_LABELS = { Hot: '🔥 Hot', Warm: '🌡️ Warm', Cold: '❄️ Cold', Purchased: '✓ Purchased' };
const BADGE_CLASS = { Hot: 'badge-hot', Warm: 'badge-warm', Cold: 'badge-cold', Purchased: 'badge-purchased' };

const DECOUVERTES = ['', 'Instagram', 'Email', 'Référence', 'Google', 'TikTok', 'LinkedIn', 'Autre'];
const emptyForm = { nom: '', contact: '', statut: 'Cold', notes: '', date_premier_contact: '', offre_interet: '', decouverte: '' };
const today = new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' });

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${parseInt(d, 10)} ${mois[parseInt(m, 10) - 1]} ${y}`;
}

function fmtDateCourt(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  const mois = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${parseInt(d, 10)} ${mois[parseInt(m, 10) - 1]}`;
}

// ─── Achats Panel ────────────────────────────────────────────────────────────
function AchatsPanel({ lead }) {
  const [achats, setAchats] = useState(null);
  const [form, setForm] = useState({ date_achat: today, produit: '', montant: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await axios.get(`/api/achats/lead/${lead.id}`);
    setAchats(data);
  }, [lead.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.produit.trim() || !form.montant) return;
    setSaving(true);
    try {
      await axios.post(`/api/achats/lead/${lead.id}`, form);
      setForm({ date_achat: today, produit: '', montant: '' });
      await fetch();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await axios.delete(`/api/achats/${id}`);
    setAchats(achats.filter(a => a.id !== id));
  };

  const total = (achats || []).reduce((s, a) => s + a.montant, 0);

  return (
    <div className="detail-section">
      <div className="detail-section-title">🛒 Historique des achats</div>

      {achats === null ? (
        <div className="detail-loading">Chargement...</div>
      ) : achats.length === 0 ? (
        <div className="detail-empty">Aucun achat enregistré pour ce lead.</div>
      ) : (
        <>
          <ul className="achats-list">
            {achats.map(a => (
              <li key={a.id} className="achat-item">
                <span className="achat-date">{fmtDateCourt(a.date_achat)}</span>
                <span className="achat-produit">{a.produit}</span>
                <span className="achat-montant">{fmt(a.montant)}</span>
                <button className="suivi-delete" onClick={() => handleDelete(a.id)} title="Supprimer">×</button>
              </li>
            ))}
          </ul>
          <div className="achats-total">Total : <strong>{fmt(total)}</strong></div>
        </>
      )}

      <form className="suivi-form" onSubmit={handleAdd}>
        <input type="date" className="suivi-input-date" value={form.date_achat} onChange={e => setForm({ ...form, date_achat: e.target.value })} required />
        <input type="text" className="suivi-input-desc" placeholder="Produit / service vendu" value={form.produit} onChange={e => setForm({ ...form, produit: e.target.value })} required />
        <input type="number" className="suivi-input-montant" placeholder="Montant $" min="0" step="0.01" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} required />
        <button type="submit" className="suivi-add-btn" disabled={saving}>{saving ? '...' : '+ Ajouter'}</button>
      </form>
    </div>
  );
}

// ─── Suivis Panel ────────────────────────────────────────────────────────────
function SuivisPanel({ lead }) {
  const [suivis, setSuivis] = useState(null);
  const [form, setForm] = useState({ date_suivi: today, description: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await axios.get(`/api/suivis/${lead.id}`);
    setSuivis(data);
  }, [lead.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await axios.post(`/api/suivis/${lead.id}`, form);
      setForm({ date_suivi: today, description: '' });
      await fetch();
    } finally { setSaving(false); }
  };

  const handleToggle = async (suivi) => {
    await axios.patch(`/api/suivis/${suivi.id}/toggle`);
    setSuivis(suivis.map(s => s.id === suivi.id ? { ...s, effectue: s.effectue ? 0 : 1 } : s));
  };

  const handleDelete = async (id) => {
    await axios.delete(`/api/suivis/${id}`);
    setSuivis(suivis.filter(s => s.id !== id));
  };

  return (
    <div className="detail-section">
      <div className="detail-section-title">📋 Historique des suivis</div>

      {suivis === null ? (
        <div className="detail-loading">Chargement...</div>
      ) : suivis.length === 0 ? (
        <div className="detail-empty">Aucun suivi pour l'instant.</div>
      ) : (
        <ul className="suivis-list">
          {suivis.map(s => (
            <li key={s.id} className={`suivi-item ${s.effectue ? 'effectue' : ''}`}>
              <label className="suivi-check-label">
                <input type="checkbox" className="suivi-checkbox" checked={!!s.effectue} onChange={() => handleToggle(s)} />
                <span className="suivi-checkmark">{s.effectue ? '✓' : '○'}</span>
              </label>
              <div className="suivi-body">
                <span className="suivi-date">{fmtDateCourt(s.date_suivi)}</span>
                <span className="suivi-desc">{s.description}</span>
                <span className={`suivi-badge ${s.effectue ? 'suivi-done' : 'suivi-pending'}`}>
                  {s.effectue ? '✓ Suivi effectué' : '⊘ En attente'}
                </span>
              </div>
              <button className="suivi-delete" onClick={() => handleDelete(s.id)} title="Supprimer">×</button>
            </li>
          ))}
        </ul>
      )}

      <form className="suivi-form" onSubmit={handleAdd}>
        <input type="date" className="suivi-input-date" value={form.date_suivi} onChange={e => setForm({ ...form, date_suivi: e.target.value })} required />
        <input type="text" className="suivi-input-desc" placeholder="Description du suivi (ex: Appel passé, Email envoyé...)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
        <button type="submit" className="suivi-add-btn" disabled={saving}>{saving ? '...' : '+ Ajouter'}</button>
      </form>
    </div>
  );
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────
function LeadDetailPanel({ lead }) {
  return (
    <div className="suivis-panel">
      {lead.date_premier_contact && (
        <div className="premier-contact-banner">
          📅 <strong>Premier contact :</strong> {fmtDate(lead.date_premier_contact)}
        </div>
      )}
      <div className="detail-columns">
        <AchatsPanel lead={lead} />
        <SuivisPanel lead={lead} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LeadTracker() {
  const [leads, setLeads] = useState([]);
  const [filtre, setFiltre] = useState('Tous');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const fetchLeads = async () => {
    const { data } = await axios.get('/api/leads');
    setLeads(data);
  };

  useEffect(() => { fetchLeads(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setSaveError(null); setModal(true); };
  const openEdit = (lead) => {
    setEditing(lead);
    setForm({ nom: lead.nom, contact: lead.contact, statut: lead.statut, notes: lead.notes, date_premier_contact: lead.date_premier_contact || '', offre_interet: lead.offre_interet || '', decouverte: lead.decouverte || '' });
    setSaveError(null);
    setModal(true);
  };
  const closeModal = () => { setModal(false); setSaveError(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveError(null);
    try {
      if (editing) {
        const { data } = await axios.put(`/api/leads/${editing.id}`, form);
        if (data.converted) {
          const msg = `✓ ${editing.nom} a été transféré(e) dans Clients !`;
          setToast(msg);
          setTimeout(() => setToast(null), 5000);
        }
      } else {
        await axios.post('/api/leads', form);
      }
      await fetchLeads();
      closeModal();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Une erreur est survenue. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce lead et tous ses suivis ?')) return;
    await axios.delete(`/api/leads/${id}`);
    setLeads(leads.filter(l => l.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  const displayed = leads.filter(l => {
    const matchFiltre = filtre === 'Tous' || l.statut === filtre;
    const matchSearch = l.nom.toLowerCase().includes(search.toLowerCase()) || (l.contact || '').toLowerCase().includes(search.toLowerCase());
    return matchFiltre && matchSearch;
  });

  return (
    <div>
      {toast && <div className="lead-toast">{toast}</div>}
      <div className="page-header">
        <h1 className="page-title">🎯 Lead Tracker</h1>
        <p className="page-subtitle">Gérez vos prospects et suivez leur progression.</p>
      </div>

      <div className="card">
        <div className="filters">
          <input className="search-input" placeholder="🔍 Chercher un lead..." value={search} onChange={e => setSearch(e.target.value)} />
          {STATUTS.map(s => (
            <button key={s} className={`filter-btn ${filtre === s ? 'active' : ''}`} onClick={() => setFiltre(s)}>
              {s === 'Tous' ? 'Tous' : STATUT_LABELS[s]}
            </button>
          ))}
          <button className="btn-primary" onClick={openNew}>+ Ajouter Lead</button>
        </div>

        <div className="table-wrapper">
          {displayed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <p>Aucun lead trouvé. Commencez par en ajouter un !</p>
            </div>
          ) : (
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Contact</th>
                  <th>Découverte</th>
                  <th>Offre d'intérêt</th>
                  <th>Statut</th>
                  <th>Achats</th>
                  <th>Détails</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(lead => (
                  <React.Fragment key={lead.id}>
                    <tr className={expanded === lead.id ? 'lead-row-expanded' : ''}>
                      <td className="lead-nom">{lead.nom}</td>
                      <td className="lead-contact">{lead.contact || '—'}</td>
                      <td>{lead.decouverte ? <span className="badge badge-decouverte">{lead.decouverte}</span> : <span className="lead-contact">—</span>}</td>
                      <td className="lead-offre">{lead.offre_interet || '—'}</td>
                      <td><span className={`badge ${BADGE_CLASS[lead.statut]}`}>{STATUT_LABELS[lead.statut]}</span></td>
                      <td className="lead-total">{lead.nb_achats > 0 ? <><strong>{fmt(lead.total_achats)}</strong><span className="lead-nb-achats"> ({lead.nb_achats})</span></> : '—'}</td>
                      <td>
                        <button className={`btn-suivis ${expanded === lead.id ? 'active' : ''}`} onClick={() => toggleExpand(lead.id)}>
                          📋 {expanded === lead.id ? '▲' : '▼'}
                        </button>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-edit" onClick={() => openEdit(lead)}>✏️</button>
                          <button className="btn-danger" onClick={() => handleDelete(lead.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                    {expanded === lead.id && (
                      <tr className="suivis-row">
                        <td colSpan={8}>
                          <LeadDetailPanel lead={lead} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <h2 className="modal-title">{editing ? 'Modifier le lead' : 'Nouveau lead'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nom *</label>
                <input type="text" placeholder="Nom du prospect" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Contact (téléphone / email)</label>
                <input type="text" placeholder="514-555-0000 ou email@exemple.com" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Date du premier contact</label>
                <input type="date" value={form.date_premier_contact} onChange={e => setForm({ ...form, date_premier_contact: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Statut</label>
                <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                  <option value="Hot">🔥 Hot</option>
                  <option value="Warm">🌡️ Warm</option>
                  <option value="Cold">❄️ Cold</option>
                  <option value="Purchased">✓ Purchased</option>
                </select>
              </div>
              <div className="form-group">
                <label>Comment t'a-t-elle découverte?</label>
                <select value={form.decouverte} onChange={e => setForm({ ...form, decouverte: e.target.value })}>
                  {DECOUVERTES.map(d => <option key={d} value={d}>{d || '— Non spécifié —'}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Offre d'intérêt</label>
                <input type="text" placeholder="Ex : Coaching 1:1, Formation X..." value={form.offre_interet} onChange={e => setForm({ ...form, offre_interet: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Notes rapides</label>
                <textarea rows={3} placeholder="Informations importantes sur ce lead..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              {saveError && <div className="modal-error">{saveError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Conversion...' : (editing ? 'Mettre à jour' : 'Ajouter')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
