import React from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { Construction } from 'lucide-react';

const pageNames = {
  '/admin/relatorios': 'Relatórios',
  '/admin/canais': 'Canais',
  '/admin/fluxo': 'Fluxo',
  '/admin/envio-lote': 'Envio em Lote',
  '/admin/contatos': 'Contatos',
  '/admin/configuracoes/administradores': 'Administradores',
};

const PlaceholderPage = () => {
  const location = useLocation();
  const pageName = pageNames[location.pathname] || 'Página';

  return (
    <AdminLayout>
      <div className="min-h-[calc(100vh-112px)] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-[#1A3F56]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Construction size={40} className="text-[#1A3F56]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A3F56] mb-4">{pageName}</h1>
          <p className="text-gray-500">(em construção)</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PlaceholderPage;
