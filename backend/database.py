import os
from datetime import datetime, timezone
from passlib.context import CryptContext
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional, List
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

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

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
                "is_active": True,
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
                'is_active': user.get('is_active', True),
                'created_at': user.get('created_at')
            }
        return None
        
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

# Agent CRUD operations
async def get_agents(page: int = 1, per_page: int = 10, search: str = None) -> dict:
    """Get all agents with pagination"""
    try:
        query = {"role": "agent"}
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"username": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.users.count_documents(query)
        skip = (page - 1) * per_page
        
        cursor = db.users.find(query).skip(skip).limit(per_page).sort("created_at", -1)
        agents = []
        
        async for user in cursor:
            agents.append({
                'id': user.get('id'),
                'name': user.get('name'),
                'username': user.get('username'),
                'email': user.get('email'),
                'is_active': user.get('is_active', True),
                'created_at': user.get('created_at')
            })
        
        return {
            'agents': agents,
            'total': total,
            'page': page,
            'per_page': per_page
        }
        
    except Exception as e:
        logger.error(f"Error getting agents: {e}")
        raise

async def create_agent(agent_data: dict) -> dict:
    """Create a new agent"""
    try:
        # Check if username or email already exists
        existing = await db.users.find_one({
            "$or": [
                {"username": agent_data['username']},
                {"email": agent_data['email']}
            ]
        })
        
        if existing:
            if existing.get('username') == agent_data['username']:
                raise ValueError("Nome de usuário já existe")
            if existing.get('email') == agent_data['email']:
                raise ValueError("E-mail já existe")
        
        new_agent = {
            "id": str(uuid.uuid4()),
            "name": agent_data['name'],
            "username": agent_data['username'],
            "email": agent_data['email'],
            "password_hash": pwd_context.hash(agent_data['password']),
            "role": "agent",
            "is_active": agent_data.get('is_active', True),
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(new_agent)
        
        return {
            'id': new_agent['id'],
            'name': new_agent['name'],
            'username': new_agent['username'],
            'email': new_agent['email'],
            'is_active': new_agent['is_active'],
            'created_at': new_agent['created_at']
        }
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise

async def update_agent(agent_id: str, agent_data: dict) -> dict:
    """Update an agent"""
    try:
        # Check if agent exists
        agent = await db.users.find_one({"id": agent_id, "role": "agent"})
        if not agent:
            raise ValueError("Agente não encontrado")
        
        update_data = {}
        
        if agent_data.get('name'):
            update_data['name'] = agent_data['name']
        
        if agent_data.get('username'):
            # Check if new username is taken
            existing = await db.users.find_one({
                "username": agent_data['username'],
                "id": {"$ne": agent_id}
            })
            if existing:
                raise ValueError("Nome de usuário já existe")
            update_data['username'] = agent_data['username']
        
        if agent_data.get('email'):
            # Check if new email is taken
            existing = await db.users.find_one({
                "email": agent_data['email'],
                "id": {"$ne": agent_id}
            })
            if existing:
                raise ValueError("E-mail já existe")
            update_data['email'] = agent_data['email']
        
        if agent_data.get('password'):
            update_data['password_hash'] = pwd_context.hash(agent_data['password'])
        
        if 'is_active' in agent_data and agent_data['is_active'] is not None:
            update_data['is_active'] = agent_data['is_active']
        
        if update_data:
            await db.users.update_one(
                {"id": agent_id},
                {"$set": update_data}
            )
        
        # Get updated agent
        updated = await db.users.find_one({"id": agent_id})
        
        return {
            'id': updated.get('id'),
            'name': updated.get('name'),
            'username': updated.get('username'),
            'email': updated.get('email'),
            'is_active': updated.get('is_active', True),
            'created_at': updated.get('created_at')
        }
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating agent: {e}")
        raise

async def delete_agent(agent_id: str) -> bool:
    """Delete an agent"""
    try:
        result = await db.users.delete_one({"id": agent_id, "role": "agent"})
        return result.deleted_count > 0
        
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        raise

async def delete_agents_bulk(agent_ids: List[str]) -> int:
    """Delete multiple agents"""
    try:
        result = await db.users.delete_many({
            "id": {"$in": agent_ids},
            "role": "agent"
        })
        return result.deleted_count
        
    except Exception as e:
        logger.error(f"Error deleting agents in bulk: {e}")
        raise
