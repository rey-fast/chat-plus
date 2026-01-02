import os
from datetime import datetime, timezone
from passlib.context import CryptContext
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import uuid

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB connection
client: Optional[AsyncIOMotorClient] = None
db = None

async def connect_to_mongodb():
    """Connect to MongoDB"""
    global client, db
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'chat_db')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Test connection
        await client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {db_name}")
        
        # Initialize database (create indexes and admin user)
        await init_database()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongodb_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")

def get_database():
    """Get database instance"""
    return db

async def init_database():
    """Initialize database indexes and create admin user"""
    try:
        # Create indexes for users collection
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)
        
        # Check if admin exists
        admin = await db.users.find_one({"username": "admin"})
        if admin is None:
            # Create admin user
            password_hash = pwd_context.hash('admin123')
            admin_user = {
                "id": str(uuid.uuid4()),
                "name": "Administrador",
                "username": "admin",
                "email": "admin@exemplo.com.br",
                "password_hash": password_hash,
                "role": "admin",
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(admin_user)
            logger.info("Admin user created successfully")
        
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

async def get_user_by_login(login: str):
    """Get user by email or username"""
    try:
        user = await db.users.find_one({
            "$or": [
                {"email": login},
                {"username": login}
            ]
        })
        
        if user:
            return {
                'id': user.get('id'),
                'name': user.get('name'),
                'username': user.get('username'),
                'email': user.get('email'),
                'password_hash': user.get('password_hash'),
                'role': user.get('role'),
                'created_at': user.get('created_at')
            }
        return None
        
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)
