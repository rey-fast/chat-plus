# 📦 Guia de Instalação - Sistema de Atendimento Empresarial

## 🖥️ Requisitos do Sistema

- **Sistema Operacional:** Ubuntu 24.04.3 LTS (64-bit)
- **RAM:** Mínimo 2GB (recomendado 4GB+)
- **Disco:** Mínimo 10GB de espaço livre
- **Acesso:** Usuário com privilégios sudo/root
- **Rede:** Conexão com internet para download de dependências

## 🚀 Instalação Automática

O script `install.sh` instala e configura automaticamente todos os componentes necessários.

### Passo 1: Baixar o Projeto

```bash
# Se ainda não tiver o projeto, clone ou baixe para /app
cd /
git clone <seu-repositorio> app
# OU copie os arquivos para /app
```

### Passo 2: Executar o Script de Instalação

```bash
cd /app
sudo bash install.sh
```

O script irá:
1. ✅ Atualizar o sistema operacional
2. ✅ Instalar dependências básicas (curl, wget, git, etc.)
3. ✅ Instalar Python 3.11+ e pip
4. ✅ Instalar e configurar MongoDB 7.0+
5. ✅ Instalar Node.js 18+ e Yarn
6. ✅ Criar ambiente virtual Python
7. ✅ Instalar dependências do backend (FastAPI, motor, etc.)
8. ✅ Instalar dependências do frontend (React, Tailwind, etc.)
9. ✅ Configurar variáveis de ambiente
10. ✅ Configurar Supervisor para gerenciar os serviços
11. ✅ Criar usuário administrador padrão automaticamente
12. ✅ Iniciar todos os serviços automaticamente

### Passo 3: Verificar Instalação

Após a instalação, verifique se os serviços estão rodando:

```bash
supervisorctl status
```

Você deve ver algo como:
```
backend    RUNNING   pid 1234, uptime 0:01:00
frontend   RUNNING   pid 1235, uptime 0:01:00
```

### Passo 4: Acessar o Sistema

O usuário administrador foi criado automaticamente durante a instalação:

- **Frontend:** http://localhost:3000
- **Username:** admin
- **Email:** admin@exemplo.com.br
- **Senha:** admin123

⚠️ **IMPORTANTE:** Altere a senha padrão imediatamente após o primeiro login!

## 🔧 Configuração Pós-Instalação

### 1. Configurar Variáveis de Ambiente

#### Backend (`/app/backend/.env`)

```bash
sudo nano /app/backend/.env
```

