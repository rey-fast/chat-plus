import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, MessageCircle } from 'lucide-react';
import ImageCarousel from '../components/ImageCarousel';

const Login = () => {
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'agent') {
        navigate('/agent');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(loginValue, password);
      
      // Redirect based on role
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'agent') {
        navigate('/agent');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" data-testid="login-page">
      <div className="login-sidebar" data-testid="login-sidebar">
        <div className="login-header">
          <div className="logo" data-testid="logo">
            <div className="logo-icon">
              <MessageCircle size={28} strokeWidth={2.5} />
            </div>
            <span className="logo-text">ChatPlus</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin} data-testid="login-form">
          <div className="form-group">
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="text"
                placeholder="E-mail ou Usuário"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                className="form-input"
                data-testid="login-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                data-testid="password-input"
                required
              />
            </div>
          </div>

          {error && (
            <div className="error-message" data-testid="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            data-testid="login-submit-button"
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>

          <a href="#" className="forgot-password" data-testid="forgot-password-link">
            Esqueceu a senha?
          </a>
        </form>
      </div>

      <div className="carousel-section" data-testid="carousel-section">
        <ImageCarousel />
      </div>
    </div>
  );
};

export default Login;