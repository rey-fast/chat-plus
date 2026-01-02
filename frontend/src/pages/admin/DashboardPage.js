import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { BarChart3, Users, MessageCircle, TrendingUp } from 'lucide-react';

const DashboardPage = () => {
  return (
    <AdminLayout>
      <div data-testid="dashboard-page">
        {/* Breadcrumb */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1A3F56]">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral do sistema</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total de Agentes</p>
                <p className="text-3xl font-bold text-[#1A3F56] mt-1">-</p>
              </div>
              <div className="w-12 h-12 bg-[#20C997]/10 rounded-lg flex items-center justify-center">
                <Users size={24} className="text-[#20C997]" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Atendimentos Hoje</p>
                <p className="text-3xl font-bold text-[#1A3F56] mt-1">-</p>
              </div>
              <div className="w-12 h-12 bg-[#0066cc]/10 rounded-lg flex items-center justify-center">
                <MessageCircle size={24} className="text-[#0066cc]" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Taxa de Resolução</p>
                <p className="text-3xl font-bold text-[#1A3F56] mt-1">-%</p>
              </div>
              <div className="w-12 h-12 bg-[#ff9900]/10 rounded-lg flex items-center justify-center">
                <TrendingUp size={24} className="text-[#ff9900]" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Tempo Médio</p>
                <p className="text-3xl font-bold text-[#1A3F56] mt-1">-</p>
              </div>
              <div className="w-12 h-12 bg-[#660099]/10 rounded-lg flex items-center justify-center">
                <BarChart3 size={24} className="text-[#660099]" />
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-20 h-20 bg-[#1A3F56]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 size={40} className="text-[#1A3F56]" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A3F56] mb-2">Dashboard em Construção</h2>
          <p className="text-gray-500">Os relatórios e gráficos estarão disponíveis em breve.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;
