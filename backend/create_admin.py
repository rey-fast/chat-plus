#!/usr/bin/env python3
"""
Script para criar usuário administrador inicial
Uso: python create_admin.py
"""

import asyncio
import os
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

# Carregar variáveis de ambiente
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuração de hash de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Dados do usuário admin padrão
ADMIN_DATA = {
    'name': 'Administrador',
    'username': 'admin',
    'email': 'admin@exemplo.com.br',
    'password': 'admin123',
    'role': 'admin'
}

async def get_db_connection():
    """Cria conexão com MongoDB"""
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'chatplus_db')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Test connection
        await client.admin.command('ping')
        
        return client, db
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco de dados: {e}")
        return None, None

async def create_indexes(db):
    """Cria índices na collection users"""
    try:
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)
        print("✓ Índices criados/verificados com sucesso")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar índices: {e}")
        return False

async def check_admin_exists(db):
    """Verifica se o usuário admin já existe"""
    try:
        result = await db.users.find_one({
            "$or": [
                {"username": ADMIN_DATA['username']},
                {"email": ADMIN_DATA['email']}
            ]
        })
        return result
    except Exception as e:
        print(f"❌ Erro ao verificar admin existente: {e}")
        return None

async def create_admin_user(db):
    """Cria o usuário administrador"""
    try:
        # Hash da senha
        password_hash = pwd_context.hash(ADMIN_DATA['password'])
        
        # Dados do admin
        admin_doc = {
            "id": str(uuid.uuid4()),
            "name": ADMIN_DATA['name'],
            "username": ADMIN_DATA['username'],
            "email": ADMIN_DATA['email'],
            "password_hash": password_hash,
            "role": ADMIN_DATA['role'],
            "created_at": datetime.now(timezone.utc)
        }
        
        # Inserir usuário
        result = await db.users.insert_one(admin_doc)
        
        return admin_doc['id']
    except Exception as e:
        print(f"❌ Erro ao criar usuário admin: {e}")
        return None

async def main():
    """Função principal"""
    print("\n" + "="*60)
    print("    CRIAÇÃO DE USUÁRIO ADMINISTRADOR INICIAL")
    print("="*60 + "\n")
    
    # Conectar ao banco
    print("⏳ Conectando ao MongoDB...")
    client, db = await get_db_connection()
    
    if not db:
        print("\n❌ Falha na conexão. Verifique as configurações em .env")
        print("\nVariáveis necessárias:")
        print("  - MONGO_URL")
        print("  - DB_NAME")
        return
    
    print("✓ Conexão estabelecida com sucesso\n")
    
    try:
        # Criar índices
        print("⏳ Verificando estrutura do banco...")
        if not await create_indexes(db):
            return
        
        print()
        
        # Verificar se admin já existe
        print("⏳ Verificando usuário admin existente...")
        existing_admin = await check_admin_exists(db)
        
        if existing_admin:
            print(f"⚠️  Usuário admin já existe!")
            print(f"   ID: {existing_admin.get('id')}")
            print(f"   Username: {existing_admin.get('username')}")
            print(f"   Email: {existing_admin.get('email')}")
            print("\n💡 Se deseja recriar, delete o usuário existente primeiro.")
            return
        
        print("✓ Nenhum admin encontrado\n")
        
        # Criar novo admin
        print("⏳ Criando usuário administrador...")
        admin_id = await create_admin_user(db)
        
        if admin_id:
            print("✓ Usuário administrador criado com sucesso!\n")
            print("="*60)
            print("   CREDENCIAIS DE ACESSO")
            print("="*60)
            print(f"   Nome:     {ADMIN_DATA['name']}")
            print(f"   Username: {ADMIN_DATA['username']}")
            print(f"   Email:    {ADMIN_DATA['email']}")
            print(f"   Senha:    {ADMIN_DATA['password']}")
            print(f"   Função:   {ADMIN_DATA['role']}")
            print("="*60)
            print("\n⚠️  IMPORTANTE: Altere a senha padrão após o primeiro login!\n")
        else:
            print("\n❌ Falha ao criar usuário administrador")
        
    except Exception as e:
        print(f"\n❌ Erro durante execução: {e}")
    
    finally:
        client.close()
        print("✓ Conexão com banco de dados encerrada\n")

if __name__ == "__main__":
    asyncio.run(main())
