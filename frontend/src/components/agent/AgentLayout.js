import React from 'react';
import AgentSidebar from './AgentSidebar';
import ConversationList from './ConversationList';
import ChatArea from './ChatArea';
import ClientInfoPanel from './ClientInfoPanel';

const AgentLayout = ({ 
  conversations, 
  selectedConversation, 
  onSelectConversation,
  activeSection,
  onChangeSection,
  user 
}) => {
  return (
    <div className="h-screen w-full flex bg-[#F8F9FA]" data-testid="agent-layout">
      {/* Sidebar de Ícones */}
      <AgentSidebar 
        activeSection={activeSection} 
        onChangeSection={onChangeSection} 
      />
      
      {/* Lista de Atendimentos/Contatos */}
      <ConversationList 
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={onSelectConversation}
        activeSection={activeSection}
        user={user}
      />
      
      {/* Área de Chat */}
      <div className="flex-1 flex">
        <ChatArea 
          conversation={selectedConversation} 
        />
        
        {/* Painel de Informações do Cliente */}
        {selectedConversation && (
          <ClientInfoPanel 
            conversation={selectedConversation} 
          />
        )}
      </div>
    </div>
  );
};

export default AgentLayout;
