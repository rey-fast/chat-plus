import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import AgentDashboard from './pages/AgentDashboard';
import DashboardPage from './pages/admin/DashboardPage';
import AgentsPage from './pages/admin/AgentsPage';
import AdminsPage from './pages/admin/AdminsPage';
import ChannelsPage from './pages/admin/ChannelsPage';
import FlowsPage from './pages/admin/FlowsPage';
import FlowEditorPage from './pages/admin/FlowEditorPage';
import TeamsPage from './pages/admin/TeamsPage';
import PlaceholderPage from './pages/admin/PlaceholderPage';
import PublicChat from './pages/PublicChat';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Public chat route */}
          <Route path="/chat/:channelId" element={<PublicChat />} />
          
          {/* Agent routes */}
          <Route path="/agent" element={<AgentDashboard />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/relatorios" element={<PlaceholderPage />} />
          <Route path="/admin/canais" element={<ChannelsPage />} />
          <Route path="/admin/fluxo" element={<FlowsPage />} />
          <Route path="/admin/fluxo/:flowId" element={<FlowEditorPage />} />
          <Route path="/admin/envio-lote" element={<PlaceholderPage />} />
          <Route path="/admin/contatos" element={<PlaceholderPage />} />
          <Route path="/admin/configuracoes/administradores" element={<AdminsPage />} />
          <Route path="/admin/configuracoes/agentes" element={<AgentsPage />} />
          <Route path="/admin/configuracoes/equipes" element={<TeamsPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;