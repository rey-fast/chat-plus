# 📑 Índice de Arquivos - Sistema de Atendimento Empresarial

## 🎯 Visão Geral

Este documento lista todos os scripts e arquivos de documentação disponíveis no sistema.

---

## 🔧 Scripts de Gerenciamento

### 1. `install.sh` ⭐ **PRINCIPAL**
**Instalação completa do zero**

```bash
sudo bash install.sh
```

**O que faz:**
- ✅ Atualiza o sistema Ubuntu 24.04.3 LTS
- ✅ Instala MongoDB 7.0+
- ✅ Instala Python 3.11+ e cria ambiente virtual
- ✅ Instala Node.js 18+ e Yarn
- ✅ Instala todas as dependências (backend + frontend)
- ✅ Configura variáveis de ambiente
- ✅ Configura Supervisor para gerenciar serviços
- ✅ **Cria usuário administrador automaticamente**
- ✅ Inicia todos os serviços automaticamente

**Tempo estimado:** 10-20 minutos

---

### 2. `check-system.sh`
**Verificação completa do sistema**

```bash
bash check-system.sh
```

**O que verifica:**
- ✓ Sistema operacional e versão
- ✓ Dependências instaladas (Python, Node, MongoDB, etc.)
- ✓ Status de todos os serviços
- ✓ Portas em uso (3000, 8001, 27017)
- ✓ Estrutura de diretórios
- ✓ Conectividade dos serviços
- ✓ Recursos do sistema (memória, disco)
- ✓ Logs recentes

**Use quando:**
- Quiser verificar se tudo está funcionando
- Diagnosticar problemas
- Após reiniciar o servidor

---

### 3. `backup.sh`
**Backup completo do sistema**

```bash
# Backup no diretório padrão
sudo bash backup.sh

# Backup em local específico
sudo bash backup.sh /mnt/backups
```

**O que inclui:**
- 💾 Todo o código fonte (/app)
- 💾 Banco de dados MongoDB (dump completo)
- 💾 Configurações do Supervisor
- 💾 Lista de pacotes Python instalados
- 💾 Logs do sistema
- 💾 Informações do sistema
- 💾 Script de restauração automática

**Resultado:**
- Arquivo `.tar.gz` comprimido
- Script `restore.sh` para restauração fácil

---

### 4. `uninstall.sh`
**Desinstalação do sistema**

```bash
sudo bash uninstall.sh
```

**Remove (com confirmação):**
- ❌ Serviços do Supervisor
- ❌ MongoDB e dados (opcional)
- ❌ Node.js e Yarn (opcional)
- ❌ Ambiente virtual Python (opcional)
- ❌ Diretório /app (opcional)
- ❌ Supervisor e Nginx (opcional)

**⚠️ ATENÇÃO:** Dados podem ser permanentemente perdidos!

---

### 5. `update.sh`
**Atualização de componentes**

```bash
# Atualizar tudo
sudo bash update.sh all

# Atualizar apenas backend
sudo bash update.sh backend

# Atualizar apenas frontend
sudo bash update.sh frontend

# Atualizar apenas sistema operacional
sudo bash update.sh system

# Verificar atualizações disponíveis
sudo bash update.sh check
```

**Atualiza:**
- 🔄 Pacotes do sistema operacional
- 🔄 Dependências Python do backend
- 🔄 Dependências Node.js do frontend
- 🔄 Reinicia serviços automaticamente

---

## 📚 Documentação

### 1. `README.md` ⭐
**Documentação principal do projeto**

Contém:
- 📖 Visão geral do projeto
- 🏗️ Arquitetura do sistema
- 🚀 Início rápido
- 📋 Requisitos do sistema
- 🔧 Comandos úteis
- 🐛 Solução de problemas
- 🔒 Configuração de segurança

**Leia primeiro:** Este arquivo!

---

### 2. `INSTALACAO.md`
**Guia completo de instalação**

Contém:
- 📦 Requisitos detalhados do sistema
- 🚀 Passo a passo da instalação
- 🔧 Configuração pós-instalação
- 🌐 Como acessar o sistema
- 📋 Comandos de gerenciamento
- 🐛 Solução detalhada de problemas
- 🔒 Checklist de segurança

