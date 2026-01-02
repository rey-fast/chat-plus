import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AgentLayout from '../components/agent/AgentLayout';

// Dados mockados para demonstrar o layout visual
const mockConversations = [
  {
    id: '1',
    clientName: 'Cliente 1',
    avatar: null,
    lastMessage: 'Bom dia, eu me chamo Agente e darei início ao seu...',
    department: 'Financeiro',
    status: 'active',
    time: '08:45',
    waitTime: null,
    isOnline: true,
    date: '31/12/2025',
    startTime: '08:44',
    channel: 'WhatsApp',
    protocol: '2025123100007',
    messages: [
      {
        sender: 'client',
        senderName: 'Cliente 1',
        text: 'Oi',
        time: '08:44',
        avatar: null
      },
      {
        sender: 'system',
        senderName: 'Automático',
        text: 'Seja bem-vindo(a) à Central de Atendimento ao Cliente.\n\nVocê já é nosso cliente?',
        time: '08:44',
        options: ['1 - Sim', '2 - Não'],
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop'
      },
      {
        sender: 'client',
        senderName: 'Cliente 1',
        text: '1',
        time: '08:44',
        avatar: null
      },
      {
        sender: 'system',
        senderName: 'Automático',
        text: 'Que bom ter você conosco. 😍\nMe diz agora qual o motivo do seu contato:',
        time: '08:44',
        options: [
          '1 - Suporte',
          '2 - Solicitar Boleto Para Pagamento',
          '3 - Envio de Comprovante',
          '4 - Solicitar Desbloqueio Temporário'
        ],
        link: 'Ler mais...'
      }
    ]
  },
  {
    id: '2',
    clientName: 'Cliente 2',
    avatar: null,
    lastMessage: 'Entendi, você precisa de suporte. Aguarde um...',
    department: 'Suporte',
    status: 'waiting',
    time: 'Agora',
    waitTime: '00:00:30',
    isOnline: true,
    date: '31/12/2025',
    startTime: '08:50',
    channel: 'Chat',
    protocol: '2025123100008',
    messages: [
      {
        sender: 'client',
        senderName: 'Cliente 2',
        text: 'Olá, preciso de ajuda',
        time: '08:50',
        avatar: null
      },
      {
        sender: 'system',
        senderName: 'Automático',
        text: 'Olá! Bem-vindo ao nosso atendimento. Como posso ajudá-lo hoje?',
        time: '08:50'
      },
      {
        sender: 'client',
        senderName: 'Cliente 2',
        text: 'Tenho uma dúvida sobre meu plano',
        time: '08:51',
        avatar: null
      },
      {
        sender: 'system',
        senderName: 'Automático',
        text: 'Entendi, você precisa de suporte. Aguarde um momento que vou transferir para um de nossos atendentes.',
        time: '08:51'
      }
    ]
  }
];

const AgentDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [activeSection, setActiveSection] = useState('atendimento');

  useEffect(() => {
    // Redireciona se não estiver autenticado ou não for agente
    if (!loading && !user) {
      navigate('/login');
    } else if (!loading && user && user.role !== 'agent') {
      // Se for admin, redireciona para o painel admin
      if (user.role === 'admin') {
        navigate('/admin');
      }
    }
  }, [user, loading, navigate]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleChangeSection = (section) => {
    setActiveSection(section);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="agent-dashboard">
      <AgentLayout
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        activeSection={activeSection}
        onChangeSection={handleChangeSection}
        user={user}
      />
    </div>
  );
};

export default AgentDashboard;
