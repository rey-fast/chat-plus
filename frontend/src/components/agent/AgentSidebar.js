import React from 'react';
import { 
  MessageSquare, 
  Clock, 
  Users, 
  MessageCircle,
  Phone,
  Instagram,
  Facebook,
  Mail,
  Globe,
  Video,
  Camera,
  PlayCircle,
  AtSign,
  Send
} from 'lucide-react';

const AgentSidebar = ({ activeSection, onChangeSection }) => {
  const menuItems = [
    { id: 'atendimento', icon: MessageSquare, label: 'Atendimentos' },
    { id: 'espera', icon: Clock, label: 'Em Espera' },
    { id: 'contatos', icon: Users, label: 'Contatos' },
  ];

  // Canais - serão ativados futuramente no painel do admin
  const channels = [
    { id: 'chat', icon: MessageCircle, label: 'Chat', active: true },
    { id: 'whatsapp', icon: Phone, label: 'WhatsApp', active: false },
    { id: 'instagram', icon: Instagram, label: 'Instagram', active: false },
    { id: 'facebook', icon: Facebook, label: 'Facebook', active: false },
    { id: 'telegram', icon: Send, label: 'Telegram', active: false },
    { id: 'email', icon: Mail, label: 'E-mail', active: false },
    { id: 'video', icon: Video, label: 'Video', active: false },
    { id: 'webcam', icon: Camera, label: 'Webcam', active: false },
    { id: 'voip', icon: Phone, label: 'VoIP', active: false },
    { id: 'sms', icon: AtSign, label: 'SMS', active: false },
  ];

  return (
    <div className="w-14 bg-[#1E1E1E] flex flex-col items-center py-3" data-testid="agent-sidebar">
      {/* Menu Principal */}
      <div className="flex flex-col gap-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeSection(item.id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
              ${activeSection === item.id 
                ? 'bg-[#3B82F6] text-white' 
                : 'text-gray-400 hover:bg-[#2D2D2D] hover:text-gray-200'
              }`}
            title={item.label}
            data-testid={`sidebar-${item.id}`}
          >
            <item.icon size={20} />
          </button>
        ))}
      </div>

      {/* Divisor */}
      <div className="w-8 h-px bg-gray-700 my-4" />

      {/* Canais */}
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {channels.map((channel) => (
          <button
            key={channel.id}
            disabled={!channel.active}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
              ${channel.active 
                ? 'text-gray-400 hover:bg-[#2D2D2D] hover:text-gray-200 cursor-pointer' 
                : 'text-gray-600 cursor-not-allowed opacity-40'
              }`}
            title={channel.active ? channel.label : `${channel.label} (desativado)`}
          >
            <channel.icon size={18} />
          </button>
        ))}
      </div>

      {/* Botão de telefone no final */}
      <div className="mt-auto pt-4">
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#2D2D2D] hover:text-gray-200 transition-all"
          title="Telefone"
        >
          <Phone size={18} />
        </button>
      </div>
    </div>
  );
};

export default AgentSidebar;
