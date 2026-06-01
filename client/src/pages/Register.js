import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ prenom: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Les mots de passe ne correspondent pas.');
    if (form.password.length < 6) return setError('Le mot de passe doit faire au moins 6 caractères.');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/register', { prenom: form.prenom, username: form.username, password: form.password });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✨</div>
        <h1 className="auth-title">Créer mon compte</h1>
        <p className="auth-subtitle">Rejoignez Sales Tracker dès aujourd'hui !</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Prénom</label>
            <input type="text" placeholder="Votre prénom" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input type="text" placeholder="Choisissez un identifiant" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" placeholder="Minimum 6 caractères" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Confirmer le mot de passe</label>
            <input type="password" placeholder="Répétez votre mot de passe" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>
        <p className="auth-link">Déjà un compte ? <Link to="/login">Se connecter</Link></p>
      </div>
    </div>
  );
}
