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


# Admin CRUD operations
async def get_admins(page: int = 1, per_page: int = 10, search: str = None) -> dict:
    """Get all admins with pagination"""
    try:
        query = {"role": "admin"}
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"username": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.users.count_documents(query)
        skip = (page - 1) * per_page
        
        cursor = db.users.find(query).skip(skip).limit(per_page).sort("created_at", -1)
        admins = []
        
        async for user in cursor:
            admins.append({
                'id': user.get('id'),
                'name': user.get('name'),
                'username': user.get('username'),
                'email': user.get('email'),
                'is_active': user.get('is_active', True),
                'created_at': user.get('created_at')
            })
        
        return {
            'admins': admins,
            'total': total,
            'page': page,
            'per_page': per_page
        }
        
    except Exception as e:
        logger.error(f"Error getting admins: {e}")
        raise

async def create_admin(admin_data: dict) -> dict:
    """Create a new admin"""
    try:
        # Check if username or email already exists
        existing = await db.users.find_one({
            "$or": [
                {"username": admin_data['username']},
                {"email": admin_data['email']}
            ]
        })
        
        if existing:
            if existing.get('username') == admin_data['username']:
                raise ValueError("Nome de usuário já existe")
            if existing.get('email') == admin_data['email']:
                raise ValueError("E-mail já existe")
        
        new_admin = {
            "id": str(uuid.uuid4()),
            "name": admin_data['name'],
            "username": admin_data['username'],
            "email": admin_data['email'],
            "password_hash": pwd_context.hash(admin_data['password']),
            "role": "admin",
            "is_active": admin_data.get('is_active', True),
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(new_admin)
        
        return {
            'id': new_admin['id'],
            'name': new_admin['name'],
            'username': new_admin['username'],
            'email': new_admin['email'],
            'is_active': new_admin['is_active'],
            'created_at': new_admin['created_at']
        }
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error creating admin: {e}")
        raise

async def update_admin(admin_id: str, admin_data: dict, current_user_id: str = None) -> dict:
    """Update an admin"""
    try:
        # Check if admin exists
        admin = await db.users.find_one({"id": admin_id, "role": "admin"})
        if not admin:
            raise ValueError("Administrador não encontrado")
        
        # Prevent self-deactivation
        if current_user_id and admin_id == current_user_id:
            if 'is_active' in admin_data and admin_data['is_active'] is False:
                raise ValueError("Você não pode desativar seu próprio usuário")
        
        update_data = {}
        
        if admin_data.get('name'):
            update_data['name'] = admin_data['name']
        
        if admin_data.get('username'):
            # Check if new username is taken
            existing = await db.users.find_one({
                "username": admin_data['username'],
                "id": {"$ne": admin_id}
            })
            if existing:
                raise ValueError("Nome de usuário já existe")
            update_data['username'] = admin_data['username']
        
        if admin_data.get('email'):
            # Check if new email is taken
            existing = await db.users.find_one({
                "email": admin_data['email'],
                "id": {"$ne": admin_id}
            })
            if existing:
                raise ValueError("E-mail já existe")
            update_data['email'] = admin_data['email']
        
        if admin_data.get('password'):
            update_data['password_hash'] = pwd_context.hash(admin_data['password'])
        
        if 'is_active' in admin_data and admin_data['is_active'] is not None:
            update_data['is_active'] = admin_data['is_active']
        
        if update_data:
            await db.users.update_one(
                {"id": admin_id},
                {"$set": update_data}
            )
        
        # Get updated admin
        updated = await db.users.find_one({"id": admin_id})
        
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
        logger.error(f"Error updating admin: {e}")
        raise

async def delete_admin(admin_id: str, current_user_id: str = None) -> bool:
    """Delete an admin"""
    try:
        # Prevent self-deletion
        if current_user_id and admin_id == current_user_id:
            raise ValueError("Você não pode excluir seu próprio usuário")
        
        result = await db.users.delete_one({"id": admin_id, "role": "admin"})
        return result.deleted_count > 0
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting admin: {e}")
        raise

async def delete_admins_bulk(admin_ids: List[str], current_user_id: str = None) -> int:
    """Delete multiple admins"""
    try:
        # Remove current user from the list if present
        if current_user_id and current_user_id in admin_ids:
            admin_ids = [aid for aid in admin_ids if aid != current_user_id]
        
        if not admin_ids:
            return 0
        
        result = await db.users.delete_many({
            "id": {"$in": admin_ids},
            "role": "admin"
        })
        return result.deleted_count
        
    except Exception as e:
        logger.error(f"Error deleting admins in bulk: {e}")
        raise


# Channel CRUD operations
async def get_channels(page: int = 1, per_page: int = 10, search: str = None) -> dict:
    """Get all channels with pagination"""
    try:
        query = {}
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"type": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.channels.count_documents(query)
        skip = (page - 1) * per_page
        
        cursor = db.channels.find(query).skip(skip).limit(per_page).sort("created_at", -1)
        channels = []
        
        async for channel in cursor:
            channels.append({
                'id': channel.get('id'),
                'name': channel.get('name'),
                'type': channel.get('type'),
                'status': channel.get('status', 'connected'),
                'is_active': channel.get('is_active', True),
                'flow_id': channel.get('flow_id'),
                'flow_name': channel.get('flow_name', 'Padrão'),
                'chat_link': channel.get('chat_link'),
                'created_at': channel.get('created_at')
            })
        
        return {
            'channels': channels,
            'total': total,
            'page': page,
            'per_page': per_page
        }
        
    except Exception as e:
        logger.error(f"Error getting channels: {e}")
        raise

async def get_channel_by_id(channel_id: str) -> dict:
    """Get a single channel by ID"""
    try:
        channel = await db.channels.find_one({"id": channel_id})
        if channel:
            return {
                'id': channel.get('id'),
                'name': channel.get('name'),
                'type': channel.get('type'),
                'status': channel.get('status', 'connected'),
                'is_active': channel.get('is_active', True),
                'flow_id': channel.get('flow_id'),
                'flow_name': channel.get('flow_name', 'Padrão'),
                'chat_link': channel.get('chat_link'),
                'created_at': channel.get('created_at')
            }
        return None
    except Exception as e:
        logger.error(f"Error getting channel: {e}")
        raise

async def create_channel(channel_data: dict, base_url: str = "") -> dict:
    """Create a new channel"""
    try:
        channel_id = str(uuid.uuid4())
        
        # Generate chat link for site type channels
        chat_link = None
        if channel_data['type'] == 'site':
            chat_link = f"{base_url}/chat/{channel_id}"
        
        new_channel = {
            "id": channel_id,
            "name": channel_data['name'],
            "type": channel_data['type'],
            "status": "connected",
            "is_active": True,
            "flow_id": None,
            "flow_name": "Padrão",
            "chat_link": chat_link,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.channels.insert_one(new_channel)
        
        return {
            'id': new_channel['id'],
            'name': new_channel['name'],
            'type': new_channel['type'],
            'status': new_channel['status'],
            'is_active': new_channel['is_active'],
            'flow_id': new_channel['flow_id'],
            'flow_name': new_channel['flow_name'],
            'chat_link': new_channel['chat_link'],
            'created_at': new_channel['created_at']
        }
        
    except Exception as e:
        logger.error(f"Error creating channel: {e}")
        raise

async def update_channel(channel_id: str, channel_data: dict) -> dict:
    """Update a channel"""
    try:
        # Check if channel exists
        channel = await db.channels.find_one({"id": channel_id})
        if not channel:
            raise ValueError("Canal não encontrado")
        
        update_data = {}
        
        if channel_data.get('name'):
            update_data['name'] = channel_data['name']
        
        if 'is_active' in channel_data and channel_data['is_active'] is not None:
            update_data['is_active'] = channel_data['is_active']
        
        if 'flow_id' in channel_data:
            update_data['flow_id'] = channel_data['flow_id']
            # TODO: Get flow name from flows collection when implemented
            update_data['flow_name'] = 'Padrão' if not channel_data['flow_id'] else 'Personalizado'
        
        if update_data:
            await db.channels.update_one(
                {"id": channel_id},
                {"$set": update_data}
            )
        
        # Get updated channel
        updated = await db.channels.find_one({"id": channel_id})
        
        return {
            'id': updated.get('id'),
            'name': updated.get('name'),
            'type': updated.get('type'),
            'status': updated.get('status', 'connected'),
            'is_active': updated.get('is_active', True),
            'flow_id': updated.get('flow_id'),
            'flow_name': updated.get('flow_name', 'Padrão'),
            'chat_link': updated.get('chat_link'),
            'created_at': updated.get('created_at')
        }
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating channel: {e}")
        raise

async def delete_channel(channel_id: str) -> bool:
    """Delete a channel"""
    try:
        result = await db.channels.delete_one({"id": channel_id})
        return result.deleted_count > 0
        
    except Exception as e:
        logger.error(f"Error deleting channel: {e}")
        raise

async def delete_channels_bulk(channel_ids: List[str]) -> int:
    """Delete multiple channels"""
    try:
        result = await db.channels.delete_many({
            "id": {"$in": channel_ids}
        })
        return result.deleted_count
        
    except Exception as e:
        logger.error(f"Error deleting channels in bulk: {e}")
        raise
