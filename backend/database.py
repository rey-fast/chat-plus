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


# Flow CRUD operations
async def get_flows(page: int = 1, per_page: int = 10, search: str = None) -> dict:
    """Get all flows with pagination"""
    try:
        query = {}
        
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        
        total = await db.flows.count_documents(query)
        skip = (page - 1) * per_page
        
        cursor = db.flows.find(query).skip(skip).limit(per_page).sort("created_at", -1)
        flows = []
        
        async for flow in cursor:
            # Check if flow is in use by any channel
            channel = await db.channels.find_one({"flow_id": flow.get('id')})
            is_in_use = channel is not None
            
            flows.append({
                'id': flow.get('id'),
                'name': flow.get('name'),
                'is_in_use': is_in_use,
                'channel_id': channel.get('id') if channel else None,
                'channel_name': channel.get('name') if channel else None,
                'nodes': flow.get('nodes', []),
                'edges': flow.get('edges', []),
                'created_at': flow.get('created_at'),
                'updated_at': flow.get('updated_at', flow.get('created_at'))
            })
        
        return {
            'flows': flows,
            'total': total,
            'page': page,
            'per_page': per_page
        }
        
    except Exception as e:
        logger.error(f"Error getting flows: {e}")
        raise

async def get_flow_by_id(flow_id: str) -> dict:
    """Get a single flow by ID"""
    try:
        flow = await db.flows.find_one({"id": flow_id})
        if flow:
            # Check if flow is in use by any channel
            channel = await db.channels.find_one({"flow_id": flow_id})
            is_in_use = channel is not None
            
            return {
                'id': flow.get('id'),
                'name': flow.get('name'),
                'is_in_use': is_in_use,
                'channel_id': channel.get('id') if channel else None,
                'channel_name': channel.get('name') if channel else None,
                'nodes': flow.get('nodes', []),
                'edges': flow.get('edges', []),
                'created_at': flow.get('created_at'),
                'updated_at': flow.get('updated_at', flow.get('created_at'))
            }
        return None
    except Exception as e:
        logger.error(f"Error getting flow: {e}")
        raise

async def create_flow(flow_data: dict) -> dict:
    """Create a new flow"""
    try:
        now = datetime.now(timezone.utc)
        
        new_flow = {
            "id": str(uuid.uuid4()),
            "name": flow_data['name'],
            "nodes": flow_data.get('nodes', []),
            "edges": flow_data.get('edges', []),
            "created_at": now,
            "updated_at": now
        }
        
        await db.flows.insert_one(new_flow)
        
        return {
            'id': new_flow['id'],
            'name': new_flow['name'],
            'is_in_use': False,
            'channel_id': None,
            'channel_name': None,
            'nodes': new_flow['nodes'],
            'edges': new_flow['edges'],
            'created_at': new_flow['created_at'],
            'updated_at': new_flow['updated_at']
        }
        
    except Exception as e:
        logger.error(f"Error creating flow: {e}")
        raise

async def update_flow(flow_id: str, flow_data: dict) -> dict:
    """Update a flow"""
    try:
        # Check if flow exists
        flow = await db.flows.find_one({"id": flow_id})
        if not flow:
            raise ValueError("Fluxo não encontrado")
        
        update_data = {
            "updated_at": datetime.now(timezone.utc)
        }
        
        if flow_data.get('name'):
            update_data['name'] = flow_data['name']
        
        if 'nodes' in flow_data:
            update_data['nodes'] = flow_data['nodes']
        
        if 'edges' in flow_data:
            update_data['edges'] = flow_data['edges']
        
        await db.flows.update_one(
            {"id": flow_id},
            {"$set": update_data}
        )
        
        # Get updated flow
        return await get_flow_by_id(flow_id)
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating flow: {e}")
        raise

async def delete_flow(flow_id: str) -> bool:
    """Delete a flow"""
    try:
        # Check if flow is in use
        channel = await db.channels.find_one({"flow_id": flow_id})
        if channel:
            raise ValueError(f"Fluxo está em uso pelo canal '{channel.get('name')}'. Remova a associação primeiro.")
        
        result = await db.flows.delete_one({"id": flow_id})
        return result.deleted_count > 0
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting flow: {e}")
        raise

