#!/bin/bash

################################################################################
# Script de Verificação - Sistema de Atendimento Empresarial
# Verifica o status de todos os componentes do sistema
#
# Uso: bash check-system.sh
################################################################################

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "========================================================================="
echo "    Verificação do Sistema de Atendimento Empresarial"
echo "========================================================================="
echo ""

# Contador de problemas
ISSUES=0

# ==============================================================================
# 1. VERIFICAR SISTEMA OPERACIONAL
# ==============================================================================
log_info "1. Sistema Operacional"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "   OS: $PRETTY_NAME"
    if [[ "$VERSION_ID" == "24.04" ]]; then
        log_success "Ubuntu 24.04 detectado"
    else
        log_warning "Versão diferente do Ubuntu 24.04"
    fi
else
    log_error "Não foi possível detectar o sistema operacional"
    ((ISSUES++))
fi
echo ""

# ==============================================================================
# 2. VERIFICAR DEPENDÊNCIAS
# ==============================================================================
log_info "2. Dependências do Sistema"

# Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    log_success "Python: $PYTHON_VERSION"
else
    log_error "Python não está instalado"
    ((ISSUES++))
fi

# Pip
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version | awk '{print $2}')
    log_success "Pip: $PIP_VERSION"
else
    log_error "Pip não está instalado"
    ((ISSUES++))
fi

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js: $NODE_VERSION"
else
    log_error "Node.js não está instalado"
    ((ISSUES++))
fi

# Yarn
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    log_success "Yarn: $YARN_VERSION"
else
    log_error "Yarn não está instalado"
    ((ISSUES++))
fi

# MongoDB
if command -v mongod &> /dev/null; then
    MONGO_VERSION=$(mongod --version | head -1 | awk '{print $3}' | sed 's/v//')
    log_success "MongoDB: $MONGO_VERSION"
else
    log_error "MongoDB não está instalado"
    ((ISSUES++))
fi

# Supervisor
if command -v supervisorctl &> /dev/null; then
    log_success "Supervisor está instalado"
else
    log_error "Supervisor não está instalado"
    ((ISSUES++))
fi

echo ""

# ==============================================================================
# 3. VERIFICAR SERVIÇOS
# ==============================================================================
log_info "3. Status dos Serviços"

# MongoDB
if systemctl is-active --quiet mongod; then
    log_success "MongoDB está rodando"
else
    log_error "MongoDB NÃO está rodando"
    ((ISSUES++))
fi

# Supervisor
if systemctl is-active --quiet supervisor; then
    log_success "Supervisor está rodando"
else
    log_error "Supervisor NÃO está rodando"
    ((ISSUES++))
fi

# Backend (via supervisor)
if supervisorctl status backend 2>/dev/null | grep -q RUNNING; then
    log_success "Backend está rodando"
else
    log_error "Backend NÃO está rodando"
    ((ISSUES++))
fi

# Frontend (via supervisor)
if supervisorctl status frontend 2>/dev/null | grep -q RUNNING; then
    log_success "Frontend está rodando"
else
    log_error "Frontend NÃO está rodando"
    ((ISSUES++))
fi

echo ""

# ==============================================================================
# 4. VERIFICAR PORTAS
# ==============================================================================
log_info "4. Portas em Uso"

# Porta 3000 (Frontend)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_success "Porta 3000 (Frontend) está em uso"
else
    log_error "Porta 3000 (Frontend) NÃO está em uso"
    ((ISSUES++))
fi

# Porta 8001 (Backend)
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_success "Porta 8001 (Backend) está em uso"
else
    log_error "Porta 8001 (Backend) NÃO está em uso"
    ((ISSUES++))
fi

# Porta 27017 (MongoDB)
if lsof -Pi :27017 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_success "Porta 27017 (MongoDB) está em uso"
else
    log_error "Porta 27017 (MongoDB) NÃO está em uso"
    ((ISSUES++))
fi

echo ""

# ==============================================================================
# 5. VERIFICAR DIRETÓRIOS E ARQUIVOS
# ==============================================================================
log_info "5. Estrutura de Diretórios"

if [ -d "/app" ]; then
    log_success "Diretório /app existe"
else
    log_error "Diretório /app NÃO existe"
    ((ISSUES++))
fi

if [ -d "/app/backend" ]; then
    log_success "Diretório /app/backend existe"
