#!/usr/bin/env python3
"""
Script para criar usuário administrador inicial
Uso: python create_admin.py
"""

import psycopg2
import os
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path

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

def get_db_connection():
    """Cria conexão com PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            database=os.environ.get('DB_NAME', 'chat_plus'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', 'postgres'),
            port=os.environ.get('DB_PORT', '5432')
        )
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco de dados: {e}")
        return None

def create_users_table(cursor):
    """Cria a tabela users se não existir"""
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✓ Tabela 'users' verificada/criada com sucesso")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar tabela: {e}")
        return False

def check_admin_exists(cursor):
    """Verifica se o usuário admin já existe"""
    try:
        cursor.execute(
            "SELECT id, username, email FROM users WHERE username = %s OR email = %s",
            (ADMIN_DATA['username'], ADMIN_DATA['email'])
        )
        result = cursor.fetchone()
        return result
    except Exception as e:
        print(f"❌ Erro ao verificar admin existente: {e}")
        return None

def create_admin_user(cursor):
    """Cria o usuário administrador"""
    try:
        # Hash da senha
        password_hash = pwd_context.hash(ADMIN_DATA['password'])
        
        # Inserir usuário
        cursor.execute("""
            INSERT INTO users (name, username, email, password_hash, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            ADMIN_DATA['name'],
            ADMIN_DATA['username'],
            ADMIN_DATA['email'],
            password_hash,
            ADMIN_DATA['role']
        ))
        
        admin_id = cursor.fetchone()[0]
        return admin_id
    except Exception as e:
        print(f"❌ Erro ao criar usuário admin: {e}")
        return None

def main():
    """Função principal"""
    print("\n" + "="*60)
    print("    CRIAÇÃO DE USUÁRIO ADMINISTRADOR INICIAL")
    print("="*60 + "\n")
    
    # Conectar ao banco
    print("⏳ Conectando ao banco de dados...")
    conn = get_db_connection()
    
    if not conn:
        print("\n❌ Falha na conexão. Verifique as configurações em .env")
        print("\nVariáveis necessárias:")
        print("  - DB_HOST")
        print("  - DB_NAME")
        print("  - DB_USER")
        print("  - DB_PASSWORD")
        print("  - DB_PORT")
        return
    
    print("✓ Conexão estabelecida com sucesso\n")
    
    try:
        cursor = conn.cursor()
        
        # Criar tabela se não existir
        print("⏳ Verificando estrutura do banco...")
        if not create_users_table(cursor):
            return
        
        print()
        
        # Verificar se admin já existe
        print("⏳ Verificando usuário admin existente...")
        existing_admin = check_admin_exists(cursor)
        
        if existing_admin:
            print(f"⚠️  Usuário admin já existe!")
            print(f"   ID: {existing_admin[0]}")
            print(f"   Username: {existing_admin[1]}")
            print(f"   Email: {existing_admin[2]}")
            print("\n💡 Se deseja recriar, delete o usuário existente primeiro.")
            return
        
        print("✓ Nenhum admin encontrado\n")
        
        # Criar novo admin
        print("⏳ Criando usuário administrador...")
        admin_id = create_admin_user(cursor)
        
        if admin_id:
            conn.commit()
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
            conn.rollback()
            print("\n❌ Falha ao criar usuário administrador")
        
    except Exception as e:
        print(f"\n❌ Erro durante execução: {e}")
        conn.rollback()
    
    finally:
        cursor.close()
        conn.close()
        print("✓ Conexão com banco de dados encerrada\n")

if __name__ == "__main__":
    main()