Altere as seguintes variáveis:
- `JWT_SECRET_KEY`: Altere para uma chave secreta forte em produção
- `MONGO_URL`: URL de conexão do MongoDB (padrão: mongodb://localhost:27017)
- `DB_NAME`: Nome do banco de dados (padrão: chatplus_db)
- `CORS_ORIGINS`: Configure os domínios permitidos (use `*` apenas em desenvolvimento)

#### Frontend (`/app/frontend/.env`)

```bash
sudo nano /app/frontend/.env
```

Altere:
- `REACT_APP_BACKEND_URL`: URL do backend (ex: `http://seu-ip:8001` ou `https://seu-dominio.com`)

Após alterar os arquivos `.env`, reinicie os serviços:

```bash
sudo supervisorctl restart all
```

### 2. Criar Usuário Administrador

O usuário administrador já foi criado automaticamente durante a instalação com as seguintes credenciais:

- **Username:** admin
- **Email:** admin@exemplo.com.br  
- **Senha:** admin123

Se precisar criar usuários adicionais ou recriar o admin:

```bash
cd /app/backend
/root/.venv/bin/python create_admin.py
```

Siga as instruções para criar o usuário.

### 3. Configurar Firewall (Opcional mas Recomendado)

```bash
# Permitir portas necessárias
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # Frontend (dev)
sudo ufw allow 8001  # Backend API

# Ativar firewall
sudo ufw enable
```

## 🌐 Acessando o Sistema

Após a instalação:

- **Frontend:** http://localhost:3000 (ou http://seu-ip:3000)
- **Backend API:** http://localhost:8001 (ou http://seu-ip:8001)
- **Documentação API:** http://localhost:8001/docs
- **Credenciais padrão:** admin / admin123

## 📋 Comandos Úteis

### Gerenciar Serviços

```bash
# Ver status de todos os serviços
sudo supervisorctl status

# Reiniciar backend
sudo supervisorctl restart backend

# Reiniciar frontend
sudo supervisorctl restart frontend

# Reiniciar todos os serviços
sudo supervisorctl restart all

# Parar um serviço
sudo supervisorctl stop backend

# Iniciar um serviço
sudo supervisorctl start backend
```

### Visualizar Logs

```bash
# Logs do backend (erros)
sudo tail -f /var/log/supervisor/backend.err.log

# Logs do backend (output)
sudo tail -f /var/log/supervisor/backend.out.log

# Logs do frontend (erros)
sudo tail -f /var/log/supervisor/frontend.err.log

# Logs do frontend (output)
sudo tail -f /var/log/supervisor/frontend.out.log

# Logs do MongoDB
sudo journalctl -u mongod -f
```

### MongoDB

```bash
# Status do MongoDB
sudo systemctl status mongod

# Reiniciar MongoDB
sudo systemctl restart mongod

# Acessar shell do MongoDB
mongosh chatplus_db

# Dentro do MongoDB shell:
show collections              # Listar collections
db.users.find()               # Ver usuários
db.users.countDocuments()     # Contar usuários
show dbs                      # Listar bancos de dados
exit                          # Sair
```

### Ambiente Virtual Python

```bash
# Ativar ambiente virtual
source /root/.venv/bin/activate

# Instalar novo pacote Python
pip install nome-do-pacote

# Adicionar ao requirements.txt
echo "nome-do-pacote==versao" >> /app/backend/requirements.txt

# Desativar ambiente virtual
deactivate
```

### Frontend

```bash
# Instalar novo pacote npm
cd /app/frontend
yarn add nome-do-pacote

# Atualizar dependências
yarn install

# Build de produção
yarn build
```

## 🐛 Solução de Problemas

### Backend não inicia

```bash
# Verificar logs
sudo tail -n 50 /var/log/supervisor/backend.err.log

# Verificar se MongoDB está rodando
sudo systemctl status mongod

# Testar backend manualmente
cd /app/backend
/root/.venv/bin/python -c "import uvicorn; print('OK')"
```

### Frontend não inicia

```bash
# Verificar logs
sudo tail -n 50 /var/log/supervisor/frontend.err.log

# Verificar dependências
cd /app/frontend
yarn install

# Verificar se a porta 3000 está livre
sudo lsof -i :3000
```

### MongoDB não conecta

```bash
# Verificar status
sudo systemctl status mongod

# Reiniciar MongoDB
sudo systemctl restart mongod

# Verificar conexão
mongosh --eval "db.adminCommand('ping')"

# Ver logs do MongoDB
sudo journalctl -u mongod -n 50
```

### Portas já em uso

```bash
# Verificar o que está usando a porta 3000
sudo lsof -i :3000

# Verificar o que está usando a porta 8001
sudo lsof -i :8001

# Verificar o que está usando a porta 27017
sudo lsof -i :27017

# Matar processo por porta
sudo kill $(sudo lsof -t -i:3000)
```

## 🔒 Segurança em Produção

1. **Altere todas as senhas e chaves secretas**
   - JWT_SECRET_KEY no backend
   - Senhas de usuários

2. **Configure CORS adequadamente**
   - Não use `CORS_ORIGINS="*"` em produção
   - Configure apenas os domínios permitidos

3. **Use HTTPS**
   - Configure certificado SSL/TLS
   - Use Nginx como proxy reverso

4. **Configure Firewall**
   - Bloqueie portas desnecessárias
   - Permita apenas tráfego necessário

5. **Configure autenticação do MongoDB**
   - Habilite autenticação
   - Crie usuários com permissões mínimas

6. **Mantenha o sistema atualizado**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## 📚 Arquitetura do Sistema

```
┌─────────────────┐
│   Frontend      │
│   React + Vite  │
│   Port: 3000    │
└────────┬────────┘
         │
         │ HTTP/HTTPS
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

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs em `/var/log/supervisor/`
2. Verifique se todos os serviços estão rodando: `sudo supervisorctl status`
3. Verifique a documentação da API: http://localhost:8001/docs
4. Abra uma issue no repositório do projeto

## 📝 Licença

[Incluir informações de licença do seu projeto]
