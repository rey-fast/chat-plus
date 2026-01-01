#!/bin/bash

################################################################################
# Script de Desinstalação - Sistema de Atendimento Empresarial
# Remove todos os componentes instalados pelo script install.sh
#
# ATENÇÃO: Este script remove PERMANENTEMENTE dados e configurações!
#
# Uso: sudo bash uninstall.sh
################################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

log_warning "==================================================================="
log_warning "ATENÇÃO: SCRIPT DE DESINSTALAÇÃO"
log_warning "==================================================================="
echo ""
log_warning "Este script irá:"
echo "  • Parar todos os serviços do sistema"
echo "  • Remover configurações do Supervisor"
echo "  • OPCIONAL: Remover MongoDB e seus dados"
echo "  • OPCIONAL: Remover Node.js, Python e dependências"
echo "  • OPCIONAL: Remover diretórios do projeto"
echo ""
log_error "ATENÇÃO: Alguns dados podem ser PERMANENTEMENTE perdidos!"
echo ""

read -p "Deseja continuar? (digite 'SIM' para confirmar): " -r
if [[ ! $REPLY == "SIM" ]]; then
    log_info "Desinstalação cancelada"
    exit 0
fi

echo ""
log_info "Iniciando desinstalação..."
echo ""

# ==============================================================================
# 1. PARAR SERVIÇOS
# ==============================================================================
log_info "1. Parando serviços..."

if command -v supervisorctl &> /dev/null; then
    supervisorctl stop backend 2>/dev/null || true
    supervisorctl stop frontend 2>/dev/null || true
    log_success "Serviços do Supervisor parados"
fi

# ==============================================================================
# 2. REMOVER CONFIGURAÇÕES DO SUPERVISOR
# ==============================================================================
log_info "2. Removendo configurações do Supervisor..."

if [ -f "/etc/supervisor/conf.d/chatplus.conf" ]; then
    rm -f /etc/supervisor/conf.d/chatplus.conf
    supervisorctl reread 2>/dev/null || true
    supervisorctl update 2>/dev/null || true
    log_success "Configurações do Supervisor removidas"
else
    log_info "Arquivo de configuração do Supervisor não encontrado"
fi

# ==============================================================================
# 3. REMOVER LOGS
# ==============================================================================
log_info "3. Removendo logs..."

rm -f /var/log/supervisor/backend.*.log 2>/dev/null || true
rm -f /var/log/supervisor/frontend.*.log 2>/dev/null || true
log_success "Logs removidos"

# ==============================================================================
# 4. PERGUNTAR SOBRE MONGODB
# ==============================================================================
echo ""
read -p "Deseja remover o MongoDB e TODOS os seus dados? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "4. Removendo MongoDB..."
    
    systemctl stop mongod 2>/dev/null || true
    systemctl disable mongod 2>/dev/null || true
    
    apt-get purge -y mongodb-org* 2>/dev/null || true
    
    rm -rf /var/lib/mongodb
    rm -rf /var/log/mongodb
    rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list
    rm -f /usr/share/keyrings/mongodb-server-7.0.gpg
    
    log_success "MongoDB removido"
else
    log_info "4. MongoDB mantido no sistema"
fi

# ==============================================================================
# 5. PERGUNTAR SOBRE NODE.JS E YARN
# ==============================================================================
echo ""
read -p "Deseja remover Node.js e Yarn? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "5. Removendo Node.js e Yarn..."
    
    npm uninstall -g yarn 2>/dev/null || true
    apt-get purge -y nodejs 2>/dev/null || true
    rm -f /etc/apt/sources.list.d/nodesource.list
    
    log_success "Node.js e Yarn removidos"
else
    log_info "5. Node.js e Yarn mantidos no sistema"
fi

# ==============================================================================
# 6. PERGUNTAR SOBRE PYTHON E VENV
# ==============================================================================
echo ""
read -p "Deseja remover o ambiente virtual Python (/root/.venv)? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "6. Removendo ambiente virtual Python..."
    
    rm -rf /root/.venv
    
    log_success "Ambiente virtual Python removido"
else
    log_info "6. Ambiente virtual Python mantido"
fi

# ==============================================================================
# 7. PERGUNTAR SOBRE DIRETÓRIO DO PROJETO
# ==============================================================================
echo ""
log_warning "ATENÇÃO: O próximo passo remove TODO o diretório /app"
read -p "Deseja remover o diretório /app e TODOS os seus arquivos? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "7. Removendo diretório do projeto..."
    
    # Backup opcional
    read -p "Deseja fazer backup antes de remover? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        BACKUP_DIR="/root/chatplus_backup_$(date +%Y%m%d_%H%M%S)"
        log_info "Criando backup em $BACKUP_DIR..."
        cp -r /app "$BACKUP_DIR"
        log_success "Backup criado em $BACKUP_DIR"
    fi
    
    rm -rf /app
    log_success "Diretório do projeto removido"
else
    log_info "7. Diretório do projeto mantido"
fi

# ==============================================================================
# 8. PERGUNTAR SOBRE SUPERVISOR E NGINX
# ==============================================================================
echo ""
read -p "Deseja remover Supervisor e Nginx? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "8. Removendo Supervisor e Nginx..."
    
    systemctl stop supervisor 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    
    apt-get purge -y supervisor nginx 2>/dev/null || true
    
    log_success "Supervisor e Nginx removidos"
else
    log_info "8. Supervisor e Nginx mantidos"
fi

# ==============================================================================
# 9. LIMPEZA FINAL
# ==============================================================================
log_info "9. Limpeza final do sistema..."

apt-get autoremove -y 2>/dev/null || true
apt-get autoclean -y 2>/dev/null || true

log_success "Limpeza concluída"

# ==============================================================================
# RESUMO
# ==============================================================================
echo ""
log_success "==================================================================="
log_success "DESINSTALAÇÃO CONCLUÍDA"
log_success "==================================================================="
echo ""
log_info "Componentes que permaneceram no sistema:"
echo ""

if command -v python3 &> /dev/null; then
    echo "  • Python 3: $(python3 --version)"
fi

if command -v node &> /dev/null; then
    echo "  • Node.js: $(node --version)"
fi

if command -v mongod &> /dev/null; then
    echo "  • MongoDB: $(mongod --version | head -1)"
fi

if command -v supervisorctl &> /dev/null; then
    echo "  • Supervisor: Instalado"
fi

if [ -d "/app" ]; then
    echo "  • Diretório /app: Ainda existe"
fi

echo ""
log_info "Para remover pacotes órfãos, execute:"
echo "  sudo apt-get autoremove -y"
echo ""
log_info "Desinstalação finalizada!"
