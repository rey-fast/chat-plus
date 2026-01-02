#!/bin/bash
# install_v5.7.sh
# - Asks passwords only during Install LOCAL or Install PRODUCTION (hidden)
# - Update mode does not request passwords and does not touch DB/.env
# - Uses temporary venv for MongoDB operations, removed at end
# - Writes backend/frontend envs, builds frontend, creates systemd units with absolute paths
# - Aborts immediately on any error and prints Python tracebacks
set -euo pipefail
trap 'ec=$?; echo; echo "[ERROR] O script foi interrompido (linha $LINENO) exit=$ec"; exit $ec' ERR

#############################
# GLOBALS
#############################
INSTALL_DIR="/opt/chat"
BACKEND_DIR="$INSTALL_DIR/backend"
FRONTEND_DIR="$INSTALL_DIR/frontend"
BACKEND_PORT=8001
FRONTEND_PORT=3000
SERVICE_BACKEND="chat-backend"
SERVICE_FRONTEND="chat-frontend"

# SSH port (do not open 22)
SSH_PORT=4747

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_SRC="$SCRIPT_DIR/backend"
FRONTEND_SRC="$SCRIPT_DIR/frontend"

log(){ echo -e "\033[0;32m[INFO]\033[0m $1"; }
warn(){ echo -e "\033[1;33m[WARN]\033[0m $1"; }
err(){ echo -e "\033[0;31m[ERROR]\033[0m $1"; exit 1; }
require_root(){ [ "$EUID" -eq 0 ] || err "Execute como root"; }

#############################
# helper: ask secret (hidden)
#############################
ask_secret() {
    local prompt="$1"; local varname="$2"; local p1 p2
    while true; do
        read -s -p "$prompt: " p1; echo
        [ -n "$p1" ] || { echo "Senha vazia não permitida."; continue; }
        if [[ "$p1" =~ [[:space:]] ]]; then echo "Senha não pode conter espaços."; continue; fi
        read -s -p "Confirme a senha: " p2; echo
        [ "$p1" = "$p2" ] || { echo "Senhas não coincidem."; continue; }
        eval "$varname=\"\$p1\""
        break
    done
}

#############################
# PACKAGE INSTALL
#############################
install_common_packages() {
    log "Instalando pacotes essenciais..."
    apt update
    apt install -y curl wget git build-essential python3 python3-venv python3-pip jq ca-certificates ufw gnupg fail2ban
    if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "v20"; then
        log "Instalando Node.js v20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    fi
    if command -v npm >/dev/null 2>&1; then
        npm install -g yarn serve || warn "Falha ao instalar yarn/serve"
    fi
}

#############################
# FIREWALL (do not open 22)
#############################
firewall_allow_http_https() {
    log "Liberando temporariamente 80/443 para Let's Encrypt..."
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
}

configure_firewall() {
    log "Aplicando regras de firewall (não abre 22)..."
    ufw default deny incoming || true
    ufw default allow outgoing || true
    ufw allow "${SSH_PORT}/tcp"
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw deny 27017 || true
    echo "y" | ufw enable || warn "UFW já ativo ou falha ao habilitar"
}

#############################
# MONGODB INSTALL & SECURE ROOT
# TMP_VENV is created in install_mongodb() and removed at end of create_mongo_root_user_with_password()
#############################
install_mongodb() {
    log "Instalando MongoDB..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --dearmor | tee /usr/share/keyrings/mongodb-server-8.0.gpg >/dev/null
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
        | tee /etc/apt/sources.list.d/mongodb-org-8.0.list
    apt update
    apt install -y mongodb-org

    cp /etc/mongod.conf /etc/mongod.conf.bak-$(date +%s)

    # create TMP_VENV for mongodb operations (keep until verification completes)
    TMP_VENV="/tmp/mongo-setup-venv-$$"
    python3 -m venv "$TMP_VENV"
    "$TMP_VENV/bin/pip" install --upgrade pip >/dev/null 2>&1 || true
    "$TMP_VENV/bin/pip" install pymongo pyyaml >/dev/null 2>&1 || true

    log "Removendo temporary security.authorization (se presente) para iniciar sem auth..."
    "$TMP_VENV/bin/python3" <<PY
import yaml, sys
p='/etc/mongod.conf'
with open(p) as f:
    data=yaml.safe_load(f) or {}
data.pop('security', None)
with open(p,'w') as f:
    yaml.safe_dump(data,f)
print('mongod.conf ajustado (auth removido)')
PY

    systemctl enable --now mongod
    sleep 3
}

