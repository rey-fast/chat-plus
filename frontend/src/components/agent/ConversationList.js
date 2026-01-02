import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, MoreHorizontal, Star, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ConversationList = ({ 
  conversations, 
  selectedConversation, 
  onSelectConversation,
  activeSection,
  user
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    atendimento: true,
    espera: true
  });
  const navigate = useNavigate();
  const { logout } = useAuth();

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeConversations = conversations.filter(c => c.status === 'active');
  const waitingConversations = conversations.filter(c => c.status === 'waiting');

  const filteredActive = activeConversations.filter(c => 
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredWaiting = waitingConversations.filter(c => 
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (time) => {
    if (!time) return '';
    return time;
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full" data-testid="conversation-list">
      {/* Header do Agente */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            <img 
              src="https://ui-avatars.com/api/?name=Agente&background=1E1E1E&color=fff" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 truncate">Agente</span>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="text-xs text-gray-500">@{user?.username || 'agente'}</div>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4].map((star) => (
                <Star key={star} size={12} className="fill-yellow-400 text-yellow-400" />
              ))}
              <Star size={12} className="text-gray-300" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Sair"
            data-testid="logout-button"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Campo de Busca */}
      <div className="p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisa"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-100 border-0 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            data-testid="search-input"
          />
        </div>
      </div>

      {/* Lista de Conversas */}
      <div className="flex-1 overflow-y-auto">
        {/* Seção: Em Atendimento */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('atendimento')}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">Em atendimento</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {filteredActive.length}
              </span>
              {expandedSections.atendimento ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.atendimento && (
            <div className="pb-2">
              {filteredActive.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                />
              ))}
              {filteredActive.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-400 text-center">
                  Nenhum atendimento ativo
                </div>
              )}
            </div>
          )}
        </div>

        {/* Seção: Em Espera */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('espera')}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">Em espera</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {filteredWaiting.length}
              </span>
              {expandedSections.espera ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.espera && (
            <div className="pb-2">
              {filteredWaiting.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                />
              ))}
              {filteredWaiting.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-400 text-center">
                  Nenhum atendimento em espera
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente de Item de Conversa
const ConversationItem = ({ conversation, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all hover:bg-gray-50
        ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
      data-testid={`conversation-item-${conversation.id}`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          <img 
            src={conversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.clientName)}&background=28A745&color=fff`} 
            alt={conversation.clientName}
            className="w-full h-full object-cover"
          />
        </div>
        {conversation.isOnline && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-medium text-sm text-gray-900 truncate">
              {conversation.clientName}
            </span>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {conversation.time}
          </span>
        </div>
        
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {conversation.lastMessage}
        </p>
        
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">
            {conversation.department}
          </span>
          {conversation.waitTime && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              {conversation.waitTime}
            </span>
          )}
        </div>
      </div>
      
      <button 
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
        onClick={(e) => {
          e.stopPropagation();
          console.log('Options clicked for', conversation.id);
        }}
      >
        <MoreHorizontal size={14} />
      </button>
    </button>
  );
};

export default ConversationList;
