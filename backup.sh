#!/bin/bash

################################################################################
# Script de Backup - Sistema de Atendimento Empresarial
# Cria backup completo do sistema incluindo código, configurações e banco de dados
#
# Uso: sudo bash backup.sh [diretorio-destino]
# Exemplo: sudo bash backup.sh /backups
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

# Diretório de destino do backup
BACKUP_ROOT="${1:-/root/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/chatplus_backup_$TIMESTAMP"

log_info "==================================================================="
log_info "Script de Backup - Sistema de Atendimento Empresarial"
log_info "==================================================================="
echo ""
log_info "Backup será criado em: $BACKUP_DIR"
echo ""

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# ==============================================================================
# 1. BACKUP DO CÓDIGO FONTE
# ==============================================================================
log_info "1. Fazendo backup do código fonte..."

if [ -d "/app" ]; then
    cp -r /app "$BACKUP_DIR/"
    log_success "Código fonte copiado"
else
    log_error "Diretório /app não encontrado"
    exit 1
fi

# ==============================================================================
# 2. BACKUP DO POSTGRESQL
# ==============================================================================
log_info "2. Fazendo backup do PostgreSQL..."

if command -v pg_dump &> /dev/null; then
    mkdir -p "$BACKUP_DIR/postgresql_dump"
    
    # Dump do banco de dados chatplus_db
    log_info "Fazendo dump do banco chatplus_db..."
    sudo -u postgres pg_dump chatplus_db > "$BACKUP_DIR/postgresql_dump/chatplus_db.sql" 2>/dev/null || \
    PGPASSWORD=postgres pg_dump -h localhost -U postgres chatplus_db > "$BACKUP_DIR/postgresql_dump/chatplus_db.sql"
    
    # Também fazer dump de todos os bancos (opcional)
    log_info "Fazendo dump global do PostgreSQL..."
    sudo -u postgres pg_dumpall > "$BACKUP_DIR/postgresql_dump/pg_dumpall.sql" 2>/dev/null || \
    PGPASSWORD=postgres pg_dumpall -h localhost -U postgres > "$BACKUP_DIR/postgresql_dump/pg_dumpall.sql"
    
    log_success "Backup do PostgreSQL criado"
else
    log_warning "pg_dump não encontrado, pulando backup do PostgreSQL"
fi

# ==============================================================================
# 3. BACKUP DAS CONFIGURAÇÕES DO SUPERVISOR
# ==============================================================================
log_info "3. Fazendo backup das configurações do Supervisor..."

mkdir -p "$BACKUP_DIR/supervisor"

if [ -f "/etc/supervisor/conf.d/chatplus.conf" ]; then
    cp /etc/supervisor/conf.d/chatplus.conf "$BACKUP_DIR/supervisor/"
    log_success "Configurações do Supervisor copiadas"
else
    log_warning "Arquivo de configuração do Supervisor não encontrado"
fi

# ==============================================================================
# 4. BACKUP DO AMBIENTE VIRTUAL PYTHON (OPCIONAL)
# ==============================================================================
log_info "4. Salvando lista de pacotes Python..."

if [ -d "/root/.venv" ]; then
    /root/.venv/bin/pip freeze > "$BACKUP_DIR/python_requirements.txt"
    log_success "Lista de pacotes Python salva"
else
    log_warning "Ambiente virtual Python não encontrado"
fi

# ==============================================================================
# 5. BACKUP DOS LOGS
# ==============================================================================
log_info "5. Fazendo backup dos logs..."

mkdir -p "$BACKUP_DIR/logs"

if [ -d "/var/log/supervisor" ]; then
    cp /var/log/supervisor/backend.*.log "$BACKUP_DIR/logs/" 2>/dev/null || true
    cp /var/log/supervisor/frontend.*.log "$BACKUP_DIR/logs/" 2>/dev/null || true
    log_success "Logs copiados"
else
    log_warning "Diretório de logs não encontrado"
fi

# ==============================================================================
# 6. CRIAR ARQUIVO DE INFORMAÇÕES DO SISTEMA
# ==============================================================================
log_info "6. Salvando informações do sistema..."

cat > "$BACKUP_DIR/system_info.txt" << EOF
# Backup do Sistema de Atendimento Empresarial
# Data: $(date)
# Hostname: $(hostname)

# Versão do Sistema Operacional
$(cat /etc/os-release)

# Versões de Software
Python: $(python3 --version 2>&1)
Node.js: $(node --version 2>&1)
PostgreSQL: $(psql --version 2>&1)
Yarn: $(yarn --version 2>&1)

# Status dos Serviços no momento do backup
$(supervisorctl status 2>&1)

# Portas em Uso
$(ss -tulpn 2>&1)

# Uso de Disco
$(df -h 2>&1)

# Uso de Memória
$(free -h 2>&1)
EOF

log_success "Informações do sistema salvas"

# ==============================================================================
# 7. CRIAR SCRIPT DE RESTAURAÇÃO
# ==============================================================================
log_info "7. Criando script de restauração..."

cat > "$BACKUP_DIR/restore.sh" << 'EOFSCRIPT'
#!/bin/bash

# Script de Restauração Automática
# Este script restaura o backup do sistema

set -e

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

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}[ERROR]${NC} Este script precisa ser executado como root"
    exit 1
fi

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_warning "==================================================================="
log_warning "RESTAURAÇÃO DE BACKUP"
log_warning "==================================================================="
echo ""
log_warning "Este processo irá:"
echo "  • Parar todos os serviços"
echo "  • Restaurar código fonte para /app"
echo "  • Restaurar banco de dados MongoDB"
echo "  • Restaurar configurações"
echo "  • Reiniciar serviços"
echo ""
read -p "Deseja continuar? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    log_info "Restauração cancelada"
    exit 0
