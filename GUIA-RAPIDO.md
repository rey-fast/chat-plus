# 📌 Guia Rápido de Referência

## 🚀 Scripts Disponíveis

| Script | Descrição | Comando |
|--------|-----------|--------|
| `install.sh` | Instalação completa do sistema | `sudo bash install.sh` |
| `check-system.sh` | Verificar status do sistema | `bash check-system.sh` |
| `backup.sh` | Criar backup completo | `sudo bash backup.sh` |
| `uninstall.sh` | Desinstalar o sistema | `sudo bash uninstall.sh` |

## ⚡ Comandos Mais Usados

### Gerenciar Serviços
```bash
# Ver status de todos os serviços
sudo supervisorctl status

# Reiniciar todos os serviços
sudo supervisorctl restart all

# Reiniciar apenas o backend
sudo supervisorctl restart backend

# Reiniciar apenas o frontend
sudo supervisorctl restart frontend

# Parar um serviço
sudo supervisorctl stop backend

# Iniciar um serviço
sudo supervisorctl start backend
```

### Ver Logs em Tempo Real
```bash
# Backend (erros)
sudo tail -f /var/log/supervisor/backend.err.log

# Backend (output)
sudo tail -f /var/log/supervisor/backend.out.log

# Frontend (erros)
sudo tail -f /var/log/supervisor/frontend.err.log

# MongoDB
sudo journalctl -u mongod -f

# Últimas 100 linhas do backend
sudo tail -n 100 /var/log/supervisor/backend.err.log
```

### MongoDB
```bash
# Status
sudo systemctl status mongod

# Reiniciar
sudo systemctl restart mongod

# Parar
sudo systemctl stop mongod

# Iniciar
sudo systemctl start mongod

# Acessar shell
mongosh chat_db

# Dentro do MongoDB shell
show collections              # Listar collections
db.users.find()               # Listar usuários
db.users.countDocuments()     # Contar usuários
show dbs                      # Listar bancos de dados
exit                          # Sair
```

### Verificar Portas
```bash
# Ver todas as portas em uso
sudo ss -tulpn

# Verificar porta específica
sudo lsof -i :3000   # Frontend
sudo lsof -i :8001   # Backend
sudo lsof -i :27017  # MongoDB

# Matar processo em uma porta
sudo kill $(sudo lsof -t -i:3000)
```

### Sistema
```bash
# Uso de memória
free -h

# Uso de disco
df -h

# Processos do sistema
htop

# Informações do sistema
uname -a
cat /etc/os-release
```

## 🔧 Editar Configurações

### Backend
```bash
# Editar variáveis de ambiente
sudo nano /app/backend/.env

# Principais variáveis:
# MONGO_URL - URL de conexão do MongoDB
# DB_NAME - Nome do banco de dados
# JWT_SECRET_KEY - Chave secreta JWT
# CORS_ORIGINS - Origens permitidas

# Após editar, reiniciar:
sudo supervisorctl restart backend
```

### Frontend
```bash
# Editar variáveis de ambiente
sudo nano /app/frontend/.env

# Principais variáveis:
# REACT_APP_BACKEND_URL - URL do backend
# WDS_SOCKET_PORT - Porta do WebSocket

# Após editar, reiniciar:
sudo supervisorctl restart frontend
```

## 📦 Instalar Novas Dependências

### Backend (Python)
```bash
# Ativar ambiente virtual
source /root/.venv/bin/activate

# Instalar pacote
pip install nome-do-pacote

# Adicionar ao requirements.txt
echo "nome-do-pacote==versao" >> /app/backend/requirements.txt

# OU instalar do requirements.txt
pip install -r /app/backend/requirements.txt

# Desativar ambiente
deactivate

# Reiniciar backend
sudo supervisorctl restart backend
```

### Frontend (Node.js)
```bash
# Ir para diretório do frontend
cd /app/frontend

# Instalar pacote
yarn add nome-do-pacote

# OU instalar todas as dependências
yarn install

# Reiniciar frontend
sudo supervisorctl restart frontend
```

## 🔍 Diagnóstico de Problemas

### Backend não inicia
```bash
# 1. Ver logs de erro
sudo tail -n 50 /var/log/supervisor/backend.err.log

# 2. Verificar MongoDB
sudo systemctl status mongod

# 3. Testar Python
source /root/.venv/bin/activate
python -c "import uvicorn; print('OK')"

# 4. Verificar porta
sudo lsof -i :8001

# 5. Testar manualmente
cd /app/backend
/root/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend não inicia
```bash
# 1. Ver logs de erro
sudo tail -n 50 /var/log/supervisor/frontend.err.log

