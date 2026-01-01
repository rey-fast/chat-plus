import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Admin = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUser(response.data);
      } catch (err) {
        console.error('Error fetching user:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="admin-loading" data-testid="admin-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-container" data-testid="admin-page">
      <div className="admin-header">
        <div className="admin-logo">
          <div className="logo-icon">
            <MessageCircle size={24} strokeWidth={2.5} />
          </div>
          <span className="logo-text">ChatPlus</span>
        </div>
        <button onClick={handleLogout} className="btn-logout" data-testid="logout-button">
          Sair
        </button>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <h1 data-testid="admin-title">Painel Administrativo – Em Construção</h1>
          <div className="user-info" data-testid="user-info">
            <p><strong>Bem-vindo:</strong> {user?.username}</p>
            <p><strong>Função:</strong> {user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;