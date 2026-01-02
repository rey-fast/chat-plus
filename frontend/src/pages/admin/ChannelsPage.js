import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  X,
  Copy,
  Check,
  Globe,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lightbulb,
  Settings
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Channel type icons and labels
const channelTypes = {
  site: { 
    icon: Globe, 
    label: 'Site',
    color: '#6B7280'
  },
  whatsapp: { 
    icon: MessageCircle, 
    label: 'WhatsApp',
    color: '#25D366'
  },
  telegram: { 
    icon: MessageCircle, 
    label: 'Telegram',
    color: '#0088cc'
  },
  instagram: { 
    icon: MessageCircle, 
    label: 'Instagram',
    color: '#E4405F'
  },
  facebook: { 
    icon: MessageCircle, 
    label: 'Facebook',
    color: '#1877F2'
  },
  email: { 
    icon: MessageCircle, 
    label: 'E-mail',
    color: '#EA4335'
  }
};

const ChannelsPage = () => {
  const { getAuthHeader } = useAuth();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 2, total: 0 });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [deletingChannel, setDeletingChannel] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'site'
  });
  const [formError, setFormError] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        per_page: pagination.perPage,
        ...(search && { search })
      });
      
      const response = await axios.get(`${BACKEND_URL}/api/channels?${params}`, {
        headers: getAuthHeader()
      });
      
      setChannels(response.data.channels);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, pagination.page, pagination.perPage, search]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleSelectChannel = (id) => {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedChannels.length === channels.length && channels.length > 0) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(channels.map(c => c.id));
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    setFormError('');
    
    try {
      await axios.post(`${BACKEND_URL}/api/channels`, formData, {
        headers: getAuthHeader()
      });
      
      setShowCreateModal(false);
      resetForm();
      fetchChannels();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Erro ao criar canal');
    }
  };

  const handleEditChannel = async (e) => {
    e.preventDefault();
    setFormError('');
    
    try {
      await axios.put(`${BACKEND_URL}/api/channels/${editingChannel.id}`, {
        name: formData.name
      }, {
        headers: getAuthHeader()
      });
      
      setShowEditModal(false);
      setEditingChannel(null);
      resetForm();
      fetchChannels();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Erro ao atualizar canal');
    }
  };

  const handleDeleteChannel = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/channels/${deletingChannel.id}`, {
        headers: getAuthHeader()
      });
      
      setShowDeleteModal(false);
      setDeletingChannel(null);
      fetchChannels();
    } catch (err) {
      console.error('Error deleting channel:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedChannels.length === 0) return;
    
    try {
      await axios.post(`${BACKEND_URL}/api/channels/bulk-delete`, selectedChannels, {
        headers: getAuthHeader()
      });
      
      setSelectedChannels([]);
      fetchChannels();
    } catch (err) {
      console.error('Error bulk deleting channels:', err);
    }
  };

  const handleToggleActive = async (channel) => {
    try {
      await axios.patch(`${BACKEND_URL}/api/channels/${channel.id}/toggle-active`, {}, {
        headers: getAuthHeader()
      });
      fetchChannels();
    } catch (err) {
      console.error('Error toggling channel:', err);
    }
  };

  const openEditModal = (channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (channel) => {
    setDeletingChannel(channel);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const copyToClipboard = async (text, channelId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(channelId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'site'
    });
    setFormError('');
  };

  const totalPages = Math.ceil(pagination.total / pagination.perPage);
  const startItem = pagination.total > 0 ? (pagination.page - 1) * pagination.perPage + 1 : 0;
  const endItem = Math.min(pagination.page * pagination.perPage, pagination.total);

  const getChannelTypeInfo = (type) => {
    return channelTypes[type] || channelTypes.site;
  };

  return (
    <AdminLayout>
      <div className="min-h-[calc(100vh-112px)]" data-testid="channels-page">
        {/* Page Header */}
        <div className="bg-[#3A5D77] rounded-t-lg px-4 py-3 flex items-center justify-between mb-0">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <h1 className="text-white text-lg font-medium">Canal</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-white/70 hover:text-white transition-colors">
              <Lightbulb size={20} />
            </button>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="bg-white border-x border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar"
              value={search}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#3A5D77]"
              data-testid="search-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={selectedChannels.length === 0}
              className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Excluir selecionados"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="p-2 text-gray-400 hover:text-[#3A5D77] transition-colors"
              title="Novo canal"
              data-testid="new-channel-btn"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-b-lg overflow-hidden shadow-sm">
          <table className="w-full" data-testid="channels-table">
            <thead>
              <tr className="bg-[#3A5D77] text-white text-sm">
                <th className="text-left py-3 px-4 font-medium w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="w-5 h-5 border-2 border-white/60 rounded flex items-center justify-center hover:border-white transition-colors"
                  >
                    {selectedChannels.length === channels.length && channels.length > 0 && (
                      <Check size={14} className="text-white" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium">Canal</th>
                <th className="text-left py-3 px-4 font-medium">Fluxo</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                <th className="text-center py-3 px-4 font-medium">Habilitado</th>
                <th className="text-center py-3 px-4 font-medium w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#3A5D77]"></div>
                      Carregando...
                    </div>
                  </td>
                </tr>
              ) : channels.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Globe size={48} className="text-gray-300" />
                      <p>Nenhum canal cadastrado</p>
                      <button
                        onClick={() => {
                          resetForm();
                          setShowCreateModal(true);
                        }}
                        className="text-[#3A5D77] hover:underline text-sm"
                      >
                        Criar primeiro canal
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                channels.map((channel) => {
                  const typeInfo = getChannelTypeInfo(channel.type);
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <tr
                      key={channel.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      data-testid={`channel-row-${channel.id}`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectChannel(channel.id)}
                          className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                            selectedChannels.includes(channel.id)
                              ? 'bg-[#3A5D77] border-[#3A5D77]'
                              : 'border-gray-300 hover:border-[#3A5D77]'
                          }`}
                        >
                          {selectedChannels.includes(channel.id) && (
                            <Check size={14} className="text-white" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${typeInfo.color}20` }}
                          >
                            <TypeIcon size={18} style={{ color: typeInfo.color }} />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-800">{channel.name}</span>
                            {channel.chat_link && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-gray-400 truncate max-w-[200px]">
                                  {window.location.origin}/chat/{channel.id}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(`${window.location.origin}/chat/${channel.id}`, channel.id)}
                                  className="text-gray-400 hover:text-[#3A5D77] transition-colors"
                                  title="Copiar link"
                                >
                                  {copiedLink === channel.id ? (
                                    <Check size={12} className="text-green-500" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {channel.flow_name || 'Padrão'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                            channel.status === 'connected'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {channel.status === 'connected' ? 'Conectado' : 'Desconectado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(channel)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            channel.is_active ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                              channel.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpen(actionMenuOpen === channel.id ? null : channel.id);
                          }}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          data-testid={`action-menu-${channel.id}`}
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {actionMenuOpen === channel.id && (
                          <div 
                            className="absolute right-4 top-10 bg-white border shadow-lg rounded py-1 z-20 min-w-[140px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => openEditModal(channel)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              data-testid={`edit-channel-${channel.id}`}
                            >
                              <Edit size={14} />
                              Editar
                            </button>
                            {channel.chat_link && (
                              <button
                                onClick={() => {
                                  copyToClipboard(`${window.location.origin}/chat/${channel.id}`, channel.id);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Copy size={14} />
                                Copiar link
                              </button>
                            )}
                            <button
                              onClick={() => openDeleteModal(channel)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                              data-testid={`delete-channel-${channel.id}`}
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Linhas por página</span>
              <select
                value={pagination.perPage}
                onChange={(e) => setPagination(prev => ({ ...prev, perPage: parseInt(e.target.value), page: 1 }))}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-[#3A5D77]"
              >
                <option value={2}>2</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {pagination.total > 0
                  ? `${startItem} - ${endItem} de ${pagination.total}`
                  : '0 - 0 de 0'}
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                  disabled={pagination.page === 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft size={18} />
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-1 text-sm border border-gray-300 rounded bg-white min-w-[32px] text-center">
                  {pagination.page}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= totalPages}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: totalPages }))}
                  disabled={pagination.page >= totalPages}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="create-channel-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-[#3A5D77] rounded-t-lg">
                <h2 className="text-lg font-semibold text-white">Novo Canal</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white/70 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateChannel} className="p-6">
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                    {formError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo do Canal</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#3A5D77]"
                      data-testid="input-type"
                    >
                      <option value="site">Site (Chat interno)</option>
                      <option value="whatsapp" disabled>WhatsApp (em breve)</option>
                      <option value="telegram" disabled>Telegram (em breve)</option>
                      <option value="instagram" disabled>Instagram (em breve)</option>
                      <option value="facebook" disabled>Facebook (em breve)</option>
                      <option value="email" disabled>E-mail (em breve)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Canal</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={formData.type === 'site' ? 'Ex: Chat do Site Principal' : 'Nome do canal'}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#3A5D77]"
                      required
                      data-testid="input-name"
                    />
                  </div>

                  {formData.type === 'site' && (
                    <div className="p-3 bg-blue-50 rounded text-sm text-blue-700">
                      <p className="font-medium mb-1">Canal Site</p>
                      <p>Um link de atendimento será gerado automaticamente. Os clientes poderão acessar esse link para iniciar uma conversa que será direcionada ao painel dos agentes.</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#20C997] text-white rounded hover:bg-[#1aab80] transition-colors"
                    data-testid="submit-create-channel"
                  >
                    Criar Canal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingChannel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="edit-channel-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-[#3A5D77] rounded-t-lg">
                <h2 className="text-lg font-semibold text-white">Editar Canal</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingChannel(null);
                  }}
                  className="text-white/70 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleEditChannel} className="p-6">
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                    {formError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo do Canal</label>
                    <input
                      type="text"
                      value={getChannelTypeInfo(editingChannel.type).label}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Canal</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#3A5D77]"
                      required
                    />
                  </div>

                  {editingChannel.chat_link && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Link de Atendimento</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={`${window.location.origin}/chat/${editingChannel.id}`}
                          disabled
                          className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`${window.location.origin}/chat/${editingChannel.id}`, editingChannel.id)}
                          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                        >
                          {copiedLink === editingChannel.id ? (
                            <Check size={18} className="text-green-500" />
                          ) : (
                            <Copy size={18} className="text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingChannel(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#20C997] text-white rounded hover:bg-[#1aab80] transition-colors"
                    data-testid="submit-edit-channel"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingChannel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="delete-channel-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-[#1A3F56] mb-4">Confirmar Exclusão</h2>
                <p className="text-gray-600 mb-6">
                  Tem certeza que deseja excluir o canal <strong>{deletingChannel.name}</strong>?
                  {deletingChannel.type === 'site' && (
                    <span className="block mt-2 text-sm text-red-600">
                      O link de atendimento deixará de funcionar.
                    </span>
                  )}
                </p>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingChannel(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteChannel}
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    data-testid="confirm-delete-channel"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ChannelsPage;
