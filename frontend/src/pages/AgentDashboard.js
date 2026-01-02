import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, LogOut, User } from 'lucide-react';

const AgentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC]" data-testid="agent-dashboard">
      {/* Topbar */}
      <header className="h-14 bg-[#1A3F56] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#20C997] rounded-lg flex items-center justify-center">
            <MessageCircle size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">ChatPlus</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm">{user?.username || 'Agente'}</span>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm"
            data-testid="logout-button"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-[#1A3F56] rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A3F56] mb-4" data-testid="agent-title">
            Painel do Agente
          </h1>
          <p className="text-gray-500">(em construção)</p>
        </div>
      </main>
    </div>
  );
};

export default AgentDashboard;
