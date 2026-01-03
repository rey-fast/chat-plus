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
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TeamsPage = () => {
  const { getAuthHeader } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    session_timeout: 300,
    finish_message: 'Atendimento encerrado. Obrigado pelo contato!',
    no_agent_message: 'No momento não há agentes disponíveis. Por favor, aguarde.'
  });
  const [formError, setFormError] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        per_page: pagination.perPage,
        ...(search && { search })
      });
      
      const response = await axios.get(`${BACKEND_URL}/api/teams?${params}`, {
        headers: getAuthHeader()
      });
      
      setTeams(response.data.teams);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, pagination.page, pagination.perPage, search]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleSelectAll = () => {
    if (selectedTeams.length === teams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(teams.map(t => t.id));
    }
  };

  const toggleSelectTeam = (id) => {
    setSelectedTeams(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setFormError('');
    
    try {
      await axios.post(`${BACKEND_URL}/api/teams`, formData, {
        headers: getAuthHeader()
      });
      
      setShowCreateModal(false);
      resetForm();
      fetchTeams();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Erro ao criar equipe');
    }
  };

  const handleEditTeam = async (e) => {
    e.preventDefault();
    setFormError('');
    
    try {
      await axios.put(`${BACKEND_URL}/api/teams/${editingTeam.id}`, formData, {
        headers: getAuthHeader()
      });
      
      setShowEditModal(false);
      setEditingTeam(null);
      resetForm();
      fetchTeams();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Erro ao atualizar equipe');
    }
  };

  const handleDeleteTeam = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/teams/${deletingTeam.id}`, {
        headers: getAuthHeader()
      });
      
      setShowDeleteModal(false);
      setDeletingTeam(null);
      fetchTeams();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Erro ao excluir equipe');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTeams.length === 0) return;
    
    try {
      await axios.post(`${BACKEND_URL}/api/teams/bulk-delete`, selectedTeams, {
        headers: getAuthHeader()
      });
      
      setSelectedTeams([]);
      fetchTeams();
    } catch (err) {
      console.error('Error bulk deleting teams:', err);
    }
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      session_timeout: team.session_timeout,
      finish_message: team.finish_message,
      no_agent_message: team.no_agent_message
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (team) => {
    setDeletingTeam(team);
    setFormError('');
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      session_timeout: 300,
      finish_message: 'Atendimento encerrado. Obrigado pelo contato!',
      no_agent_message: 'No momento não há agentes disponíveis. Por favor, aguarde.'
    });
    setFormError('');
  };

  // Converte segundos para formato legível
  const formatTimeout = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  const totalPages = Math.ceil(pagination.total / pagination.perPage);
  const startItem = (pagination.page - 1) * pagination.perPage + 1;
  const endItem = Math.min(pagination.page * pagination.perPage, pagination.total);

  return (
    <AdminLayout>
      <div className="min-h-[calc(100vh-112px)]" data-testid="teams-page">
        {/* Breadcrumb */}
        <div className="mb-4">
          <span className="text-gray-500 text-sm">Configuração</span>
          <span className="text-gray-400 mx-2">{'>'}</span>
          <span className="text-[#1A3F56] text-sm font-medium">Equipes</span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between mb-4">
          {/* Left side - Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {selectedTeams.length === teams.length && teams.length > 0 ? (
                <CheckSquare size={16} className="text-[#20C997]" />
              ) : (
                <Square size={16} />
              )}
              Selecionar todos
            </button>
            
            <button
              onClick={() => setSelectedTeams([])}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Square size={16} />
              Desmarcar todos
            </button>
            
            <button
              onClick={handleBulkDelete}
              disabled={selectedTeams.length === 0}
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
          <table className="w-full" data-testid="teams-table">
            <thead>
              <tr className="bg-[#3A5D77] text-white text-sm">
                <th className="text-left py-3 px-4 font-medium">Equipe</th>
                <th className="text-center py-3 px-4 font-medium">Tempo de Sessão</th>
                <th className="text-center py-3 px-4 font-medium w-20">Seleção</th>
                <th className="text-center py-3 px-4 font-medium w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    Nenhuma equipe encontrada
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    data-testid={`team-row-${team.id}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-800 font-medium">{team.name}</span>
                        {team.agent_count > 0 && (
                          <span className="text-xs text-gray-500">{team.agent_count} agente(s)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                        <Clock size={12} />
                        {formatTimeout(team.session_timeout)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleSelectTeam(team.id)}
                        className="text-gray-400 hover:text-[#20C997]"
                      >
                        {selectedTeams.includes(team.id) ? (
                          <CheckSquare size={18} className="text-[#20C997]" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === team.id ? null : team.id)}
                        className="text-gray-400 hover:text-gray-600"
                        data-testid={`action-menu-${team.id}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      
                      {actionMenuOpen === team.id && (
                        <div className="absolute right-4 top-10 bg-white border shadow-lg rounded py-1 z-10 min-w-[120px]">
                          <button
                            onClick={() => openEditModal(team)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            data-testid={`edit-team-${team.id}`}
                          >
                            <Edit size={14} />
                            Editar
                          </button>
                          <button
                            onClick={() => openDeleteModal(team)}
                            className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 ${
                              team.agent_count > 0 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-red-600'
                            }`}
                            disabled={team.agent_count > 0}
                            title={team.agent_count > 0 ? 'Não é possível excluir equipe com agentes vinculados' : ''}
                            data-testid={`delete-team-${team.id}`}
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

        {/* FAB - New Team Button */}
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#0066cc] hover:bg-[#0055a0] text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          data-testid="new-team-btn"
        >
          <Plus size={28} />
        </button>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="create-team-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-[#1A3F56]">Nova Equipe</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateTeam} className="p-6">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tempo de Sessão (segundos)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="60"
                        max="86400"
                        value={formData.session_timeout}
                        onChange={(e) => setFormData({ ...formData, session_timeout: parseInt(e.target.value) || 300 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                        required
                        data-testid="input-session-timeout"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        ({formatTimeout(formData.session_timeout)})
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Tempo máximo de inatividade do cliente antes de encerrar a sessão. Cada resposta do cliente reinicia a contagem.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mensagem de Finalização
                    </label>
                    <textarea
                      value={formData.finish_message}
                      onChange={(e) => setFormData({ ...formData, finish_message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56] resize-none"
                      rows={3}
                      data-testid="input-finish-message"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Mensagem enviada ao cliente quando o atendimento é encerrado.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mensagem de Nenhum Agente Disponível
                    </label>
                    <textarea
                      value={formData.no_agent_message}
                      onChange={(e) => setFormData({ ...formData, no_agent_message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56] resize-none"
                      rows={3}
                      data-testid="input-no-agent-message"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Mensagem enviada quando não há agentes disponíveis na equipe.
                    </p>
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
                    data-testid="submit-create-team"
                  >
                    Criar Equipe
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingTeam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="edit-team-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-[#1A3F56]">Editar Equipe</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTeam(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleEditTeam} className="p-6">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tempo de Sessão (segundos)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="60"
                        max="86400"
                        value={formData.session_timeout}
                        onChange={(e) => setFormData({ ...formData, session_timeout: parseInt(e.target.value) || 300 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56]"
                        required
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        ({formatTimeout(formData.session_timeout)})
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Tempo máximo de inatividade do cliente antes de encerrar a sessão. Cada resposta do cliente reinicia a contagem.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mensagem de Finalização
                    </label>
                    <textarea
                      value={formData.finish_message}
                      onChange={(e) => setFormData({ ...formData, finish_message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56] resize-none"
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Mensagem enviada ao cliente quando o atendimento é encerrado.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mensagem de Nenhum Agente Disponível
                    </label>
                    <textarea
                      value={formData.no_agent_message}
                      onChange={(e) => setFormData({ ...formData, no_agent_message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1A3F56] resize-none"
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Mensagem enviada quando não há agentes disponíveis na equipe.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTeam(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#20C997] text-white rounded hover:bg-[#1aab80] transition-colors"
                    data-testid="submit-edit-team"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingTeam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="delete-team-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-[#1A3F56] mb-4">Confirmar Exclusão</h2>
                
                {deletingTeam.agent_count > 0 ? (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded mb-4">
                    <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Não é possível excluir esta equipe. Existem <strong>{deletingTeam.agent_count} agente(s)</strong> vinculado(s). 
                      Remova os agentes da equipe antes de excluí-la.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600 mb-6">
                    Tem certeza que deseja excluir a equipe <strong>{deletingTeam.name}</strong>?
                  </p>
                )}
                
                {formError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                    {formError}
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingTeam(null);
                      setFormError('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    {deletingTeam.agent_count > 0 ? 'Fechar' : 'Cancelar'}
                  </button>
                  {deletingTeam.agent_count === 0 && (
                    <button
                      onClick={handleDeleteTeam}
                      className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      data-testid="confirm-delete-team"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TeamsPage;
