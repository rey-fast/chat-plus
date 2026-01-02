import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import AgentDashboard from './pages/AgentDashboard';
import DashboardPage from './pages/admin/DashboardPage';
import AgentsPage from './pages/admin/AgentsPage';
import PlaceholderPage from './pages/admin/PlaceholderPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Agent routes */}
          <Route path="/agent" element={<AgentDashboard />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/relatorios" element={<PlaceholderPage />} />
          <Route path="/admin/canais" element={<PlaceholderPage />} />
          <Route path="/admin/fluxo" element={<PlaceholderPage />} />
          <Route path="/admin/envio-lote" element={<PlaceholderPage />} />
          <Route path="/admin/contatos" element={<PlaceholderPage />} />
          <Route path="/admin/configuracoes/administradores" element={<PlaceholderPage />} />
          <Route path="/admin/configuracoes/agentes" element={<AgentsPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;