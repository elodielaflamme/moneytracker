import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LeadTracker from './pages/LeadTracker';
import Ventes from './pages/Ventes';
import Clients from './pages/Clients';
import Content from './pages/Content';
import Statistiques from './pages/Statistiques';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<LeadTracker />} />
            <Route path="ventes" element={<Ventes />} />
            <Route path="clients" element={<Clients />} />
            <Route path="content" element={<Content />} />
            <Route path="statistiques" element={<Statistiques />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
