import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, ChevronDown } from 'lucide-react';
import ImageCarousel from '../components/ImageCarousel';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        login,
        password
      });

      // Store token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to admin
      navigate('/admin');
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
            <div className="logo-icon"></div>
            <span className="logo-text">ChatPlus</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin} data-testid="login-form">
          <div className="form-group">
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="text"
                placeholder="E-mail"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
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

          <div className="form-group">
            <div className="language-selector">
              <div className="language-content">
                <span className="flag-icon">🇧🇷</span>
                <div className="language-text">
                  <span className="language-label">Idioma</span>
                  <span className="language-value">Português</span>
                </div>
              </div>
              <ChevronDown className="dropdown-icon" size={20} />
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

          <button type="button" className="btn-secondary" data-testid="contact-center-button">
            CONHEÇA O NOVO CONTACT CENTER
          </button>
        </form>
      </div>

      <div className="carousel-section" data-testid="carousel-section">
        <ImageCarousel />
      </div>
    </div>
  );
};

export default Login;