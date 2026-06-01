import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Clients.css';

const emptyForm = { nom: '', contact: '', notes: '', date_premier_contact: '', offre_interet: '' };
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'CAD' });
const today = new Date().toISOString().slice(0, 10);

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

function AchatsClientPanel({ client }) {
  const [achats, setAchats] = useState(null);
  const [form, setForm] = useState({ date_achat: today, produit: '', montant: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await axios.get(`/api/achats/client/${client.id}`);
    setAchats(data);
  }, [client.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.produit.trim() || !form.montant) return;
    setSaving(true);
    try {
      await axios.post(`/api/achats/client/${client.id}`, form);
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
    <div className="client-achats-panel">
      <div className="client-achats-header">🛒 Historique des achats</div>

      {achats === null ? (
        <div className="client-achats-loading">Chargement...</div>
      ) : achats.length === 0 ? (
        <div className="client-achats-empty">Aucun achat enregistré.</div>
      ) : (
        <>
          <ul className="client-achats-list">
            {achats.map(a => (
              <li key={a.id} className="client-achat-item">
                <span className="client-achat-date">{fmtDateCourt(a.date_achat)}</span>
                <span className="client-achat-produit">{a.produit}</span>
                <span className="client-achat-montant">{fmt(a.montant)}</span>
                <button className="client-achat-delete" onClick={() => handleDelete(a.id)}>×</button>
              </li>
            ))}
          </ul>
          <div className="client-achats-total">Total : <strong>{fmt(total)}</strong></div>
        </>
      )}

      <form className="client-achats-form" onSubmit={handleAdd}>
        <input type="date" value={form.date_achat} onChange={e => setForm({ ...form, date_achat: e.target.value })} required className="ca-input" />
        <input type="text" placeholder="Produit / service" value={form.produit} onChange={e => setForm({ ...form, produit: e.target.value })} required className="ca-input ca-input-flex" />
        <input type="number" placeholder="Montant $" min="0" step="0.01" value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} required className="ca-input ca-input-small" />
        <button type="submit" className="ca-btn" disabled={saving}>{saving ? '...' : '+'}</button>
      </form>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const fetchClients = useCallback(async () => {
    const { data } = await axios.get('/api/clients');
    setClients(data);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ nom: c.nom, contact: c.contact, notes: c.notes || '', date_premier_contact: c.date_premier_contact || '', offre_interet: c.offre_interet || '' });
    setModal(true);
  };
  const closeModal = () => setModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) await axios.put(`/api/clients/${editing.id}`, form);
      else await axios.post('/api/clients', form);
      await fetchClients();
      closeModal();
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    await axios.delete(`/api/clients/${id}`);
    setClients(clients.filter(c => c.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  const displayed = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👥 Gestion des Clients</h1>
        <p className="page-subtitle">Votre répertoire complet de clients.</p>
      </div>

      <div className="card">
        <div className="filters">
          <input className="search-input" placeholder="🔍 Chercher un client..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={openNew}>+ Ajouter Client</button>
        </div>

        {displayed.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">👥</div><p>Aucun client trouvé. Ajoutez votre premier client !</p></div>
        ) : (
          <div className="clients-list">
            {displayed.map(client => (
              <div key={client.id} className={`client-card ${expanded === client.id ? 'client-card-open' : ''}`}>
                <div className="client-main">
                  <div className="client-avatar">{client.nom.charAt(0).toUpperCase()}</div>
                  <div className="client-info">
                    <div className="client-nom">{client.nom}</div>
                    {client.contact && <div className="client-contact">{client.contact}</div>}
                    {client.offre_interet && <div className="client-offre">🎁 {client.offre_interet}</div>}
                    {client.date_premier_contact && (
                      <div className="client-premier-contact">📅 Premier contact : {fmtDate(client.date_premier_contact)}</div>
                    )}
                    <div className="client-stats">
                      <span className="client-total">{fmt(client.total_achats)}</span>
                      <span className="client-achats">{client.nb_achats} achat{client.nb_achats > 1 ? 's' : ''}</span>
                    </div>
                    {client.notes && <div className="client-notes">📝 {client.notes}</div>}
                  </div>
                  <div className="client-actions">
                    <button className={`btn-suivis ${expanded === client.id ? 'active' : ''}`} onClick={() => toggleExpand(client.id)}>
                      🛒 {expanded === client.id ? '▲' : '▼'}
                    </button>
                    <button className="btn-edit" onClick={() => openEdit(client)}>✏️</button>
                    <button className="btn-danger" onClick={() => handleDelete(client.id)}>🗑️</button>
                  </div>
                </div>
                {expanded === client.id && <AchatsClientPanel client={client} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <h2 className="modal-title">{editing ? 'Modifier le client' : 'Nouveau client'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nom *</label>
                <input type="text" placeholder="Nom du client" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required />
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
                <label>Offre achetée</label>
                <input type="text" placeholder="Ex : Coaching 1:1, Formation X..." value={form.offre_interet} onChange={e => setForm({ ...form, offre_interet: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={4} placeholder="Informations importantes sur ce client..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Sauvegarde...' : (editing ? 'Mettre à jour' : 'Ajouter')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
