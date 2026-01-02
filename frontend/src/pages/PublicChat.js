import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Send, User, Loader2, AlertCircle, MessageCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PublicChat = () => {
  const { channelId } = useParams();
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [showClientForm, setShowClientForm] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/channels/${channelId}`);
        setChannel(response.data);
        
        if (!response.data.is_active) {
          setError('Este canal de atendimento está temporariamente indisponível.');
        }
      } catch (err) {
        console.error('Error fetching channel:', err);
        if (err.response?.status === 404) {
          setError('Canal de atendimento não encontrado.');
        } else {
          setError('Erro ao carregar o canal de atendimento.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChannel();
  }, [channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartChat = (e) => {
    e.preventDefault();
    
    if (!clientInfo.name.trim()) {
      return;
    }
    
    // Generate session ID
    const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setShowClientForm(false);
    
    // Add welcome message
    setMessages([
      {
        id: 1,
        type: 'system',
        text: `Olá ${clientInfo.name}! Bem-vindo ao nosso atendimento. Em breve um de nossos agentes irá atendê-lo.`,
        timestamp: new Date()
      }
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || sending) return;
    
    const newMessage = {
      id: messages.length + 1,
      type: 'client',
      text: inputMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setSending(true);
    
    // Simulate sending (in real implementation, this would connect to WebSocket or API)
    setTimeout(() => {
      setSending(false);
      // Add a system message indicating the message was received
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        type: 'system',
        text: 'Sua mensagem foi enviada. Aguarde um agente.',
        timestamp: new Date()
      }]);
    }, 500);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="animate-spin" size={24} />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#3A5D77] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">{channel?.name || 'Atendimento'}</h1>
              <p className="text-white/70 text-sm">
                {channel?.is_active ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {showClientForm ? (
          /* Client Info Form */
          <form onSubmit={handleStartChat} className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Bem-vindo ao nosso atendimento!
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Para iniciar a conversa, por favor informe seus dados:
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A5D77] focus:border-transparent"
                  placeholder="Seu nome"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A5D77] focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A5D77] focus:border-transparent"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full mt-6 px-6 py-3 bg-[#20C997] text-white font-medium rounded-lg hover:bg-[#1aab80] transition-colors"
            >
              Iniciar Conversa
            </button>
          </form>
        ) : (
          /* Chat Interface */
          <>
            {/* Messages Area */}
            <div className="h-96 overflow-y-auto p-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.type === 'client' ? 'flex justify-end' : ''}`}
                >
                  {message.type === 'system' ? (
                    <div className="bg-gray-200 rounded-lg px-4 py-2 max-w-[80%] inline-block">
                      <p className="text-gray-700 text-sm">{message.text}</p>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  ) : message.type === 'client' ? (
                    <div className="bg-[#3A5D77] rounded-lg px-4 py-2 max-w-[80%]">
                      <p className="text-white text-sm">{message.text}</p>
                      <span className="text-xs text-white/70 mt-1 block text-right">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 bg-[#20C997] rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-white" />
                      </div>
                      <div className="bg-white rounded-lg px-4 py-2 max-w-[80%] shadow-sm">
                        <p className="text-gray-700 text-sm">{message.text}</p>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#3A5D77] focus:border-transparent"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="w-10 h-10 bg-[#20C997] rounded-full flex items-center justify-center text-white hover:bg-[#1aab80] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicChat;
