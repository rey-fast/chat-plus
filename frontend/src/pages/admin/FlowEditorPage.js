import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Topbar from '../../components/admin/Topbar';
import Sidebar from '../../components/admin/Sidebar';
import {
  ArrowLeft,
  GitBranch,
  Anchor,
  Paperclip,
  GitFork,
  MessageSquare,
  Image,
  Menu,
  Users,
  Globe,
  MapPin,
  FileText,
  Code,
  Clock,
  Brain,
  StickyNote,
  ThumbsUp,
  Download,
  Eye,
  Link2,
  Bot,
  Terminal,
  Zap,
  CheckCircle,
  Variable,
  Send,
  LayoutList,
  Settings,
  Play,
  History,
  Save,
  Upload
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Tipos de componentes disponíveis no painel de opções
const componentTypes = [
  { id: 'options', label: 'Opções', icon: LayoutList, isHeader: true },
  { id: 'anchor', label: 'Âncora', icon: Anchor },
  { id: 'attachment', label: 'Anexo', icon: Paperclip },
  { id: 'condition', label: 'Condição', icon: GitFork },
  { id: 'context', label: 'Contexto - Assistente Virtual', icon: Bot },
  { id: 'set_value', label: 'Definir valor', icon: Variable },
  { id: 'data_input', label: 'Entrada de dados', icon: FileText },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'webchat_event', label: 'Evento Webchat', icon: Globe },
  { id: 'finish', label: 'Finalizar atendimento', icon: CheckCircle },
  { id: 'gogenier', label: 'GOgenier', icon: Zap },
  { id: 'integrations', label: 'Integrações', icon: Settings },
  { id: 'goto', label: 'Ir Para', icon: Link2 },
  { id: 'goto_flow', label: 'Ir para Fluxo (Beta)', icon: GitBranch },
  { id: 'location', label: 'Localização', icon: MapPin },
  { id: 'message', label: 'Mensagem', icon: MessageSquare },
  { id: 'menu', label: 'Menu', icon: Menu },
  { id: 'template', label: 'Modelo de mensagem', icon: FileText },
  { id: 'nlp', label: 'NLP (IA)', icon: Brain },
  { id: 'note', label: 'Nota de atendimento', icon: StickyNote },
  { id: 'facebook_reaction', label: 'Reação do Facebook', icon: ThumbsUp },
  { id: 'receive_attachment', label: 'Receber Anexo', icon: Download },
  { id: 'ocr', label: 'Reconhecimento Óptico (OCR)', icon: Eye },
  { id: 'url_request', label: 'Requisição de URL', icon: Globe },
  { id: 'rpa', label: 'RPA', icon: Bot },
  { id: 'script', label: 'Script', icon: Terminal },
  { id: 'smart_delay', label: 'Smart Delay (Beta)', icon: Clock },
];

// Cores para cada tipo de bloco
const blockColors = {
  flow_start: { bg: '#FFFFFF', border: '#E0E0E0', text: '#333333', icon: '#666666' },
  condition: { bg: '#E8F5E9', border: '#A5D6A7', text: '#2E7D32', icon: '#43A047' },
  anchor: { bg: '#FFF8E1', border: '#FFE082', text: '#F57F17', icon: '#FFA000' },
  set_value: { bg: '#F3E5F5', border: '#CE93D8', text: '#7B1FA2', icon: '#AB47BC' },
  image: { bg: '#FFF3E0', border: '#FFCC80', text: '#E65100', icon: '#FB8C00' },
  message: { bg: '#FFF3E0', border: '#FFCC80', text: '#E65100', icon: '#FB8C00' },
  menu: { bg: '#E3F2FD', border: '#90CAF9', text: '#1565C0', icon: '#1E88E5' },
  default: { bg: '#F5F5F5', border: '#E0E0E0', text: '#616161', icon: '#757575' }
};

