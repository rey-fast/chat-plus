import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Grid3X3, User, LogOut } from 'lucide-react';

const Topbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#1A3F56] flex items-center justify-between px-4 z-50" data-testid="admin-topbar">
      {/* Left side */}
      <div className="flex items-center gap-4">
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
        <button className="text-white/80 hover:text-white">
          <Grid3X3 size={20} />
        </button>
        
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