async def delete_flows_bulk(flow_ids: List[str]) -> dict:
    """Delete multiple flows"""
    try:
        deleted_count = 0
        skipped = []
        
        for flow_id in flow_ids:
            # Check if flow is in use
            channel = await db.channels.find_one({"flow_id": flow_id})
            if channel:
                skipped.append({
                    'id': flow_id,
                    'reason': f"Em uso pelo canal '{channel.get('name')}'"
                })
                continue
            
            result = await db.flows.delete_one({"id": flow_id})
            if result.deleted_count > 0:
                deleted_count += 1
        
        return {
            'deleted_count': deleted_count,
            'skipped': skipped
        }
        
    except Exception as e:
        logger.error(f"Error deleting flows in bulk: {e}")
        raise

async def duplicate_flow(flow_id: str) -> dict:
    """Duplicate a flow"""
    try:
        # Get original flow
        original = await db.flows.find_one({"id": flow_id})
        if not original:
            raise ValueError("Fluxo não encontrado")
        
        now = datetime.now(timezone.utc)
        
        # Create copy with new name
        new_flow = {
            "id": str(uuid.uuid4()),
            "name": f"{original['name']} (cópia)",
            "nodes": original.get('nodes', []),
            "edges": original.get('edges', []),
            "created_at": now,
            "updated_at": now
        }
        
        await db.flows.insert_one(new_flow)
        
        return {
            'id': new_flow['id'],
            'name': new_flow['name'],
            'is_in_use': False,
            'channel_id': None,
            'channel_name': None,
            'nodes': new_flow['nodes'],
            'edges': new_flow['edges'],
            'created_at': new_flow['created_at'],
            'updated_at': new_flow['updated_at']
        }
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error duplicating flow: {e}")
        raise

async def export_flow(flow_id: str) -> dict:
    """Export a flow as JSON"""
    try:
        flow = await db.flows.find_one({"id": flow_id})
        if not flow:
            raise ValueError("Fluxo não encontrado")
        
        # Return exportable format
        return {
            'name': flow.get('name'),
            'nodes': flow.get('nodes', []),
            'edges': flow.get('edges', []),
            'exported_at': datetime.now(timezone.utc).isoformat()
        }
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error exporting flow: {e}")
        raise

async def import_flow(flow_data: dict) -> dict:
    """Import a flow from JSON"""
    try:
        now = datetime.now(timezone.utc)
        
        new_flow = {
            "id": str(uuid.uuid4()),
            "name": flow_data['name'],
            "nodes": flow_data.get('nodes', []),
            "edges": flow_data.get('edges', []),
            "created_at": now,
            "updated_at": now
        }
        
        await db.flows.insert_one(new_flow)
        
        return {
            'id': new_flow['id'],
            'name': new_flow['name'],
            'is_in_use': False,
            'channel_id': None,
            'channel_name': None,
            'nodes': new_flow['nodes'],
            'edges': new_flow['edges'],
            'created_at': new_flow['created_at'],
            'updated_at': new_flow['updated_at']
        }
        
    except Exception as e:
        logger.error(f"Error importing flow: {e}")
        raise


# Team CRUD operations
async def get_teams(page: int = 1, per_page: int = 10, search: str = None) -> dict:
    """Get all teams with pagination"""
    try:
        query = {}
        
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        
        total = await db.teams.count_documents(query)
        skip = (page - 1) * per_page
        
        cursor = db.teams.find(query).skip(skip).limit(per_page).sort("created_at", -1)
        teams = []
        
        async for team in cursor:
            # Count agents in this team
            agent_count = await db.users.count_documents({
                "role": "agent",
                "team_id": team.get('id')
            })
            
            teams.append({
                'id': team.get('id'),
                'name': team.get('name'),
                'session_timeout': team.get('session_timeout', 300),
                'finish_message': team.get('finish_message', 'Atendimento encerrado. Obrigado pelo contato!'),
                'no_agent_message': team.get('no_agent_message', 'No momento não há agentes disponíveis. Por favor, aguarde.'),
                'agent_count': agent_count,
                'created_at': team.get('created_at'),
                'updated_at': team.get('updated_at', team.get('created_at'))
            })
        
        return {
            'teams': teams,
            'total': total,
            'page': page,
            'per_page': per_page
        }
        
    except Exception as e:
        logger.error(f"Error getting teams: {e}")
        raise

