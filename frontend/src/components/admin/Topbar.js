import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, User, LogOut, MessageCircle } from 'lucide-react';

const Topbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#1A3F56] flex items-center justify-between px-4 z-50" data-testid="admin-topbar">
      {/* Left side - Logo and Menu Toggle */}
      <div className="flex items-center gap-4">
        {/* Logo - sempre visível */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 bg-[#20C997] rounded-lg flex items-center justify-center">
            <MessageCircle size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold">ChatPlus</span>
        </div>
        
        <button
          onClick={onToggleSidebar}
          className="text-white/80 hover:text-white p-1"
          data-testid="toggle-sidebar-btn"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm">Administrador</span>
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
            <User size={20} className="text-[#1A3F56]" />
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-white/80 hover:text-white text-sm ml-2"
          data-testid="logout-button"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
