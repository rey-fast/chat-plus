#!/bin/bash

################################################################################
# Script de Instalação Automatizada - Sistema de Atendimento Empresarial
# Compatível com: Ubuntu 24.04.3 LTS
# 
# Este script instala e configura todos os componentes necessários:
# - PostgreSQL 16
# - Python 3.11+ e ambiente virtual
# - Node.js 18+ e Yarn
# - Supervisor para gerenciamento de processos
# - Nginx (opcional) para proxy reverso
#
# Uso: sudo bash install.sh
################################################################################

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    log_error "Este script precisa ser executado como root (use sudo)"
    exit 1
fi

# Verificar versão do Ubuntu
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$VERSION_ID" != "24.04" ]]; then
        log_warning "Este script foi testado no Ubuntu 24.04. Você está usando: $PRETTY_NAME"
        read -p "Deseja continuar mesmo assim? (s/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
else
    log_error "Não foi possível detectar a versão do sistema operacional"
    exit 1
fi

# Diretório do projeto
PROJECT_DIR="/app"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

log_info "==================================================================="
log_info "Instalação do Sistema de Atendimento Empresarial"
log_info "==================================================================="

# ==============================================================================
# 1. ATUALIZAR SISTEMA
# ==============================================================================
log_info "1. Atualizando sistema operacional..."
apt-get update
apt-get upgrade -y
log_success "Sistema atualizado com sucesso"

# ==============================================================================
# 2. INSTALAR DEPENDÊNCIAS BÁSICAS
# ==============================================================================
log_info "2. Instalando dependências básicas..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    gnupg \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    supervisor \
    nginx \
    vim \
    htop

log_success "Dependências básicas instaladas"

# ==============================================================================
# 3. INSTALAR PYTHON 3.11+
# ==============================================================================
log_info "3. Verificando/Instalando Python 3.11+..."

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    log_info "Python $PYTHON_VERSION encontrado"
else
    log_info "Instalando Python 3..."
    apt-get install -y python3 python3-pip python3-venv python3-dev
	PYTHON_FULL_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
	apt-get install -y python${PYTHON_FULL_VERSION}-venv
fi

# Instalar pip se não estiver instalado
if ! command -v pip3 &> /dev/null; then
    log_info "Instalando pip3..."
    apt-get install -y python3-pip
fi

log_success "Python instalado e configurado"

# ==============================================================================
# 4. INSTALAR POSTGRESQL
# ==============================================================================
log_info "4. Instalando PostgreSQL 16..."

# Adicionar repositório oficial do PostgreSQL
if [ ! -f /usr/share/keyrings/postgresql-archive-keyring.gpg ]; then
    log_info "Importando chave GPG do PostgreSQL..."
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
        gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg
fi

echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | \
    tee /etc/apt/sources.list.d/pgdg.list

apt-get update
apt-get install -y postgresql-16 postgresql-contrib-16

# Iniciar e habilitar PostgreSQL
systemctl daemon-reload
systemctl enable postgresql
systemctl start postgresql

# Verificar se PostgreSQL está rodando
if systemctl is-active --quiet postgresql; then
    log_success "PostgreSQL instalado e rodando"
else
    log_warning "PostgreSQL instalado mas não está rodando. Tentando iniciar..."
    systemctl restart postgresql
    sleep 3
    if systemctl is-active --quiet postgresql; then
        log_success "PostgreSQL iniciado com sucesso"
    else
        log_error "Falha ao iniciar PostgreSQL. Verifique os logs com: journalctl -u postgresql"
        exit 1
    fi
fi

# Configurar senha do usuário postgres
log_info "Configurando senha do usuário postgres..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true

# Criar banco de dados
log_info "Criando banco de dados chatplus_db..."
sudo -u postgres psql -c "CREATE DATABASE chatplus_db;" 2>/dev/null || \
    log_info "Banco de dados chatplus_db já existe"

log_success "PostgreSQL configurado com sucesso"

# ==============================================================================
# 5. INSTALAR NODE.JS E YARN
# ==============================================================================
log_info "5. Instalando Node.js 18+ e Yarn..."

# Instalar Node.js 18.x
if ! command -v node &> /dev/null; then
    log_info "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    log_info "Node.js v$NODE_VERSION já instalado"
fi

# Instalar Yarn
if ! command -v yarn &> /dev/null; then
    log_info "Instalando Yarn..."
    npm install -g yarn
else
    log_info "Yarn já instalado"
fi

