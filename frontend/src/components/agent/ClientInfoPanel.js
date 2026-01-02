import React, { useState } from 'react';
import { HelpCircle, Search, MessageSquare } from 'lucide-react';

const ClientInfoPanel = ({ conversation }) => {
  const [activeTab, setActiveTab] = useState('galeria');
  const [searchTerm, setSearchTerm] = useState('');

  // Mensagens predefinidas mockadas
  const predefinedMessages = [
    { id: 1, label: '15dias', message: 'Entraremos em contato nos próximos 15 dias.' },
    { id: 2, label: '50mega', message: 'Nosso plano de 50 mega está disponível.' },
    { id: 3, label: 'Acontecendo', message: 'O que está acontecendo?' },
    { id: 4, label: 'Aguarde', message: 'Por favor, aguarde um momento.' },
    { id: 5, label: 'Obrigado', message: 'Obrigado pelo contato!' },
  ];

  const filteredMessages = predefinedMessages.filter(m => 
    m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectMessage = (msg) => {
    console.log('Selected predefined message:', msg);
  };

  return (
    <div className="w-72 bg-[#F8F9FA] border-l border-gray-200 flex flex-col h-full" data-testid="client-info-panel">
      {/* Header com Info do Cliente */}
      <div className="bg-white p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
            <img 
              src={conversation?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation?.clientName || 'C')}&background=28A745&color=fff`}
              alt={conversation?.clientName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-medium text-gray-900">{conversation?.clientName}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <span>📅 {conversation?.date || '31/12/2025'}</span>
              <span className="mx-2">⏰ {conversation?.startTime || '08:44'}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {conversation?.channel || 'WhatsApp'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('galeria')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors
            ${activeTab === 'galeria' 
              ? 'text-blue-600 border-blue-600' 
              : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
        >
          🖼️ Galeria
        </button>
        <button
          onClick={() => setActiveTab('anotacoes')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors
            ${activeTab === 'anotacoes' 
              ? 'text-blue-600 border-blue-600' 
              : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
        >
          ✏️ Anotações
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="p-4 flex-shrink-0">
        {activeTab === 'galeria' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              🖼️
            </div>
            <p className="text-sm text-gray-500">Nenhuma mídia</p>
          </div>
        )}
        {activeTab === 'anotacoes' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              ✏️
            </div>
            <p className="text-sm text-gray-500">Nenhuma anotação</p>
          </div>
        )}
      </div>

      {/* Variáveis */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Variáveis</h3>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>🎫</span>
          <span>Protocolo: {conversation?.protocol || '2025123100007'}</span>
        </div>
      </div>

      {/* Divisor com controle de tamanho */}
      <div className="h-px bg-gray-200 mx-4" />

      {/* Mensagens Predefinidas */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0">
          <HelpCircle size={16} className="text-gray-400" />
          <h3 className="text-sm font-medium text-gray-500">Mensagens predefinidas</h3>
        </div>

        {/* Busca de Mensagens */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisa"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Lista de Mensagens Predefinidas */}
        <div className="flex-1 overflow-y-auto px-2">
          {filteredMessages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => handleSelectMessage(msg)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <span className="text-sm text-gray-600">{msg.label}</span>
              <MessageSquare size={14} className="text-gray-300 group-hover:text-blue-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientInfoPanel;