create_mongo_root_user_with_password() {
    [ -n "${MONGO_ROOT_PASS:-}" ] || err "MONGO_ROOT_PASS não definida. Abortando."
    log "Criando usuário root do MongoDB com a senha fornecida (usando venv $TMP_VENV)..."

    "$TMP_VENV/bin/python3" <<PY
from pymongo import MongoClient
mroot = """${MONGO_ROOT_PASS}"""
try:
    client = MongoClient('mongodb://127.0.0.1:27017', serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client['admin']
    users = db.command('usersInfo').get('users', [])
    if any(u.get('user') == 'root' for u in users):
        print("root já existe - pulando criação")
    else:
        db.command('createUser', 'root', pwd=mroot, roles=[{'role':'root','db':'admin'}])
        print("root criado com sucesso")
except Exception as e:
    import traceback, sys
    print("Erro criando root:", e)
    traceback.print_exc()
    sys.exit(2)
finally:
    try:
        client.close()
    except:
        pass
PY

    rc=$?; if [ "$rc" -ne 0 ]; then err "Falha ao executar bloco Python para criação do root do Mongo (exit $rc). Abortando."; fi

    log "Ativando authorization no mongod.conf..."
    "$TMP_VENV/bin/python3" <<PY
import yaml
p='/etc/mongod.conf'
with open(p) as f:
    data=yaml.safe_load(f) or {}
data.setdefault('security',{})['authorization']='enabled'
with open(p,'w') as f:
    yaml.safe_dump(data,f)
print('mongod.conf atualizado (auth enabled)')
PY

    rc=$?; if [ "$rc" -ne 0 ]; then err "Falha ao habilitar authorization no mongod.conf (exit $rc). Abortando."; fi

    systemctl restart mongod
    sleep 3

    log "Verificando autenticação root com o TMP_VENV..."
    "$TMP_VENV/bin/python3" <<PY
from pymongo import MongoClient
mroot = """${MONGO_ROOT_PASS}"""
try:
    client = MongoClient(f"mongodb://root:{mroot}@localhost:27017/admin", serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("Autenticação root verificada com sucesso.")
except Exception as e:
    import traceback, sys
    print("Erro verificando autenticação root:", e)
    traceback.print_exc()
    sys.exit(3)
finally:
    try:
        client.close()
    except:
        pass
PY

    rc=$?; if [ "$rc" -ne 0 ]; then err "Falha ao verificar autenticação root do Mongo (exit $rc). Abortando."; fi

    # safe to remove TMP_VENV after verification
    rm -rf "$TMP_VENV"
    log "Root do Mongo criado, authorization ativado e verificado com sucesso."
}

#############################
# BACKEND / FRONTEND HELPERS
#############################
create_system_user() {
    id -u chat >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin chat
}

create_directories() {
    mkdir -p "$INSTALL_DIR" "$BACKEND_DIR" "$FRONTEND_DIR" "$INSTALL_DIR/logs"
    chown -R chat:chat "$INSTALL_DIR" || true
}

create_systemd_services() {
    log "Criando serviços systemd com caminhos absolutos (atomic write)..."

    local backend_svc_tmp="/etc/systemd/system/${SERVICE_BACKEND}.service.new.$$"
    local frontend_svc_tmp="/etc/systemd/system/${SERVICE_FRONTEND}.service.new.$$"

    cat > "$backend_svc_tmp" <<'UNIT_EOF'
[Unit]
Description=ChatPlus Backend
After=network.target mongod.service

[Service]
User=chat
WorkingDirectory=BACKEND_DIR_PLACEHOLDER
Environment="PATH=BACKEND_DIR_PLACEHOLDER/venv/bin"
ExecStart=BACKEND_DIR_PLACEHOLDER/venv/bin/uvicorn server:app --host 127.0.0.1 --port BACKEND_PORT_PLACEHOLDER
Restart=on-failure
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
UNIT_EOF

    cat > "$frontend_svc_tmp" <<'UNIT_EOF'
[Unit]
Description=ChatPlus Frontend
After=network.target

[Service]
User=chat
WorkingDirectory=FRONTEND_DIR_PLACEHOLDER
ExecStart=/usr/bin/serve -s build -l FRONTEND_PORT_PLACEHOLDER
Restart=on-failure
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
UNIT_EOF

    # Replace placeholders
    sed -i "s|BACKEND_DIR_PLACEHOLDER|$BACKEND_DIR|g" "$backend_svc_tmp"
    sed -i "s|FRONTEND_DIR_PLACEHOLDER|$FRONTEND_DIR|g" "$frontend_svc_tmp"
    sed -i "s|BACKEND_PORT_PLACEHOLDER|$BACKEND_PORT|g" "$backend_svc_tmp"
    sed -i "s|FRONTEND_PORT_PLACEHOLDER|$FRONTEND_PORT|g" "$frontend_svc_tmp"

    mv "$backend_svc_tmp" "/etc/systemd/system/${SERVICE_BACKEND}.service" || err "Falha movendo backend service"
    mv "$frontend_svc_tmp" "/etc/systemd/system/${SERVICE_FRONTEND}.service" || err "Falha movendo frontend service"

    systemctl daemon-reload
    systemctl enable $SERVICE_BACKEND $SERVICE_FRONTEND || true
}

setup_backend() {
    log "Configurando backend (venv e dependências)..."
    python3 -m venv "$BACKEND_DIR/venv"
    source "$BACKEND_DIR/venv/bin/activate"
    pip install --upgrade pip
    if [ -f "$BACKEND_DIR/requirements.txt" ]; then
        pip install -r "$BACKEND_DIR/requirements.txt"
    else
        warn "requirements.txt não encontrado em $BACKEND_DIR"
    fi
    # Ensure uvicorn is available for systemd ExecStart
    pip install "uvicorn[standard]" || warn "Falha ao instalar uvicorn"
    deactivate || true
    warn "Serviço backend será reiniciado ao final da instalação."
}

write_backend_env_using_password() {
    if [ -z "${MONGO_ROOT_PASS:-}" ]; then err "MONGO_ROOT_PASS não definida; abortando."; fi
    mkdir -p "$BACKEND_DIR"
    local tmp="$BACKEND_DIR/.env.new.$$"
    cat > "$tmp" <<'ENV_EOF'
MONGO_URL=mongodb://root:REPLACEMONGO_PLACEHOLDER@localhost:27017/chat_db?authSource=admin
DB_NAME=chat_db
CORS_ORIGINS=
SECRET_KEY=REPLACERSK_PLACEHOLDER
ENV_EOF

    # Replace placeholders safely
    sed -i "s|REPLACEMONGO_PLACEHOLDER|${MONGO_ROOT_PASS}|g" "$tmp"
    sed -i "s|REPLACERSK_PLACEHOLDER|$(openssl rand -hex 32)|g" "$tmp"

    mv "$tmp" "$BACKEND_DIR/.env" || err "Falha ao escrever $BACKEND_DIR/.env"
    log "Arquivo $BACKEND_DIR/.env escrito."
}

write_frontend_env() {
    local scheme="$1"; local host="$2"
    mkdir -p "$FRONTEND_DIR"
    local tmp="$FRONTEND_DIR/.env.new.$$"
    cat > "$tmp" <<ENV_EOF
REACT_APP_BACKEND_URL=$scheme://$host
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
ENV_EOF

    # Only replace if content differs
    if [ -f "$FRONTEND_DIR/.env" ]; then
        if cmp -s "$tmp" "$FRONTEND_DIR/.env"; then
            rm -f "$tmp"
            log "Frontend .env unchanged."
            return 0
        fi
    fi

    mv "$tmp" "$FRONTEND_DIR/.env" || err "Falha ao escrever $FRONTEND_DIR/.env"
    log "Frontend .env escrito."
}

copy_sources() {
    mkdir -p "$BACKEND_DIR" "$FRONTEND_DIR"
    rm -rf "$BACKEND_DIR"/* "$FRONTEND_DIR"/* || true
    cp -r "$BACKEND_SRC"/* "$BACKEND_DIR"/ || true
    cp -r "$FRONTEND_SRC"/* "$FRONTEND_DIR"/ || true
    chown -R chat:chat "$INSTALL_DIR" || true
}

install_nginx(){ apt install -y nginx; }

nginx_config_basic() {
    local server_name="$1"
    local dest="/etc/nginx/sites-available/chat"
    local tmp="/etc/nginx/sites-available/chat.new.$$"
    local bak="/etc/nginx/sites-available/chat.bak.$(date +%s)"

    log "Gerando configuração Nginx temporária em $tmp (server_name=$server_name)"

    cat > "$tmp" <<'NGINX_EOF'
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

server {
    listen 80;
    server_name SERVERNAME_PLACEHOLDER;

    client_max_body_size 100M;

    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location /api {
        limit_req zone=one burst=20 nodelay;
        proxy_pass http://127.0.0.1:BACKENDPORT_PLACEHOLDER;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:FRONTENDPORT_PLACEHOLDER;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX_EOF

    # Now replace placeholders safely (avoid expanding $host)
    sed -i "s|SERVERNAME_PLACEHOLDER|$server_name|g" "$tmp"
    sed -i "s|BACKENDPORT_PLACEHOLDER|$BACKEND_PORT|g" "$tmp"
    sed -i "s|FRONTENDPORT_PLACEHOLDER|$FRONTEND_PORT|g" "$tmp"

    # backup existing file
    if [ -f "$dest" ]; then
        cp -a "$dest" "$bak" || warn "Falha ao criar backup $bak"
    fi

    # atomic move into place and test
    mv "$tmp" "$dest" || err "Falha ao mover $tmp -> $dest"
    if nginx -t >/dev/null 2>&1; then
        ln -sf "$dest" /etc/nginx/sites-enabled/chat
        rm -f /etc/nginx/sites-enabled/default || true
        systemctl reload nginx || warn "Falha ao recarregar nginx; verifique /var/log/nginx/error.log"
        log "Configuração Nginx aplicada com sucesso."
    else
        warn "nginx -t falhou; restaurando backup se existir"
        if [ -f "$bak" ]; then
            mv "$bak" "$dest" || warn "Falha ao restaurar backup $bak"
        fi
        systemctl reload nginx || true
        rm -f "$tmp" || true
        return 1
    fi
}

nginx_config_production_with_existing_ssl() {
    local server_name="$1"
    local dest="/etc/nginx/sites-available/chat"
    local tmp="/etc/nginx/sites-available/chat.new.$$"
    local bak="/etc/nginx/sites-available/chat.bak.$(date +%s)"

    log "Gerando configuração Nginx (HTTPS usando certificados existentes) temporária em $tmp (server_name=$server_name)"

    cat > "$tmp" <<'NGINX_EOF'
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

server {
    listen 80;
    server_name SERVERNAME_PLACEHOLDER;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name SERVERNAME_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/SERVERNAME_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SERVERNAME_PLACEHOLDER/privkey.pem;

    client_max_body_size 100M;

    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location /api {
        limit_req zone=one burst=20 nodelay;
        proxy_pass http://127.0.0.1:BACKENDPORT_PLACEHOLDER;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:FRONTENDPORT_PLACEHOLDER;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX_EOF

    # replace placeholders
    sed -i "s|SERVERNAME_PLACEHOLDER|$server_name|g" "$tmp"
    sed -i "s|BACKENDPORT_PLACEHOLDER|$BACKEND_PORT|g" "$tmp"
    sed -i "s|FRONTENDPORT_PLACEHOLDER|$FRONTEND_PORT|g" "$tmp"

    # backup existing file
    if [ -f "$dest" ]; then
        cp -a "$dest" "$bak" || warn "Falha ao criar backup $bak"
    fi

    mv "$tmp" "$dest" || err "Falha ao mover $tmp -> $dest"
    if nginx -t >/dev/null 2>&1; then
        ln -sf "$dest" /etc/nginx/sites-enabled/chat
        rm -f /etc/nginx/sites-enabled/default || true
        systemctl reload nginx || warn "Falha ao recarregar nginx; verifique /var/log/nginx/error.log"
        log "Configuração Nginx HTTPS aplicada com sucesso."
    else
        warn "nginx -t falhou; restaurando backup se existir"
        if [ -f "$bak" ]; then
            mv "$bak" "$dest" || warn "Falha ao restaurar backup $bak"
        fi
        systemctl reload nginx || true
        rm -f "$tmp" || true
        return 1
    fi
}

install_certbot() {
    if ! command -v certbot >/dev/null 2>&1; then
        apt install -y snapd
        snap install core
        snap install --classic certbot
        ln -sf /snap/bin/certbot /usr/bin/certbot || true
    fi
}

configure_cert_renewal_cron() {
    (crontab -l 2>/dev/null || true; echo "0 3 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx") | crontab -
}

setup_frontend_build() {
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        # Ensure serve is installed globally so systemd ExecStart can use /usr/bin/serve
        if command -v npm >/dev/null 2>&1; then
            npm install -g serve || warn \"Falha ao instalar serve globalmente\"
        else
            warn \"npm não encontrado; frontend pode não iniciar via /usr/bin/serve\"
        fi
        (cd "$FRONTEND_DIR" && yarn install --silent && yarn build) || warn "Falha no build do frontend"
    fi
}

create_admin_user_with_password() {
    [ -n "${ADMIN_PASS:-}" ] || err "ADMIN_PASS não definida. Abortando."
    log "Criando usuário admin usando senha fornecida..."

    TMP_ADMIN_VENV=""
    if [ -x "$BACKEND_DIR/venv/bin/python3" ]; then
        PY_BIN="$BACKEND_DIR/venv/bin/python3"
        "$BACKEND_DIR/venv/bin/pip" install --upgrade pip >/dev/null 2>&1 || true
        "$BACKEND_DIR/venv/bin/pip" install motor passlib python-dotenv >/dev/null 2>&1 || true
    else
        TMP_ADMIN_VENV="/tmp/admin-venv-$$"
        python3 -m venv "$TMP_ADMIN_VENV"
        PY_BIN="$TMP_ADMIN_VENV/bin/python3"
        "$TMP_ADMIN_VENV/bin/pip" install --upgrade pip >/dev/null 2>&1 || true
        "$TMP_ADMIN_VENV/bin/pip" install motor passlib python-dotenv >/dev/null 2>&1
    fi

    "$PY_BIN" <<PY
import asyncio, os, uuid, sys, traceback

# --- FIX Passlib + bcrypt >= 4.1.x ---
import bcrypt as _bcrypt
if not hasattr(_bcrypt, "__about__"):
    class _About:
        __version__ = _bcrypt.__version__
    _bcrypt.__about__ = _About()
# -------------------------------------

from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone

if not os.path.exists("$BACKEND_DIR/.env"):
    print("Arquivo $BACKEND_DIR/.env não encontrado — crie-o antes. Abortando."); sys.exit(3)

load_dotenv("$BACKEND_DIR/.env")
DB = os.getenv("DB_NAME")
if not DB:
    print("DB_NAME não encontrado em $BACKEND_DIR/.env — abortando."); sys.exit(3)

mroot = """${MONGO_ROOT_PASS}"""
admin_pass = os.getenv("ADMIN_PASS") or """${ADMIN_PASS}"""
pwd_context = CryptContext(schemes=["bcrypt"])

try:
    client = AsyncIOMotorClient(f"mongodb://root:{mroot}@localhost:27017/?authSource=admin")
    db = client[DB]

    async def go():
        ex = await db.users.find_one({"username":"admin"})
        if ex:
            print("admin já existe - pulando inserção"); return

        hashed = pwd_context.hash(admin_pass)
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Administrador",
            "username": "admin",
            "email": "admin@exemplo.com.br",
            "password_hash": hashed,
            "role": "admin",
			"created_at": datetime.now(timezone.utc)
        })
        print("admin criado com sucesso")

    asyncio.run(go())

except Exception as e:
    print("Erro criando admin:", e); traceback.print_exc(); sys.exit(4)

finally:
    try: client.close()
    except: pass
PY

    rc=$?; if [ "$rc" -ne 0 ]; then
        [ -n "${TMP_ADMIN_VENV:-}" ] && rm -rf "$TMP_ADMIN_VENV"
        err "Falha ao criar admin via Python (exit $rc). Abortando."
    fi

    [ -n "${TMP_ADMIN_VENV:-}" ] && rm -rf "$TMP_ADMIN_VENV"
    log "Admin criado com sucesso."
}

#############################
# Install flows
#############################

restart_services() {
    LOGFILE="/var/log/chat-install.log"
    mkdir -p "$(dirname "$LOGFILE")"
    {
        echo "=== restart_services called: $(date -u +"%Y-%m-%d %H:%M:%S UTC") ==="
        echo "daemon-reload..."
        systemctl daemon-reload || echo "[WARN] systemctl daemon-reload failed (exit $?)"
        echo "enable services..."
        systemctl enable "$SERVICE_BACKEND" "$SERVICE_FRONTEND" || echo "[WARN] enable failed (exit $?)"
        echo "restart backend..."
        systemctl restart "$SERVICE_BACKEND" || echo "[WARN] restart backend failed (exit $?)"
        sleep 1
        systemctl is-active --quiet "$SERVICE_BACKEND" || echo "[WARN] backend not active after restart"
        echo "restart frontend..."
        systemctl restart "$SERVICE_FRONTEND" || echo "[WARN] restart frontend failed (exit $?)"
        sleep 1
        systemctl is-active --quiet "$SERVICE_FRONTEND" || echo "[WARN] frontend not active after restart"
        echo "=== restart_services finished ==="
    } >> "$LOGFILE" 2>&1

    systemctl is-active --quiet "$SERVICE_BACKEND" && log "Backend active" || warn "Backend inactive after restart (see $LOGFILE)"
    systemctl is-active --quiet "$SERVICE_FRONTEND" && log "Frontend active" || warn "Frontend inactive after restart (see $LOGFILE)"
}


mode_local() {
    require_root
    ask_secret "Senha para o MongoDB root (entrada oculta)" MONGO_ROOT_PASS
    ask_secret "Senha para o usuário admin da aplicação (entrada oculta)" ADMIN_PASS

    read -p "IP local: " LOCAL_IP
    install_common_packages
    firewall_allow_http_https
    install_mongodb

    # ask secrets for install-local only

    create_mongo_root_user_with_password
    install_certbot
    install_nginx
    create_system_user
    create_directories
    create_systemd_services
    copy_sources
    write_backend_env_using_password
    setup_backend
    write_frontend_env "http" "$LOCAL_IP"
    setup_frontend_build
    create_admin_user_with_password
    nginx_config_basic "$LOCAL_IP"
    set +e
    configure_cert_renewal_cron || warn "configure_cert_renewal_cron falhou"
    configure_firewall || warn "configure_firewall falhou"
    set -e
    restart_services
    log "Instalação LOCAL concluída: http://$LOCAL_IP"
}

mode_production() {
    require_root
    ask_secret "Senha para o MongoDB root (entrada oculta)" MONGO_ROOT_PASS
    ask_secret "Senha para o usuário admin da aplicação (entrada oculta)" ADMIN_PASS

    read -p "Domínio: " DOMAIN
    read -p "E-mail Let's Encrypt: " EMAIL
    install_common_packages
    firewall_allow_http_https
    install_mongodb

    # ask secrets for install-production only

    create_mongo_root_user_with_password
    install_certbot
    install_nginx
    create_system_user
    create_directories
    create_systemd_services
    copy_sources
    write_backend_env_using_password
    setup_backend
    write_frontend_env "https" "$DOMAIN"
    setup_frontend_build
    create_admin_user_with_password
    nginx_config_basic "$DOMAIN"
    set +e
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || warn "Certbot falhou; verifique logs"
    configure_cert_renewal_cron || warn "configure_cert_renewal_cron falhou"
    configure_firewall || warn "configure_firewall falhou"
    set -e
    restart_services
log "Instalação PRODUÇÃO concluída: https://$DOMAIN"
}

mode_update() {
    require_root
    echo "Atualizando fontes e rebuild (sem pedir senhas, sem tocar no banco)"

    copy_sources

    # Determine frontend host and scheme intelligently without prompting:
    # 1) If frontend .env exists and REACT_APP_BACKEND_URL is set and not 127.0.0.1, preserve it.
    FRONTEND_ENV_FILE="$FRONTEND_DIR/.env"
    DETECT_SCHEME="http"
    DETECT_HOST="127.0.0.1"

    if [ -f "$FRONTEND_ENV_FILE" ]; then
        val=$(grep -E '^REACT_APP_BACKEND_URL=' "$FRONTEND_ENV_FILE" | head -n1 | cut -d'=' -f2- || true)
        if [ -n "$val" ]; then
            # strip quotes
            val="${val%\"}"; val="${val#\"}"
            # if it's not localhost/127.0.0.1/undefined, reuse it
            if [[ "$val" != "http://127.0.0.1" && "$val" != "http://localhost" && "$val" != *"undefined"* && "$val" != "" ]]; then
                # extract scheme and host
                DETECT_SCHEME="${val%%://*}"
                # remove scheme prefix if present
                hostpart="${val#*://}"
                # strip possible path
                DETECT_HOST="${hostpart%%/*}"
            fi
        fi
    fi

    # If still default 127.0.0.1, try nginx server_name
    if [ "$DETECT_HOST" = "127.0.0.1" ]; then
        for f in /etc/nginx/sites-enabled/chat /etc/nginx/sites-available/chat; do
            if [ -f "$f" ]; then
                sname=$(grep -E '^\s*server_name' "$f" | awk '{for(i=2;i<=NF;i++) if($i!~";") print $i}' | head -n1 || true)
                if [ -n "$sname" ]; then
                    DETECT_HOST="$sname"
                    break
                fi
            fi
        done
    fi

    # If host found, decide scheme based on cert presence
    if [ "$DETECT_HOST" != "127.0.0.1" ] && [ -d "/etc/letsencrypt/live/$DETECT_HOST" ]; then
        DETECT_SCHEME="https"
    fi

    # If still 127.0.0.1, try to use primary IP of host
    if [ "$DETECT_HOST" = "127.0.0.1" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
        if [ -n "$ip" ]; then
            DETECT_HOST="$ip"
            DETECT_SCHEME="http"
        fi
    fi

    echo "Detected frontend backend URL: $DETECT_SCHEME://$DETECT_HOST"

    
# ensure nginx site updated during update (if non-local)
if [ -n "$DETECT_HOST" ] && [ "$DETECT_HOST" != "127.0.0.1" ] && [ "$DETECT_HOST" != "localhost" ]; then
    # If certificate files already exist for this host, regenerate HTTPS config using existing certs (no certbot)
    if [ -f "/etc/letsencrypt/live/$DETECT_HOST/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DETECT_HOST/privkey.pem" ]; then
        log "Certificados existentes detectados para $DETECT_HOST — aplicando configuração HTTPS sem certbot"
        nginx_config_production_with_existing_ssl "$DETECT_HOST" || warn "Falha ao aplicar config HTTPS existente durante update"
    else
        log "Nenhum certificado existente detectado para $DETECT_HOST — aplicando configuração HTTP básica"
        nginx_config_basic "$DETECT_HOST" || warn "nginx_config_basic failed during update"
    fi

    restart_services
else
    restart_services
    log "Skipping nginx_config_basic during update (detected: $DETECT_HOST)"
fi


    # write frontend env using detected values
    write_frontend_env "$DETECT_SCHEME" "$DETECT_HOST"

    setup_backend
    setup_frontend_build
    restart_services
    log "Atualização concluída. Frontend configured to $DETECT_SCHEME://$DETECT_HOST"
}

show_menu() {
    echo ""; echo "======================================="; echo "     INSTALADOR FINANCEIRO - v5.1   "; echo "======================================="
    echo "1) Instalar LOCAL"; echo "2) Instalar PRODUÇÃO"; echo "3) Atualizar"; echo "0) Sair"
    read -p "Opção: " OP
    case "$OP" in
        1) mode_local ;; 2) mode_production ;; 3) mode_update ;; 0) exit 0 ;; *)
            echo "Opção inválida"; sleep 1; show_menu ;;
    esac
}

show_menu