log_success "Node.js e Yarn instalados"

# ==============================================================================
# 6. CONFIGURAR AMBIENTE PYTHON
# ==============================================================================
log_info "6. Configurando ambiente virtual Python..."

# Criar ambiente virtual na home do root (padrão do sistema)
VENV_DIR="/root/.venv"
if [ ! -d "$VENV_DIR" ]; then
    log_info "Criando ambiente virtual em $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
else
    log_info "Ambiente virtual já existe em $VENV_DIR"
fi

# Ativar ambiente virtual e instalar dependências do backend
log_info "Instalando dependências Python do backend..."
source "$VENV_DIR/bin/activate"

if [ -f "$BACKEND_DIR/requirements.txt" ]; then
    pip install --upgrade pip
    pip install -r "$BACKEND_DIR/requirements.txt"
    log_success "Dependências Python instaladas"
else
    log_warning "Arquivo requirements.txt não encontrado em $BACKEND_DIR"
fi

deactivate

# ==============================================================================
# 7. INSTALAR DEPENDÊNCIAS DO FRONTEND
# ==============================================================================
log_info "7. Instalando dependências do frontend..."

if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    
    # Limpar cache se houver problemas anteriores
    if [ -d "node_modules" ]; then
        log_info "Limpando node_modules antigo..."
        rm -rf node_modules
    fi
    
    if [ -f "package.json" ]; then
        log_info "Instalando dependências com Yarn..."
        yarn install --frozen-lockfile || yarn install
        log_success "Dependências do frontend instaladas"
    else
        log_warning "Arquivo package.json não encontrado em $FRONTEND_DIR"
    fi
else
    log_warning "Diretório frontend não encontrado: $FRONTEND_DIR"
fi

# ==============================================================================
# 8. CONFIGURAR VARIÁVEIS DE AMBIENTE
# ==============================================================================
log_info "8. Configurando variáveis de ambiente..."

# Backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    log_info "Criando arquivo .env do backend..."
    cat > "$BACKEND_DIR/.env" << 'EOF'
DB_HOST=localhost
DB_NAME=chatplus_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
CORS_ORIGINS="*"
JWT_SECRET_KEY=your-secret-key-change-in-production
EOF
    log_success "Arquivo .env do backend criado"
else
    log_info "Arquivo .env do backend já existe"
fi

# Frontend .env
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    log_info "Criando arquivo .env do frontend..."
    # Detectar IP do servidor
    SERVER_IP=$(hostname -I | awk '{print $1}')
    cat > "$FRONTEND_DIR/.env" << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
EOF
    log_success "Arquivo .env do frontend criado"
    log_info "Backend URL configurado para: http://localhost:8001"
    log_info "Para acesso externo, altere para: http://$SERVER_IP:8001"
else
    log_info "Arquivo .env do frontend já existe"
fi

# ==============================================================================
# 9. CONFIGURAR SUPERVISOR
# ==============================================================================
log_info "9. Configurando Supervisor para gerenciar os serviços..."

# Criar arquivo de configuração do Supervisor
cat > /etc/supervisor/conf.d/chatplus.conf << EOF
[program:backend]
command=$VENV_DIR/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 --reload
directory=$BACKEND_DIR
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log
stopsignal=TERM
stopwaitsecs=30
stopasgroup=true
killasgroup=true
user=root

[program:frontend]
command=yarn start
environment=HOST="0.0.0.0",PORT="3000"
directory=$FRONTEND_DIR
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
stopsignal=TERM
stopwaitsecs=50
stopasgroup=true
killasgroup=true
user=root
EOF

log_success "Configuração do Supervisor criada"

# Recarregar configuração do Supervisor
log_info "Recarregando Supervisor..."
systemctl enable supervisor
systemctl restart supervisor
sleep 2

supervisorctl reread
supervisorctl update

log_success "Supervisor configurado e atualizado"

# ==============================================================================
# 10. INICIAR SERVIÇOS
# ==============================================================================
log_info "10. Iniciando serviços..."

supervisorctl start backend
supervisorctl start frontend

sleep 5

# Verificar status dos serviços
log_info "Verificando status dos serviços..."
supervisorctl status

# ==============================================================================
# 11. CONFIGURAR FIREWALL (OPCIONAL)
# ==============================================================================
log_info "11. Configurando firewall..."