fi

# Parar serviços
log_info "Parando serviços..."
supervisorctl stop all 2>/dev/null || true

# Fazer backup do /app atual
if [ -d "/app" ]; then
    log_info "Fazendo backup do /app atual..."
    mv /app "/app_before_restore_$(date +%Y%m%d_%H%M%S)"
fi

# Restaurar código
log_info "Restaurando código fonte..."
if [ -d "$BACKUP_DIR/app" ]; then
    cp -r "$BACKUP_DIR/app" /app
    log_success "Código fonte restaurado"
else
    log_warning "Backup do código não encontrado"
fi

# Restaurar PostgreSQL
if [ -d "$BACKUP_DIR/postgresql_dump" ]; then
    log_info "Restaurando PostgreSQL..."
    
    # Restaurar banco chatplus_db
    if [ -f "$BACKUP_DIR/postgresql_dump/chatplus_db.sql" ]; then
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS chatplus_db;" 2>/dev/null || true
        sudo -u postgres psql -c "CREATE DATABASE chatplus_db;" 2>/dev/null || true
        sudo -u postgres psql chatplus_db < "$BACKUP_DIR/postgresql_dump/chatplus_db.sql" 2>/dev/null || \
        PGPASSWORD=postgres psql -h localhost -U postgres chatplus_db < "$BACKUP_DIR/postgresql_dump/chatplus_db.sql"
        log_success "PostgreSQL restaurado"
    fi
else
    log_warning "Backup do PostgreSQL não encontrado"
fi

# Restaurar configuração do Supervisor
if [ -f "$BACKUP_DIR/supervisor/chatplus.conf" ]; then
    log_info "Restaurando configuração do Supervisor..."
    cp "$BACKUP_DIR/supervisor/chatplus.conf" /etc/supervisor/conf.d/
    supervisorctl reread
    supervisorctl update
    log_success "Configuração do Supervisor restaurada"
fi

# Reiniciar serviços
log_info "Reiniciando serviços..."
supervisorctl start all

sleep 5

log_success "==================================================================="
log_success "RESTAURAÇÃO CONCLUÍDA"
log_success "==================================================================="
echo ""
log_info "Verifique o status dos serviços:"
supervisorctl status
echo ""
log_info "Acesse:"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend:  http://localhost:8001"
EOFSCRIPT

chmod +x "$BACKUP_DIR/restore.sh"
log_success "Script de restauração criado"

# ==============================================================================
# 8. COMPRIMIR BACKUP (OPCIONAL)
# ==============================================================================
log_info "8. Comprimindo backup..."

cd "$BACKUP_ROOT"
tar -czf "chatplus_backup_$TIMESTAMP.tar.gz" "chatplus_backup_$TIMESTAMP"

if [ -f "chatplus_backup_$TIMESTAMP.tar.gz" ]; then
    BACKUP_SIZE=$(du -h "chatplus_backup_$TIMESTAMP.tar.gz" | cut -f1)
    log_success "Backup comprimido criado: chatplus_backup_$TIMESTAMP.tar.gz ($BACKUP_SIZE)"
    
    # Perguntar se deve remover pasta não comprimida
    read -p "Deseja remover a pasta não comprimida e manter apenas o .tar.gz? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        rm -rf "$BACKUP_DIR"
        log_success "Pasta não comprimida removida"
    fi
else
    log_warning "Falha ao comprimir backup"
fi

# ==============================================================================
# RESUMO
# ==============================================================================
log_success "==================================================================="
log_success "BACKUP CONCLUÍDO COM SUCESSO!"
log_success "==================================================================="
echo ""
log_info "📦 Arquivos de Backup:"
echo ""

if [ -f "$BACKUP_ROOT/chatplus_backup_$TIMESTAMP.tar.gz" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_ROOT/chatplus_backup_$TIMESTAMP.tar.gz" | cut -f1)
    echo "  • Arquivo comprimido:"
    echo "    $BACKUP_ROOT/chatplus_backup_$TIMESTAMP.tar.gz"
    echo "    Tamanho: $BACKUP_SIZE"
fi

if [ -d "$BACKUP_DIR" ]; then
    DIR_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    echo "  • Diretório:"
    echo "    $BACKUP_DIR"
    echo "    Tamanho: $DIR_SIZE"
fi

echo ""
log_info "📋 Conteúdo do Backup:"
echo "  • Código fonte (/app)"
echo "  • Banco de dados PostgreSQL"
echo "  • Configurações do Supervisor"
echo "  • Lista de pacotes Python"
echo "  • Logs do sistema"
echo "  • Informações do sistema"
echo "  • Script de restauração (restore.sh)"
echo ""

log_info "🔄 Para Restaurar o Backup:"
echo ""
if [ -f "$BACKUP_ROOT/chatplus_backup_$TIMESTAMP.tar.gz" ]; then
    echo "  1. Extrair o backup:"
    echo "     tar -xzf $BACKUP_ROOT/chatplus_backup_$TIMESTAMP.tar.gz -C $BACKUP_ROOT"
    echo ""
    echo "  2. Executar restauração:"
    echo "     sudo bash $BACKUP_ROOT/chatplus_backup_$TIMESTAMP/restore.sh"
elif [ -d "$BACKUP_DIR" ]; then
    echo "     sudo bash $BACKUP_DIR/restore.sh"
fi
echo ""

log_warning "⚠️  IMPORTANTE:"
echo "  • Guarde este backup em local seguro"
echo "  • Teste a restauração em ambiente de testes"
echo "  • Faça backups regulares dos seus dados"
echo ""

log_success "Backup finalizado! 🎉"