async def get_team_by_id(team_id: str) -> dict:
    """Get a single team by ID"""
    try:
        team = await db.teams.find_one({"id": team_id})
        if team:
            # Count agents in this team
            agent_count = await db.users.count_documents({
                "role": "agent",
                "team_id": team_id
            })
            
            return {
                'id': team.get('id'),
                'name': team.get('name'),
                'session_timeout': team.get('session_timeout', 300),
                'finish_message': team.get('finish_message', 'Atendimento encerrado. Obrigado pelo contato!'),
                'no_agent_message': team.get('no_agent_message', 'No momento não há agentes disponíveis. Por favor, aguarde.'),
                'agent_count': agent_count,
                'created_at': team.get('created_at'),
                'updated_at': team.get('updated_at', team.get('created_at'))
            }
        return None
    except Exception as e:
        logger.error(f"Error getting team: {e}")
        raise

async def create_team(team_data: dict) -> dict:
    """Create a new team"""
    try:
        # Check if team name already exists
        existing = await db.teams.find_one({"name": team_data['name']})
        if existing:
            raise ValueError("Já existe uma equipe com este nome")
        
        now = datetime.now(timezone.utc)
        
        new_team = {
            "id": str(uuid.uuid4()),
            "name": team_data['name'],
            "session_timeout": team_data.get('session_timeout', 300),
            "finish_message": team_data.get('finish_message', 'Atendimento encerrado. Obrigado pelo contato!'),
            "no_agent_message": team_data.get('no_agent_message', 'No momento não há agentes disponíveis. Por favor, aguarde.'),
            "created_at": now,
            "updated_at": now
        }
        
        await db.teams.insert_one(new_team)
        
        return {
            'id': new_team['id'],
            'name': new_team['name'],
            'session_timeout': new_team['session_timeout'],
            'finish_message': new_team['finish_message'],
            'no_agent_message': new_team['no_agent_message'],
            'agent_count': 0,
            'created_at': new_team['created_at'],
            'updated_at': new_team['updated_at']
        }
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error creating team: {e}")
        raise

async def update_team(team_id: str, team_data: dict) -> dict:
    """Update a team"""
    try:
        # Check if team exists
        team = await db.teams.find_one({"id": team_id})
        if not team:
            raise ValueError("Equipe não encontrada")
        
        update_data = {
            "updated_at": datetime.now(timezone.utc)
        }
        
        if team_data.get('name'):
            # Check if new name is taken
            existing = await db.teams.find_one({
                "name": team_data['name'],
                "id": {"$ne": team_id}
            })
            if existing:
                raise ValueError("Já existe uma equipe com este nome")
            update_data['name'] = team_data['name']
        
        if 'session_timeout' in team_data and team_data['session_timeout'] is not None:
            update_data['session_timeout'] = team_data['session_timeout']
        
        if 'finish_message' in team_data and team_data['finish_message'] is not None:
            update_data['finish_message'] = team_data['finish_message']
        
        if 'no_agent_message' in team_data and team_data['no_agent_message'] is not None:
            update_data['no_agent_message'] = team_data['no_agent_message']
        
        await db.teams.update_one(
            {"id": team_id},
            {"$set": update_data}
        )
        
        # Get updated team
        return await get_team_by_id(team_id)
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating team: {e}")
        raise

async def delete_team(team_id: str) -> bool:
    """Delete a team"""
    try:
        # Check if team has agents
        agent_count = await db.users.count_documents({
            "role": "agent",
            "team_id": team_id
        })
        if agent_count > 0:
            raise ValueError(f"Não é possível excluir esta equipe. Existem {agent_count} agente(s) vinculado(s).")
        
        result = await db.teams.delete_one({"id": team_id})
        return result.deleted_count > 0
        
    except ValueError as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting team: {e}")
        raise

async def delete_teams_bulk(team_ids: List[str]) -> dict:
    """Delete multiple teams"""
    try:
        deleted_count = 0
        skipped = []
        
        for team_id in team_ids:
            # Check if team has agents
            agent_count = await db.users.count_documents({
                "role": "agent",
                "team_id": team_id
            })
            if agent_count > 0:
                team = await db.teams.find_one({"id": team_id})
                skipped.append({
                    'id': team_id,
                    'name': team.get('name') if team else 'Desconhecido',
                    'reason': f"Possui {agent_count} agente(s) vinculado(s)"
                })
                continue
            
            result = await db.teams.delete_one({"id": team_id})
            if result.deleted_count > 0:
                deleted_count += 1
        
        return {
            'deleted_count': deleted_count,
            'skipped': skipped
        }
        
    except Exception as e:
        logger.error(f"Error deleting teams in bulk: {e}")
        raise
