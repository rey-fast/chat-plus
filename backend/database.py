import psycopg2
import os
from datetime import datetime, timezone
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db_connection():
    """Create PostgreSQL connection"""
    conn = psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        database=os.environ.get('DB_NAME', 'chatplus_db'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD', 'postgres'),
        port=os.environ.get('DB_PORT', '5432')
    )
    return conn

def init_database():
    """Initialize database schema and create admin user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create users table
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
        
        # Check if admin exists
        cursor.execute("SELECT id FROM users WHERE username = %s", ('admin',))
        if cursor.fetchone() is None:
            # Create admin user
            password_hash = pwd_context.hash('admin123')
            cursor.execute("""
                INSERT INTO users (name, username, email, password_hash, role)
                VALUES (%s, %s, %s, %s, %s)
            """, ('Administrador', 'admin', 'admin@exemplo.com.br', password_hash, 'admin'))
            logger.info("Admin user created successfully")
        
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

def get_user_by_login(login: str):
    """Get user by email or username"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, username, email, password_hash, role, created_at
            FROM users
            WHERE email = %s OR username = %s
        """, (login, login))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            return {
                'id': result[0],
                'name': result[1],
                'username': result[2],
                'email': result[3],
                'password_hash': result[4],
                'role': result[5],
                'created_at': result[6]
            }
        return None
        
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)