else
    log_error "Diretório /app/backend NÃO existe"
    ((ISSUES++))
fi

if [ -d "/app/frontend" ]; then
    log_success "Diretório /app/frontend existe"
else
    log_error "Diretório /app/frontend NÃO existe"
    ((ISSUES++))
fi

if [ -f "/app/backend/.env" ]; then
    log_success "Arquivo /app/backend/.env existe"
else
    log_error "Arquivo /app/backend/.env NÃO existe"
    ((ISSUES++))
fi

if [ -f "/app/frontend/.env" ]; then
    log_success "Arquivo /app/frontend/.env existe"
else
    log_error "Arquivo /app/frontend/.env NÃO existe"
    ((ISSUES++))
fi

if [ -d "/root/.venv" ]; then
    log_success "Ambiente virtual Python existe"
else
    log_error "Ambiente virtual Python NÃO existe"
    ((ISSUES++))
fi

echo ""

# ==============================================================================
# 6. VERIFICAR CONECTIVIDADE
# ==============================================================================
log_info "6. Conectividade dos Serviços"

# Backend
if curl -s http://localhost:8001/docs > /dev/null 2>&1; then
    log_success "Backend responde em http://localhost:8001"
else
    log_error "Backend NÃO responde em http://localhost:8001"
    ((ISSUES++))
fi

# Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    log_success "Frontend responde em http://localhost:3000"
else
    log_warning "Frontend pode estar carregando... (verifique logs)"
fi

# MongoDB
if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    log_success "Conexão com MongoDB está OK"
else
    log_error "Falha ao conectar com MongoDB"
    ((ISSUES++))
fi

echo ""

# ==============================================================================
# 7. VERIFICAR RECURSOS DO SISTEMA
# ==============================================================================
log_info "7. Recursos do Sistema"

# Memória
TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
USED_MEM=$(free -h | awk '/^Mem:/ {print $3}')
echo "   Memória: $USED_MEM / $TOTAL_MEM em uso"

# Disco
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    log_success "Uso de disco: $DISK_USAGE%"
else
    log_warning "Uso de disco alto: $DISK_USAGE%"
fi

# Load Average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
echo "   Load Average:$LOAD_AVG"

echo ""

# ==============================================================================
# 8. LOGS RECENTES
# ==============================================================================
log_info "8. Últimas Linhas dos Logs"

if [ -f "/var/log/supervisor/backend.err.log" ]; then
    BACKEND_ERRORS=$(tail -n 5 /var/log/supervisor/backend.err.log 2>/dev/null | grep -i error | wc -l)
    if [ "$BACKEND_ERRORS" -gt 0 ]; then
        log_warning "Backend tem $BACKEND_ERRORS erros nos últimos logs"
        echo "   Execute: tail -n 20 /var/log/supervisor/backend.err.log"
    else
        log_success "Sem erros recentes no backend"
    fi
fi

if [ -f "/var/log/supervisor/frontend.err.log" ]; then
    FRONTEND_ERRORS=$(tail -n 5 /var/log/supervisor/frontend.err.log 2>/dev/null | grep -i error | wc -l)
    if [ "$FRONTEND_ERRORS" -gt 0 ]; then
        log_warning "Frontend tem $FRONTEND_ERRORS erros nos últimos logs"
        echo "   Execute: tail -n 20 /var/log/supervisor/frontend.err.log"
    else
        log_success "Sem erros recentes no frontend"
    fi
fi

echo ""

# ==============================================================================
# RESUMO FINAL
# ==============================================================================
echo "========================================================================="
if [ $ISSUES -eq 0 ]; then
    log_success "Sistema está funcionando corretamente! ✓"
    echo ""
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo "Acesse o sistema em:"
    echo "  • Frontend: http://localhost:3000 ou http://$SERVER_IP:3000"
    echo "  • Backend:  http://localhost:8001 ou http://$SERVER_IP:8001"
    echo "  • API Docs: http://localhost:8001/docs"
else
    log_error "Encontrados $ISSUES problema(s) no sistema"
    echo ""
    echo "Comandos úteis para diagnóstico:"
    echo "  • supervisorctl status"
    echo "  • sudo systemctl status mongod"
    echo "  • tail -f /var/log/supervisor/backend.err.log"
    echo "  • tail -f /var/log/supervisor/frontend.err.log"
fi
echo "========================================================================="
