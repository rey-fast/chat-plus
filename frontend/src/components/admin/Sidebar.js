import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Hash,
  GitBranch,
  Send,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  UserCog,
  UserCheck,
  UsersRound
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3, path: '/admin/relatorios' },
  { id: 'canais', label: 'Canais', icon: Hash, path: '/admin/canais' },
  { id: 'fluxo', label: 'Fluxo', icon: GitBranch, path: '/admin/fluxo' },
  { id: 'envio-lote', label: 'Envio em lote', icon: Send, path: '/admin/envio-lote' },
  { id: 'contatos', label: 'Contatos', icon: Users, path: '/admin/contatos' },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    submenu: [
      { id: 'administradores', label: 'Administradores', icon: UserCog, path: '/admin/configuracoes/administradores' },
      { id: 'agentes', label: 'Agentes', icon: UserCheck, path: '/admin/configuracoes/agentes' },
      { id: 'equipes', label: 'Equipes', icon: UsersRound, path: '/admin/configuracoes/equipes' },
    ]
  }
];

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState(['configuracoes']);

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isActive = (path) => location.pathname === path;
  const isSubmenuActive = (submenu) => submenu?.some(item => location.pathname === item.path);

  const renderMenuItem = (item) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const active = hasSubmenu ? isSubmenuActive(item.submenu) : isActive(item.path);

    return (
      <div key={item.id}>
        <button
          onClick={() => hasSubmenu ? toggleSubmenu(item.id) : navigate(item.path)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
            active
              ? 'bg-white/10 text-white border-l-4 border-[#20C997]'
              : 'text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
          }`}
          data-testid={`menu-${item.id}`}
        >
          <item.icon size={20} />
          {!collapsed && (
            <>
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {hasSubmenu && (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              )}
            </>
          )}
        </button>

        {/* Submenu */}
        {hasSubmenu && isExpanded && !collapsed && (
          <div className="bg-black/20">
            {item.submenu.map(subItem => (
              <button
                key={subItem.id}
                onClick={() => navigate(subItem.path)}
                className={`w-full flex items-center gap-3 pl-12 pr-4 py-2.5 text-left transition-colors ${
                  isActive(subItem.path)
                    ? 'bg-[#3A5D77] text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                data-testid={`menu-${subItem.id}`}
              >
                <subItem.icon size={16} />
                <span className="text-sm">{subItem.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-14 h-[calc(100vh-56px)] bg-[#1A3F56] transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      data-testid="admin-sidebar"
    >
      {/* Menu */}
      <nav className="py-2 overflow-y-auto h-full">
        {menuItems.map(renderMenuItem)}
      </nav>
    </aside>
  );
};

export default Sidebar;
