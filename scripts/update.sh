#!/bin/bash

################################################################################
# Script de Atualização - Sistema de Atendimento Empresarial
# Atualiza dependências e componentes do sistema
#
# Uso: sudo bash update.sh [opcao]
# Opções:
#   all      - Atualizar tudo (padrão)
#   backend  - Apenas backend
#   frontend - Apenas frontend
#   system   - Apenas sistema operacional
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

# Opção de atualização
UPDATE_OPTION="${1:-all}"

log_info "==================================================================="
log_info "Script de Atualização - Sistema de Atendimento Empresarial"
log_info "==================================================================="
echo ""
log_info "Modo de atualização: $UPDATE_OPTION"
echo ""

# ==============================================================================
# FUNÇÃO: ATUALIZAR SISTEMA OPERACIONAL
# ==============================================================================
update_system() {
    log_info "Atualizando sistema operacional..."
    
    apt-get update
    apt-get upgrade -y
    apt-get autoremove -y
    apt-get autoclean -y
    
    log_success "Sistema operacional atualizado"
}

# ==============================================================================
# FUNÇÃO: ATUALIZAR BACKEND
# ==============================================================================
update_backend() {
    log_info "Atualizando backend..."
    
    # Parar backend
    supervisorctl stop backend 2>/dev/null || true
    
    # Atualizar pip
    /root/.venv/bin/pip install --upgrade pip
    
    # Atualizar dependências
    if [ -f "/app/backend/requirements.txt" ]; then
        log_info "Instalando/Atualizando dependências Python..."
        /root/.venv/bin/pip install -r /app/backend/requirements.txt --upgrade
        log_success "Dependências Python atualizadas"
    else
        log_warning "requirements.txt não encontrado"
    fi
    
    # Reiniciar backend
    supervisorctl start backend
    sleep 3
    
    if supervisorctl status backend | grep -q RUNNING; then
        log_success "Backend atualizado e rodando"
    else
        log_error "Backend não iniciou corretamente"
        log_info "Verifique os logs: tail -f /var/log/supervisor/backend.err.log"
    fi
}

# ==============================================================================
# FUNÇÃO: ATUALIZAR FRONTEND
# ==============================================================================
update_frontend() {
    log_info "Atualizando frontend..."
    
    # Parar frontend
    supervisorctl stop frontend 2>/dev/null || true
    
    if [ -d "/app/frontend" ]; then
        cd /app/frontend
        
        # Atualizar Yarn
        log_info "Atualizando Yarn..."
        npm install -g yarn
        
        # Atualizar dependências
        log_info "Atualizando dependências Node.js..."
        yarn upgrade
        
        log_success "Dependências do frontend atualizadas"
    else
        log_error "Diretório /app/frontend não encontrado"
        return 1
    fi
    
    # Reiniciar frontend
    supervisorctl start frontend
    sleep 5
    
    if supervisorctl status frontend | grep -q RUNNING; then
        log_success "Frontend atualizado e rodando"
    else
        log_error "Frontend não iniciou corretamente"
        log_info "Verifique os logs: tail -f /var/log/supervisor/frontend.err.log"
    fi
}

# ==============================================================================
# FUNÇÃO: VERIFICAR ATUALIZAÇÕES DISPONÍVEIS
# ==============================================================================
check_updates() {
    log_info "Verificando atualizações disponíveis..."
    echo ""
    
    # Python packages
    if [ -d "/root/.venv" ]; then
        log_info "Pacotes Python desatualizados:"
        /root/.venv/bin/pip list --outdated 2>/dev/null | head -10 || true
        echo ""
    fi
    
    # Node packages
    if [ -d "/app/frontend" ]; then
        log_info "Pacotes Node.js desatualizados:"
        cd /app/frontend
        yarn outdated 2>/dev/null | head -10 || true
        echo ""
    fi
    
    # System packages
    log_info "Pacotes do sistema desatualizados:"
    apt list --upgradable 2>/dev/null | head -10 || true
    echo ""
}

# ==============================================================================
# EXECUTAR ATUALIZAÇÃO BASEADA NA OPÇÃO
# ==============================================================================

case "$UPDATE_OPTION" in
    "all")
        log_info "Atualizando todos os componentes..."
        echo ""
        update_system
        echo ""
        update_backend
        echo ""
        update_frontend
        ;;
    
    "backend")
        update_backend
        ;;
    
    "frontend")
        update_frontend
        ;;
    
    "system")
        update_system
        ;;
    
    "check")
        check_updates
        exit 0
        ;;
    
    *)
        log_error "Opção inválida: $UPDATE_OPTION"
        echo ""
        echo "Uso: sudo bash update.sh [opcao]"
        echo ""
        echo "Opções disponíveis:"
        echo "  all      - Atualizar tudo (padrão)"
        echo "  backend  - Apenas backend"
        echo "  frontend - Apenas frontend"
        echo "  system   - Apenas sistema operacional"
        echo "  check    - Verificar atualizações disponíveis"
        echo ""
        exit 1
        ;;
esac

# ==============================================================================
# VERIFICAÇÃO FINAL
# ==============================================================================
echo ""
log_info "==================================================================="
log_info "Verificando status dos serviços..."
log_info "==================================================================="
echo ""

supervisorctl status

echo ""
log_info "URLs de acesso:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend:  http://localhost:8001"
echo "  • API Docs: http://localhost:8001/docs"
echo ""

# Teste de conectividade
log_info "Testando conectividade..."

if curl -s http://localhost:8001/docs > /dev/null 2>&1; then
    log_success "✓ Backend está respondendo"
else
    log_warning "✗ Backend não está respondendo"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    log_success "✓ Frontend está respondendo"
else
    log_warning "✗ Frontend pode estar carregando..."
fi

echo ""
log_success "Atualização concluída! 🎉"
echo ""
log_info "Para verificar o sistema completo, execute:"
echo "  bash /app/check-system.sh"
