import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './Notes.css';

export default function Notes() {
  const [contenu, setContenu] = useState('');
  const [saved, setSaved] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    axios.get('/api/notes').then(r => { setContenu(r.data.contenu || ''); setSaved(true); }).catch(() => {});
  }, []);

  const save = async (text) => {
    await axios.put('/api/notes', { contenu: text });
    setSaved(true);
    setLastSaved(new Date());
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setContenu(val);
    setSaved(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(val), 1500);
  };

  const handleManualSave = () => {
    clearTimeout(timerRef.current);
    save(contenu);
  };

  const timeStr = lastSaved ? lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📝 Notes & Mémos</h1>
        <p className="page-subtitle">Votre espace de notes personnelles, sauvegardé automatiquement.</p>
      </div>

      <div className="card notes-card">
        <div className="notes-toolbar">
          <div className="save-status">
            {saved ? (
              <span className="status-saved">✅ {timeStr ? `Sauvegardé à ${timeStr}` : 'Sauvegardé'}</span>
            ) : (
              <span className="status-pending">⏳ Modifications non sauvegardées...</span>
            )}
          </div>
          <button className="btn-primary" onClick={handleManualSave}>💾 Sauvegarder maintenant</button>
        </div>
        <textarea
          className="notes-textarea"
          placeholder="Écrivez vos notes, idées, rappels, objectifs... Tout ce qui vous passe par la tête ! ✨&#10;&#10;Vos notes sont sauvegardées automatiquement après chaque modification."
          value={contenu}
          onChange={handleChange}
        />
        <div className="notes-footer">
          {contenu.length} caractère{contenu.length > 1 ? 's' : ''} · {contenu.split('\n').filter(l => l.trim()).length} ligne{contenu.split('\n').filter(l => l.trim()).length > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