**Leia:** Antes de fazer a instalação

---

### 3. `GUIA-RAPIDO.md`
**Referência rápida de comandos**

Contém:
- ⚡ Comandos mais usados
- 🔧 Como editar configurações
- 📦 Instalar novas dependências
- 🔍 Diagnóstico de problemas
- 🌐 URLs de acesso
- 💾 Backup e restauração
- 🆘 Comandos de emergência

**Use:** Para consulta rápida diária

---

### 4. `INDEX.md` (este arquivo)
**Índice de todos os arquivos**

Navegue facilmente por todos os recursos disponíveis.

---

## 🌊 Fluxo de Trabalho Recomendado

### Instalação Inicial
```
1. README.md (visão geral)
2. INSTALACAO.md (instruções detalhadas)
3. sudo bash install.sh (executar instalação)
4. bash check-system.sh (verificar)
```

### Uso Diário
```
1. GUIA-RAPIDO.md (referência de comandos)
2. bash check-system.sh (verificar status)
3. sudo supervisorctl status (gerenciar serviços)
```

### Manutenção
```
1. sudo bash backup.sh (backup regular)
2. sudo bash update.sh (atualizações)
3. bash check-system.sh (verificação)
```

### Solução de Problemas
```
1. bash check-system.sh (diagnóstico)
2. GUIA-RAPIDO.md (comandos de diagnóstico)
3. INSTALACAO.md (solução de problemas)
```

---

## 📂 Estrutura de Diretórios

```
/app/
├── 📄 Scripts (.sh)
│   ├── install.sh        → Instalação completa
│   ├── check-system.sh   → Verificação do sistema
│   ├── backup.sh         → Backup completo
│   ├── uninstall.sh      → Desinstalação
│   └── update.sh         → Atualizações
│
├── 📚 Documentação (.md)
│   ├── README.md         → Documentação principal
│   ├── INSTALACAO.md     → Guia de instalação
│   ├── GUIA-RAPIDO.md    → Referência rápida
│   └── INDEX.md          → Este arquivo
│
├── 🔧 Backend
│   ├── server.py         → Servidor FastAPI
│   ├── database.py       → Conexão MongoDB
│   ├── models.py         → Modelos de dados
│   ├── auth.py           → Autenticação JWT
│   ├── requirements.txt  → Dependências Python
│   └── .env              → Variáveis de ambiente
│
└── 🎨 Frontend
    ├── src/              → Código fonte React
    ├── public/           → Arquivos públicos
    ├── package.json      → Dependências Node
    └── .env              → Variáveis de ambiente
```

---

## 🎯 Qual Script Usar?

| Situação | Script | Comando |
|----------|--------|--------|
| Primeira vez instalando | `install.sh` | `sudo bash install.sh` |
| Verificar se está tudo ok | `check-system.sh` | `bash check-system.sh` |
| Fazer backup antes de mudanças | `backup.sh` | `sudo bash backup.sh` |
| Atualizar dependências | `update.sh` | `sudo bash update.sh` |
| Remover completamente | `uninstall.sh` | `sudo bash uninstall.sh` |

---

## 🆘 Comandos de Emergência Rápidos

```bash
# Reiniciar tudo
sudo supervisorctl restart all

# Ver status
sudo supervisorctl status

# Ver logs de erro do backend
sudo tail -f /var/log/supervisor/backend.err.log

# Ver logs de erro do frontend
sudo tail -f /var/log/supervisor/frontend.err.log

# Verificar sistema completo
bash /app/check-system.sh

# MongoDB status
sudo systemctl status mongod
```

---

## 📞 Suporte

**Problemas?**
1. Execute `bash check-system.sh` para diagnóstico
2. Consulte `GUIA-RAPIDO.md` para comandos úteis
3. Verifique `INSTALACAO.md` para solução de problemas
4. Veja logs em `/var/log/supervisor/`

---

## 🔄 Histórico de Versões

| Versão | Data | Descrição |
|--------|------|----------|
| 1.0 | 2025 | Versão inicial com MongoDB |

---

**Dica:** Marque este arquivo nos favoritos para acesso rápido a todos os recursos!