# 2. Verificar dependências
cd /app/frontend
yarn install

# 3. Verificar porta
sudo lsof -i :3000

# 4. Limpar cache e reinstalar
cd /app/frontend
rm -rf node_modules
yarn install
```

### MongoDB não conecta
```bash
# 1. Verificar status
sudo systemctl status mongod

# 2. Ver logs
sudo journalctl -u mongod -n 50

# 3. Reiniciar
sudo systemctl restart mongod

# 4. Testar conexão
mongosh --eval "db.adminCommand('ping')"

# 5. Verificar porta
sudo lsof -i :27017
```

### Serviço não responde
```bash
# 1. Verificar status
sudo supervisorctl status

# 2. Reiniciar tudo
sudo supervisorctl restart all

# 3. Recarregar configuração
sudo supervisorctl reread
sudo supervisorctl update

# 4. Reiniciar Supervisor
sudo systemctl restart supervisor

# 5. Verificar sistema
bash /app/check-system.sh
```

## 🌐 URLs de Acesso

### Local
- Frontend: http://localhost:3000
- Backend: http://localhost:8001
- API Docs: http://localhost:8001/docs
- MongoDB: localhost:27017 (Database: chat_db)
- **Credenciais padrão:** admin / admin123

### Externo (substitua SEU_IP)
- Frontend: http://SEU_IP:3000
- Backend: http://SEU_IP:8001
- API Docs: http://SEU_IP:8001/docs

Para descobrir seu IP:
```bash
hostname -I | awk '{print $1}'
```

## 💾 Backup e Restauração

### Criar Backup
```bash
# Backup padrão
sudo bash /app/backup.sh

# Backup em diretório específico
sudo bash /app/backup.sh /mnt/backups
```

### Restaurar Backup
```bash
# 1. Extrair backup (se comprimido)
tar -xzf chat_backup_TIMESTAMP.tar.gz

# 2. Executar restauração
sudo bash chat_backup_TIMESTAMP/restore.sh
```

## 🔒 Segurança

### Alterar JWT Secret
```bash
sudo nano /app/backend/.env
# Altere: JWT_SECRET_KEY=nova-chave-super-secreta

sudo supervisorctl restart backend
```

### Configurar Firewall
```bash
# Permitir portas
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # Frontend
sudo ufw allow 8001  # Backend

# Ativar firewall
sudo ufw enable

# Ver status
sudo ufw status
```

### Criar Usuário Admin
```bash
cd /app/backend
/root/.venv/bin/python create_admin.py
```

**Credenciais padrão criadas na instalação:**
- Username: admin
- Email: admin@exemplo.com.br
- Senha: admin123

## 📊 Monitoramento

### Recursos do Sistema
```bash
# CPU e memória
htop

# Uso de disco
df -h

# Processos do Python
ps aux | grep python

# Processos do Node
ps aux | grep node

# Load average
uptime
```

### Status Completo
```bash
# Script de verificação automática
bash /app/check-system.sh
```

## 🆘 Comandos de Emergência

### Reiniciar Tudo
```bash
sudo supervisorctl restart all
sudo systemctl restart mongod
```

### Limpar e Reinstalar Frontend
```bash
cd /app/frontend
rm -rf node_modules yarn.lock
yarn install
sudo supervisorctl restart frontend
```

### Resetar MongoDB
```bash
# ⚠️ CUIDADO: Apaga todos os dados!
sudo systemctl stop mongod
mongosh --eval "db.dropDatabase()" chat_db
sudo systemctl start mongod

# Recriar estrutura e admin
cd /app/backend
/root/.venv/bin/python create_admin.py
```

### Logs de Emergência
```bash
# Ver todos os erros recentes
sudo grep -i error /var/log/supervisor/*.log

# Ver últimos 200 linhas de todos os logs
sudo tail -n 200 /var/log/supervisor/*.log
```

## 📱 Contatos e Suporte

- Documentação completa: [INSTALACAO.md](INSTALACAO.md)
- Script de verificação: `bash check-system.sh`
- Diretório de logs: `/var/log/supervisor/`

---

**Dica:** Salve este arquivo para consulta rápida!
