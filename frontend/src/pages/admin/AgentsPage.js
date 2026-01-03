import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Search,
  Plus,
  MoreHorizontal,
  CheckSquare,
  Square,
  Trash2,
  Edit,
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AgentsPage = () => {
  const { getAuthHeader } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [deletingAgent, setDeletingAgent] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        per_page: pagination.perPage,
        ...(search && { search })
      });
      
      const response = await axios.get(`${BACKEND_URL}/api/agents?${params}`, {
        headers: getAuthHeader()
      });
      
      setAgents(response.data.agents);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, pagination.page, pagination.perPage, search]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleSelectAll = () => {
    if (selectedAgents.length === agents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(agents.map(a => a.id));
    }
  };

  const toggleSelectAgent = (id) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setFormError('');
    
    try {
      await axios.post(`${BACKEND_URL}/api/agents`, formData, {
        headers: getAuthHeader()
      });
      
      setShowCreateModal(false);
      resetForm();
      fetchAgents();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Erro ao criar agente');
    }
  };

  const handleEditAgent = async (e) => {
    e.preventDefault();
    setFormError('');
    
    const updateData = { ...formData };
    if (!updateData.password) {
      delete updateData.password;
    }
    
    try {
      await axios.put(`${BACKEND_URL}/api/agents/${editingAgent.id}`, updateData, {
        headers: getAuthHeader()
      });
      
      setShowEditModal(false);
      setEditingAgent(null);
      resetForm();
      fetchAgents();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Erro ao atualizar agente');
    }
  };

  const handleDeleteAgent = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/agents/${deletingAgent.id}`, {
        headers: getAuthHeader()
      });
      
      setShowDeleteModal(false);
      setDeletingAgent(null);
      fetchAgents();
    } catch (err) {
      console.error('Error deleting agent:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAgents.length === 0) return;
    
    try {
      await axios.post(`${BACKEND_URL}/api/agents/bulk-delete`, selectedAgents, {
        headers: getAuthHeader()
      });
      
      setSelectedAgents([]);
      fetchAgents();
    } catch (err) {
      console.error('Error bulk deleting agents:', err);
    }
  };

  const openEditModal = (agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      username: agent.username,
      email: agent.email,
      password: '',
      is_active: agent.is_active
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (agent) => {
    setDeletingAgent(agent);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      is_active: true
    });
    setFormError('');
    setShowPassword(false);
  };

  const totalPages = Math.ceil(pagination.total / pagination.perPage);
  const startItem = (pagination.page - 1) * pagination.perPage + 1;
  const endItem = Math.min(pagination.page * pagination.perPage, pagination.total);

  return (
    <AdminLayout>
      <div className="min-h-[calc(100vh-112px)]" data-testid="agents-page">
        {/* Breadcrumb */}
        <div className="mb-4">
          <span className="text-gray-500 text-sm">Configuração</span>
          <span className="text-gray-400 mx-2">{'>'}</span>
          <span className="text-[#1A3F56] text-sm font-medium">Agentes</span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between mb-4">
          {/* Left side - Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {selectedAgents.length === agents.length && agents.length > 0 ? (
                <CheckSquare size={16} className="text-[#20C997]" />
              ) : (
                <Square size={16} />
              )}
              Selecionar todos
            </button>
            
            <button
              onClick={() => setSelectedAgents([])}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Square size={16} />
              Desmarcar todos
            </button>
            
            <button
              onClick={handleBulkDelete}
              disabled={selectedAgents.length === 0}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
              Excluir selecionados
            </button>
          </div>

          {/* Right side - Search */}
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Pesquisar"
              value={search}
              onChange={handleSearch}
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1A3F56]"
              data-testid="search-input"
            />
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full" data-testid="agents-table">
            <thead>
              <tr className="bg-[#3A5D77] text-white text-sm">
                <th className="text-left py-3 px-4 font-medium">Nome</th>
                <th className="text-left py-3 px-4 font-medium">Usuário</th>
                <th className="text-left py-3 px-4 font-medium">E-mail</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                <th className="text-center py-3 px-4 font-medium w-20">Seleção</th>
                <th className="text-center py-3 px-4 font-medium w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    Nenhum agente encontrado
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    data-testid={`agent-row-${agent.id}`}
                  >
                    <td className="py-3 px-4 text-sm text-gray-800">{agent.name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 bg-[#20C997] text-white text-xs px-2 py-1 rounded">
                        @{agent.username}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{agent.email}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                          agent.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {agent.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleSelectAgent(agent.id)}
                        className="text-gray-400 hover:text-[#20C997]"
                      >
                        {selectedAgents.includes(agent.id) ? (
                          <CheckSquare size={18} className="text-[#20C997]" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === agent.id ? null : agent.id)}
                        className="text-gray-400 hover:text-gray-600"
                        data-testid={`action-menu-${agent.id}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      
                      {actionMenuOpen === agent.id && (
                        <div className="absolute right-4 top-10 bg-white border shadow-lg rounded py-1 z-10 min-w-[120px]">
                          <button
                            onClick={() => openEditModal(agent)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            data-testid={`edit-agent-${agent.id}`}
                          >
                            <Edit size={14} />
                            Editar
                          </button>
                          <button
                            onClick={() => openDeleteModal(agent)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            data-testid={`delete-agent-${agent.id}`}
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-600">
              {pagination.total > 0
                ? `${startItem} - ${endItem} de ${pagination.total} itens`
                : '0 itens'}
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-600">
                Página {pagination.page} de {totalPages || 1}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= totalPages}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* FAB - New Agent Button */}
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#0066cc] hover:bg-[#0055a0] text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          data-testid="new-agent-btn"
        >
          <Plus size={28} />
        </button>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="create-agent-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-[#1A3F56]">Novo Agente</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateAgent} className="p-6">
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                    {formError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                      required
                      data-testid="input-name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                      required
                      data-testid="input-username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                        required
                        minLength={6}
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-[#20C997] border-gray-300 rounded focus:ring-[#20C997]"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">Ativo</label>
                  </div>
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
                    data-testid="submit-create-agent"
                  >
                    Criar Agente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingAgent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="edit-agent-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-[#1A3F56]">Editar Agente</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAgent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleEditAgent} className="p-6">
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                    {formError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (deixe vazio para manter)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit_is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-[#20C997] border-gray-300 rounded focus:ring-[#20C997]"
                    />
                    <label htmlFor="edit_is_active" className="text-sm text-gray-700">Ativo</label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingAgent(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#20C997] text-white rounded hover:bg-[#1aab80] transition-colors"
                    data-testid="submit-edit-agent"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingAgent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="delete-agent-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-[#1A3F56] mb-4">Confirmar Exclusão</h2>
                <p className="text-gray-600 mb-6">
                  Tem certeza que deseja excluir o agente <strong>{deletingAgent.name}</strong>?
                </p>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingAgent(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteAgent}
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    data-testid="confirm-delete-agent"
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

export default AgentsPage;
