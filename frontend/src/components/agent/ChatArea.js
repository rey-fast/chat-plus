import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  Paperclip, 
  Clock, 
  Users, 
  ArrowRight,
  X,
  Smile,
  Send,
  Download,
  CornerUpRight,
  Pencil,
  RotateCcw,
  MoveRight
} from 'lucide-react';

const ChatArea = ({ conversation }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    console.log('Sending message:', message);
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 bg-[#F5F5F5] flex items-center justify-center" data-testid="chat-area-empty">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={40} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">Selecione uma conversa</p>
          <p className="text-gray-400 text-sm mt-1">Escolha um atendimento para iniciar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F5F5F5]" data-testid="chat-area">
      {/* Header do Chat */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img 
              src={conversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.clientName)}&background=28A745&color=fff`}
              alt={conversation.clientName}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-medium text-gray-900">{conversation.clientName}</span>
            </div>
            <span className="text-xs text-gray-500">{conversation.department}</span>
          </div>
        </div>

        {/* Ações do Header */}
        <div className="flex items-center gap-1">
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Ligar"
          >
            <Phone size={18} />
          </button>
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Anexar"
          >
            <Paperclip size={18} />
          </button>
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Histórico"
          >
            <Clock size={18} />
          </button>
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Participantes"
          >
            <Users size={18} />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Desfazer"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Transferir"
          >
            <MoveRight size={18} />
          </button>
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil size={18} />
          </button>
          <button 
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Encerrar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages?.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Emoji"
          >
            <Smile size={22} />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite uma mensagem ou / para mensagens predefinidas"
              className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              data-testid="message-input"
            />
          </div>
          
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Microfone"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente de Bolha de Mensagem
const MessageBubble = ({ message }) => {
  const isClient = message.sender === 'client';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-end" data-testid="message-system">
        <div className="max-w-[70%]">
          <div className="flex items-center gap-2 justify-end mb-1">
            <span className="text-xs text-gray-500">Automático</span>
            <span className="text-xs text-gray-400">{message.time}</span>
            <div className="w-6 h-6 rounded-full bg-[#28A745] flex items-center justify-center text-white text-xs font-semibold">
              A
            </div>
          </div>
          <div className="bg-[#DCF8C6] rounded-lg rounded-tr-sm p-3 shadow-sm">
            {message.image && (
              <div className="relative mb-2 rounded-lg overflow-hidden">
                <img 
                  src={message.image} 
                  alt="Imagem" 
                  className="max-w-full rounded-lg"
                />
                <button className="absolute bottom-2 right-2 w-8 h-8 bg-[#28A745] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#229A3E] transition-colors">
                  <Download size={16} />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.text}</p>
            {message.options && (
              <div className="mt-2 space-y-1">
                {message.options.map((option, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    {option}
                  </div>
                ))}
              </div>
            )}
            {message.link && (
              <a href="#" className="text-sm text-blue-500 hover:underline mt-1 block">
                {message.link}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isClient) {
    return (
      <div className="flex justify-start" data-testid="message-client">
        <div className="max-w-[70%]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
              <img 
                src={message.avatar || 'https://ui-avatars.com/api/?name=C&background=E5E7EB&color=6B7280'}
                alt="Cliente"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-gray-700">{message.senderName}</span>
            <span className="text-xs text-gray-400">{message.time}</span>
          </div>
          <div className="relative group">
            <div className="bg-gray-200 rounded-lg rounded-tl-sm p-3 shadow-sm">
              <p className="text-sm text-gray-800">{message.text}</p>
            </div>
            <button className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <CornerUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mensagem do agente
  return (
    <div className="flex justify-end" data-testid="message-agent">
      <div className="max-w-[70%]">
        <div className="flex items-center gap-2 justify-end mb-1">
          <span className="text-xs text-gray-500">{message.senderName}</span>
          <span className="text-xs text-gray-400">{message.time}</span>
        </div>
        <div className="bg-white rounded-lg rounded-tr-sm p-3 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-800">{message.text}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