if command -v ufw &> /dev/null; then
    log_info "Configurando UFW firewall..."
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw allow 3000/tcp # Frontend
    ufw allow 8001/tcp # Backend
    
    # Não ativar automaticamente para evitar perder acesso SSH
    log_warning "Firewall configurado mas não ativado. Execute 'ufw enable' manualmente se necessário"
else
    log_info "UFW não instalado, pulando configuração de firewall"
fi

# ==============================================================================
# 12. CRIAR BANCO DE DADOS E USUÁRIO ADMIN
# ==============================================================================
log_info "12. Criando estrutura do banco e usuário administrador..."

# Aguardar backend iniciar completamente
log_info "Aguardando backend inicializar..."
sleep 10

# Executar script de criação do admin
if [ -f "$BACKEND_DIR/create_admin.py" ]; then
    log_info "Executando script de criação do admin..."
    cd "$BACKEND_DIR"
    $VENV_DIR/bin/python create_admin.py
    
    if [ $? -eq 0 ]; then
        log_success "Usuário administrador criado com sucesso!"
        echo ""
        log_info "═══════════════════════════════════════════════════════"
        log_info "CREDENCIAIS DE ACESSO PADRÃO:"
        echo "  Username: admin"
        echo "  Email:    admin@exemplo.com.br"
        echo "  Senha:    admin123"
        log_warning "⚠️  ALTERE A SENHA PADRÃO APÓS O PRIMEIRO LOGIN!"
        log_info "═══════════════════════════════════════════════════════"
        echo ""
    else
        log_warning "Erro ao criar usuário admin. Execute manualmente:"
        log_warning "cd $BACKEND_DIR && $VENV_DIR/bin/python create_admin.py"
    fi
else
    log_warning "Script create_admin.py não encontrado"
fi

# ==============================================================================
# 13. RESUMO E INFORMAÇÕES
# ==============================================================================
log_success "==================================================================="
log_success "INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
log_success "==================================================================="

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
log_info "📋 INFORMAÇÕES DO SISTEMA:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend:  http://localhost:8001"
echo "  • PostgreSQL: localhost:5432 (Database: chatplus_db)"
echo ""
log_info "🌐 ACESSO EXTERNO (se aplicável):"
echo "  • Frontend: http://$SERVER_IP:3000"
echo "  • Backend:  http://$SERVER_IP:8001"
echo ""
log_info "🔧 COMANDOS ÚTEIS:"
echo "  • Status dos serviços:   supervisorctl status"
echo "  • Reiniciar backend:     supervisorctl restart backend"
echo "  • Reiniciar frontend:    supervisorctl restart frontend"
echo "  • Reiniciar tudo:        supervisorctl restart all"
echo "  • Ver logs do backend:   tail -f /var/log/supervisor/backend.*.log"
echo "  • Ver logs do frontend:  tail -f /var/log/supervisor/frontend.*.log"
echo "  • Status do PostgreSQL:  systemctl status postgresql"
echo "  • Acessar PostgreSQL:    sudo -u postgres psql chatplus_db"
echo ""
log_info "📁 DIRETÓRIOS:"
echo "  • Projeto:  $PROJECT_DIR"
echo "  • Backend:  $BACKEND_DIR"
echo "  • Frontend: $FRONTEND_DIR"
echo "  • Venv:     $VENV_DIR"
echo ""
log_warning "⚠️  PRÓXIMOS PASSOS:"
echo "  1. Acesse o sistema: http://localhost:3000"
echo "  2. Faça login com as credenciais padrão (admin/admin123)"
echo "  3. ALTERE A SENHA PADRÃO imediatamente!"
echo "  4. Edite o JWT_SECRET_KEY em $BACKEND_DIR/.env para produção"
echo "  5. Configure o REACT_APP_BACKEND_URL no frontend se necessário"
echo "  6. Configure o firewall se necessário: ufw enable"
echo ""

# Verificar se os serviços estão rodando
log_info "🔍 VERIFICAÇÃO FINAL:"
if curl -s http://localhost:8001/docs > /dev/null 2>&1; then
    log_success "✓ Backend está respondendo"
else
    log_warning "✗ Backend não está respondendo. Verifique os logs."
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    log_success "✓ Frontend está respondendo"
else
    log_warning "✗ Frontend não está respondendo. Verifique os logs."
fi

if systemctl is-active --quiet postgresql; then
    log_success "✓ PostgreSQL está rodando"
else
    log_warning "✗ PostgreSQL não está rodando"
fi

echo ""
log_success "Instalação finalizada! 🎉"
log_info "Para suporte, verifique os logs em /var/log/supervisor/"
