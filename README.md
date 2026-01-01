# Sistema de Atendimento Empresarial via Chat

## 📖 Sobre o Projeto

Sistema de atendimento empresarial via chat desenvolvido com FastAPI (backend), React (frontend) e MongoDB (banco de dados). Permite gerenciamento de conversas, usuários e atendimentos em tempo real.

## 🚀 Scripts de Instalação e Gerenciamento

Este projeto inclui scripts automatizados para facilitar a instalação e manutenção:

### 📦 `install.sh` - Instalação Completa

Script principal que instala todo o sistema do zero em Ubuntu 24.04.3 LTS.

```bash
sudo bash install.sh
```

**O que faz:**
- Instala todas as dependências (Python, Node.js, MongoDB, etc.)
- Configura ambiente virtual Python
- Instala dependências do backend e frontend
- Configura variáveis de ambiente
- Configura Supervisor para gerenciar os serviços
- Cria usuário administrador padrão automaticamente
- Inicia todos os serviços automaticamente

📚 **Documentação completa:** Ver [INSTALACAO.md](INSTALACAO.md)

### 🔍 `check-system.sh` - Verificação do Sistema

Script para verificar o status de todos os componentes.

```bash
bash check-system.sh
```

**O que verifica:**
- Status dos serviços (Backend, Frontend, MongoDB)
- Portas em uso
- Conectividade
- Dependências instaladas
- Recursos do sistema
- Logs recentes

### 🗑️ `uninstall.sh` - Desinstalação

Script para remover o sistema (com opções seletivas).

```bash
sudo bash uninstall.sh
```

**Permite remover:**
- Configurações do Supervisor
- MongoDB e seus dados
- Node.js e Yarn
- Ambiente virtual Python
- Diretório do projeto
- Supervisor e Nginx

⚠️ **ATENÇÃO:** Alguns dados podem ser permanentemente perdidos!

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Frontend      │
│   React         │
│   Port: 3000    │
└────────┬────────┘
         │
         │ HTTP API
         │
┌────────▼────────┐
│   Backend       │
│   FastAPI       │
│   Port: 8001    │
└────────┬────────┘
         │
         │ MongoDB Protocol
         │
┌────────▼────────┐
│   MongoDB       │
│   Port: 27017   │
└─────────────────┘
```

## 📋 Requisitos do Sistema

- **OS:** Ubuntu 24.04.3 LTS
- **RAM:** Mínimo 2GB (recomendado 4GB+)
- **Disco:** Mínimo 10GB livre
- **Acesso:** Usuário com sudo/root

## 🎯 Início Rápido

### 1. Clone o projeto
```bash
git clone <seu-repositorio>
cd <diretorio-do-projeto>
```

### 2. Execute a instalação
```bash
sudo bash install.sh
```

### 3. Verifique o sistema
```bash
bash check-system.sh
```

### 4. Acesse o sistema
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- Documentação API: http://localhost:8001/docs

### 5. Faça login com as credenciais padrão
- **Username:** admin
- **Senha:** admin123
- ⚠️ **IMPORTANTE:** Altere a senha padrão após o primeiro login!

## 🔧 Comandos Úteis

### Gerenciar Serviços
```bash
sudo supervisorctl status           # Ver status
sudo supervisorctl restart all      # Reiniciar tudo
sudo supervisorctl restart backend  # Reiniciar backend
sudo supervisorctl restart frontend # Reiniciar frontend
```

### Ver Logs
```bash
# Backend
sudo tail -f /var/log/supervisor/backend.err.log

# Frontend
sudo tail -f /var/log/supervisor/frontend.err.log

# MongoDB
sudo journalctl -u mongod -f
```

### MongoDB
```bash
sudo systemctl status mongod    # Status
sudo systemctl restart mongod   # Reiniciar
mongosh chatplus_db             # Acessar banco
```

## 📁 Estrutura do Projeto

```
/app/
├── backend/                 # Backend FastAPI
│   ├── server.py           # Servidor principal
│   ├── database.py         # Conexão MongoDB
│   ├── models.py           # Modelos de dados
│   ├── auth.py             # Autenticação JWT
│   ├── requirements.txt    # Dependências Python
│   └── .env                # Variáveis de ambiente
├── frontend/               # Frontend React
│   ├── src/                # Código fonte
│   ├── public/             # Arquivos públicos
│   ├── package.json        # Dependências Node
│   └── .env                # Variáveis de ambiente
├── install.sh              # Script de instalação
├── check-system.sh         # Script de verificação
├── uninstall.sh            # Script de desinstalação
├── INSTALACAO.md           # Guia de instalação detalhado
└── README.md               # Este arquivo
```

## 🔒 Configuração de Segurança

Antes de usar em produção:

1. **Altere o JWT_SECRET_KEY**
   ```bash
   sudo nano /app/backend/.env
   # Altere: JWT_SECRET_KEY=sua-chave-secreta-forte
   ```

2. **Configure CORS adequadamente**
   ```bash
   # Não use CORS_ORIGINS="*" em produção
   CORS_ORIGINS="https://seudominio.com"
   ```

3. **Use HTTPS**
   - Configure certificado SSL/TLS
   - Use Nginx como proxy reverso

4. **Configure o Firewall**
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

5. **Configure autenticação do MongoDB**
   - Habilite autenticação em produção
   - Crie usuários com permissões mínimas necessárias

## 🐛 Solução de Problemas

### Backend não inicia
```bash
sudo tail -n 50 /var/log/supervisor/backend.err.log
sudo systemctl status mongod
```

### Frontend não inicia
```bash
sudo tail -n 50 /var/log/supervisor/frontend.err.log
cd /app/frontend && yarn install
```

### MongoDB não conecta
```bash
sudo systemctl restart mongod
mongosh --eval "db.adminCommand('ping')"
```

### Portas em uso
```bash
sudo lsof -i :3000  # Frontend
sudo lsof -i :8001  # Backend
sudo lsof -i :27017 # MongoDB
```

## 📚 Documentação

- [Guia de Instalação Completo](INSTALACAO.md)
- [Guia Rápido de Referência](GUIA-RAPIDO.md)
- [Índice de Arquivos](INDEX.md)
- [Documentação da API](http://localhost:8001/docs) (após instalação)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

[Incluir informações de licença]

## 📞 Suporte

Para problemas ou dúvidas:
- Verifique a [documentação de instalação](INSTALACAO.md)
- Execute `bash check-system.sh` para diagnóstico
- Verifique os logs em `/var/log/supervisor/`
- Abra uma issue no repositório