// Componente para um bloco/nó do fluxo
const FlowBlock = ({ node, isSelected, onClick, style }) => {
  const colors = blockColors[node.type] || blockColors.default;
  
  const getIcon = () => {
    switch (node.type) {
      case 'flow_start': return GitBranch;
      case 'condition': return GitFork;
      case 'anchor': return Anchor;
      case 'set_value': return Variable;
      case 'image': return Image;
      case 'message': return MessageSquare;
      case 'menu': return Menu;
      default: return MessageSquare;
    }
  };
  
  const Icon = getIcon();
  
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer
        transition-all duration-150 min-w-[180px] max-w-[280px]
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        hover:shadow-md
      `}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        ...style
      }}
    >
      <Icon size={16} style={{ color: colors.icon, flexShrink: 0 }} />
      <span 
        className="text-sm font-medium truncate"
        style={{ color: colors.text }}
      >
        {node.label}
      </span>
      {node.badge && (
        <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
          {node.badge}
        </span>
      )}
    </div>
  );
};

// Componente para conectores entre blocos
const Connector = ({ fromY, toY, startX }) => {
  const height = toY - fromY - 36; // Altura do bloco
  
  if (height <= 0) return null;
  
  return (
    <div 
      className="absolute"
      style={{
        left: startX + 90,
        top: fromY + 36,
        width: 2,
        height: height,
        backgroundColor: '#BDBDBD'
      }}
    >
      {/* Seta para baixo */}
      <div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '6px solid #BDBDBD'
        }}
      />
    </div>
  );
};

const FlowEditorPage = () => {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, getAuthHeader } = useAuth();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Buscar dados do fluxo
  const fetchFlow = useCallback(async () => {
    if (!flowId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/flows/${flowId}`, {
        headers: getAuthHeader()
      });
      
      setFlow(response.data);
      setNodes(response.data.nodes || []);
      setEdges(response.data.edges || []);
    } catch (err) {
      console.error('Error fetching flow:', err);
      alert('Erro ao carregar fluxo');
      navigate('/admin/fluxo');
    } finally {
      setLoading(false);
    }
  }, [flowId, getAuthHeader, navigate]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchFlow();
    }
  }, [authLoading, user, fetchFlow]);

  // Proteção de rota
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (user.role !== 'admin') {
        navigate('/agent');
      }
    }
  }, [user, authLoading, navigate]);

  // Salvar fluxo
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${BACKEND_URL}/api/flows/${flowId}`, {
        name: flow.name,
        nodes: nodes,
        edges: edges
      }, {
        headers: getAuthHeader()
      });
      
      alert('Fluxo salvo com sucesso!');
    } catch (err) {
      console.error('Error saving flow:', err);
      alert('Erro ao salvar fluxo');
    } finally {
      setSaving(false);
    }
  };

  // Adicionar componente ao canvas (placeholder)
  const handleAddComponent = (componentType) => {
    // Por enquanto apenas feedback visual
    console.log('Adicionar componente:', componentType);
    // A lógica real de adicionar nós será implementada futuramente
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A3F56]"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC]">
      <Topbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <Sidebar collapsed={sidebarCollapsed} />
      
      <main
        className={`pt-14 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Conteúdo principal sem padding */}
        <div className="h-[calc(100vh-56px)] flex flex-col">
          
          {/* Área do editor */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Painel de Opções/Componentes */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
              {/* Cabeçalho do painel */}
              <div className="bg-[#3A5D77] text-white px-4 py-3 flex items-center gap-2">
                <LayoutList size={18} />
                <span className="font-medium text-sm">Opções</span>
              </div>
              
              {/* Lista de componentes */}
              <div className="flex-1 overflow-y-auto">
                {componentTypes.filter(c => !c.isHeader).map((component) => (
                  <button
                    key={component.id}
                    onClick={() => handleAddComponent(component)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                  >
                    <component.icon size={16} className="text-gray-500 flex-shrink-0" />
                    <span className="truncate">{component.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Canvas do fluxo */}
            <div className="flex-1 flex flex-col bg-[#F8F9FA]">
              {/* Breadcrumb */}
              <div className="bg-white border-b border-gray-200 px-4 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Canais</span>
                  <span className="text-gray-400">{'>'}</span>
                  <span className="text-gray-500">Fluxo</span>
                  <span className="text-gray-400">{'>'}</span>
                  <span className="text-[#1A3F56] font-medium">{flow?.name || 'Carregando...'}</span>
                </div>
              </div>
              
              {/* Área do canvas */}
              <div className="flex-1 overflow-auto p-6">
                {/* Conteúdo do fluxo */}
                <div className="relative min-h-full">
                  {nodes.length === 0 ? (
                    // Canvas vazio
                    <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                      <GitBranch size={64} className="mb-4 opacity-30" />
                      <p className="text-lg font-medium">Fluxo vazio</p>
                      <p className="text-sm mt-2">Arraste componentes do painel lateral para começar</p>
                    </div>
                  ) : (
                    // Renderizar nós do fluxo
                    <div className="relative">
                      {/* Bloco inicial do fluxo */}
                      <FlowBlock
                        node={{
                          id: 'flow_start',
                          type: 'flow_start',
                          label: `Fluxo: ${flow?.name || ''}`
                        }}
                        isSelected={selectedNode === 'flow_start'}
                        onClick={() => setSelectedNode('flow_start')}
                        style={{ marginBottom: 16 }}
                      />
                      
                      {/* Nós do fluxo */}
                      {nodes.map((node, index) => (
                        <React.Fragment key={node.id || index}>
                          {/* Conector */}
                          <div className="flex justify-center my-2">
                            <div className="w-0.5 h-6 bg-gray-300"></div>
                          </div>
                          
                          {/* Bloco */}
                          <FlowBlock
                            node={node}
                            isSelected={selectedNode === node.id}
                            onClick={() => setSelectedNode(node.id)}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Barra de ações inferior */}
          <div className="bg-[#2B3E50] px-4 py-3 flex items-center justify-between">
            {/* Botão Voltar */}
            <button
              onClick={() => navigate('/admin/fluxo')}
              className="flex items-center gap-2 px-4 py-2 bg-[#4A5568] hover:bg-[#5A6578] text-white rounded transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            
            {/* Botões de ação à direita */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => alert('Testar fluxo - Em desenvolvimento')}
                className="flex items-center gap-2 px-4 py-2 bg-[#3A5D77] hover:bg-[#4A6D87] text-white rounded transition-colors text-sm"
              >
                <Play size={16} />
                Testar fluxo
              </button>
              
              <button
                onClick={() => alert('Histórico - Em desenvolvimento')}
                className="flex items-center gap-2 px-4 py-2 bg-[#4A5568] hover:bg-[#5A6578] text-white rounded transition-colors text-sm"
              >
                <History size={16} />
                Histórico
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#4A5568] hover:bg-[#5A6578] text-white rounded transition-colors text-sm disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              
              <button
                onClick={() => alert('Salvar e publicar - Em desenvolvimento')}
                className="flex items-center gap-2 px-4 py-2 bg-[#3A5D77] hover:bg-[#4A6D87] text-white rounded transition-colors text-sm"
              >
                <Upload size={16} />
                Salvar e publicar
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FlowEditorPage;
