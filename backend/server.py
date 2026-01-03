from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from typing import List, Optional

from database import (
    connect_to_mongodb, close_mongodb_connection, get_user_by_login, 
    verify_password, get_agents, create_agent, update_agent, 
    delete_agent, delete_agents_bulk,
    get_admins, create_admin, update_admin, delete_admin, delete_admins_bulk,
    get_channels, get_channel_by_id, create_channel, update_channel, delete_channel, delete_channels_bulk,
    get_flows, get_flow_by_id, create_flow, update_flow, delete_flow, delete_flows_bulk,
    duplicate_flow, export_flow, import_flow
)
from auth import create_access_token, verify_token
from models import (
    LoginRequest, LoginResponse, UserResponse, 
    AgentCreate, AgentUpdate, AgentResponse, AgentListResponse,
    AdminCreate, AdminUpdate, AdminResponse, AdminListResponse,
    ChannelCreate, ChannelUpdate, ChannelResponse, ChannelListResponse,
    FlowCreate, FlowUpdate, FlowResponse, FlowListResponse, FlowImport
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def require_admin(token_data: dict = Depends(verify_token)):
    """Dependency that requires admin role"""
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    return token_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - connect/disconnect MongoDB"""
    # Startup
    await connect_to_mongodb()
    yield
    # Shutdown
    await close_mongodb_connection()

# Create the main app with lifespan
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Login endpoint - accepts email or username"""
    user = await get_user_by_login(credentials.login)
    
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Check if user is active
    if not user.get('is_active', True):
        raise HTTPException(status_code=401, detail="Usuário desativado")
    
    # Create JWT token
    token = create_access_token(data={
        "sub": str(user['id']),
        "username": user['username'],
        "email": user['email'],
        "role": user['role']
    })
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role']
        }
    }

@api_router.get("/auth/me")
async def get_current_user(token_data: dict = Depends(verify_token)):
    """Get current user from token"""
    return {
        "id": token_data.get("sub"),
        "username": token_data.get("username"),
        "email": token_data.get("email"),
        "role": token_data.get("role")
    }

# Agent endpoints
@api_router.get("/agents", response_model=AgentListResponse)
async def list_agents(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    _: dict = Depends(require_admin)
):
    """List all agents (admin only)"""
    try:
        result = await get_agents(page=page, per_page=per_page, search=search)
        return result
    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar agentes")

@api_router.post("/agents", response_model=AgentResponse)
async def create_new_agent(
    agent: AgentCreate,
    _: dict = Depends(require_admin)
):
    """Create a new agent (admin only)"""
    try:
        result = await create_agent(agent.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar agente")

@api_router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_existing_agent(
    agent_id: str,
    agent: AgentUpdate,
    _: dict = Depends(require_admin)
):
    """Update an agent (admin only)"""
    try:
        result = await update_agent(agent_id, agent.model_dump(exclude_unset=True))
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating agent: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar agente")

@api_router.delete("/agents/{agent_id}")
async def delete_existing_agent(
    agent_id: str,
    _: dict = Depends(require_admin)
):
    """Delete an agent (admin only)"""
    try:
        success = await delete_agent(agent_id)
        if not success:
            raise HTTPException(status_code=404, detail="Agente não encontrado")
        return {"message": "Agente excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir agente")

@api_router.post("/agents/bulk-delete")
async def delete_agents_in_bulk(
    agent_ids: List[str],
    _: dict = Depends(require_admin)
):
    """Delete multiple agents (admin only)"""
    try:
        deleted_count = await delete_agents_bulk(agent_ids)
        return {"message": f"{deleted_count} agente(s) excluído(s) com sucesso", "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Error deleting agents in bulk: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir agentes")


# Admin endpoints
@api_router.get("/admins", response_model=AdminListResponse)
async def list_admins(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    _: dict = Depends(require_admin)
):
    """List all admins (admin only)"""
    try:
        result = await get_admins(page=page, per_page=per_page, search=search)
        return result
    except Exception as e:
        logger.error(f"Error listing admins: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar administradores")

@api_router.post("/admins", response_model=AdminResponse)
async def create_new_admin(
    admin: AdminCreate,
    _: dict = Depends(require_admin)
):
    """Create a new admin (admin only)"""
    try:
        result = await create_admin(admin.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating admin: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar administrador")

@api_router.put("/admins/{admin_id}", response_model=AdminResponse)
async def update_existing_admin(
    admin_id: str,
    admin: AdminUpdate,
    token_data: dict = Depends(require_admin)
):
    """Update an admin (admin only)"""
    try:
        current_user_id = token_data.get("sub")
        result = await update_admin(admin_id, admin.model_dump(exclude_unset=True), current_user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating admin: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar administrador")

@api_router.delete("/admins/{admin_id}")
async def delete_existing_admin(
    admin_id: str,
    token_data: dict = Depends(require_admin)
):
    """Delete an admin (admin only)"""
    try:
        current_user_id = token_data.get("sub")
        success = await delete_admin(admin_id, current_user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Administrador não encontrado")
        return {"message": "Administrador excluído com sucesso"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting admin: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir administrador")

@api_router.post("/admins/bulk-delete")
async def delete_admins_in_bulk(
    admin_ids: List[str],
    token_data: dict = Depends(require_admin)
):
    """Delete multiple admins (admin only)"""
    try:
        current_user_id = token_data.get("sub")
        deleted_count = await delete_admins_bulk(admin_ids, current_user_id)
        return {"message": f"{deleted_count} administrador(es) excluído(s) com sucesso", "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Error deleting admins in bulk: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir administradores")


# Channel endpoints
@api_router.get("/channels", response_model=ChannelListResponse)
async def list_channels(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    _: dict = Depends(require_admin)
):
    """List all channels (admin only)"""
    try:
        result = await get_channels(page=page, per_page=per_page, search=search)
        return result
    except Exception as e:
        logger.error(f"Error listing channels: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar canais")

@api_router.get("/channels/{channel_id}", response_model=ChannelResponse)
async def get_single_channel(channel_id: str):
    """Get a single channel by ID (public for chat access)"""
    try:
        result = await get_channel_by_id(channel_id)
        if not result:
            raise HTTPException(status_code=404, detail="Canal não encontrado")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting channel: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter canal")

@api_router.post("/channels", response_model=ChannelResponse)
async def create_new_channel(
    channel: ChannelCreate,
    _: dict = Depends(require_admin)
):
    """Create a new channel (admin only)"""
    try:
        # Get base URL from environment or use default
        frontend_url = os.environ.get('FRONTEND_URL', '')
        result = await create_channel(channel.model_dump(), frontend_url)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating channel: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar canal")

@api_router.put("/channels/{channel_id}", response_model=ChannelResponse)
async def update_existing_channel(
    channel_id: str,
    channel: ChannelUpdate,
    _: dict = Depends(require_admin)
):
    """Update a channel (admin only)"""
    try:
        result = await update_channel(channel_id, channel.model_dump(exclude_unset=True))
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating channel: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar canal")

@api_router.patch("/channels/{channel_id}/toggle-active", response_model=ChannelResponse)
async def toggle_channel_active(
    channel_id: str,
    _: dict = Depends(require_admin)
):
    """Toggle channel active status (admin only)"""
    try:
        # Get current channel
        channel = await get_channel_by_id(channel_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Canal não encontrado")
        
        # Toggle is_active
        result = await update_channel(channel_id, {"is_active": not channel['is_active']})
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling channel: {e}")
        raise HTTPException(status_code=500, detail="Erro ao alternar status do canal")

@api_router.delete("/channels/{channel_id}")
async def delete_existing_channel(
    channel_id: str,
    _: dict = Depends(require_admin)
):
    """Delete a channel (admin only)"""
    try:
        success = await delete_channel(channel_id)
        if not success:
            raise HTTPException(status_code=404, detail="Canal não encontrado")
        return {"message": "Canal excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting channel: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir canal")

@api_router.post("/channels/bulk-delete")
async def delete_channels_in_bulk(
    channel_ids: List[str],
    _: dict = Depends(require_admin)
):
    """Delete multiple channels (admin only)"""
    try:
        deleted_count = await delete_channels_bulk(channel_ids)
        return {"message": f"{deleted_count} canal(is) excluído(s) com sucesso", "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Error deleting channels in bulk: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir canais")


# Flow endpoints
@api_router.get("/flows", response_model=FlowListResponse)
async def list_flows(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    _: dict = Depends(require_admin)
):
    """List all flows (admin only)"""
    try:
        result = await get_flows(page=page, per_page=per_page, search=search)
        return result
    except Exception as e:
        logger.error(f"Error listing flows: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar fluxos")

@api_router.get("/flows/{flow_id}", response_model=FlowResponse)
async def get_single_flow(
    flow_id: str,
    _: dict = Depends(require_admin)
):
    """Get a single flow by ID (admin only)"""
    try:
        result = await get_flow_by_id(flow_id)
        if not result:
            raise HTTPException(status_code=404, detail="Fluxo não encontrado")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting flow: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter fluxo")

@api_router.post("/flows", response_model=FlowResponse)
async def create_new_flow(
    flow: FlowCreate,
    _: dict = Depends(require_admin)
):
    """Create a new flow (admin only)"""
    try:
        result = await create_flow(flow.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating flow: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar fluxo")

@api_router.put("/flows/{flow_id}", response_model=FlowResponse)
async def update_existing_flow(
    flow_id: str,
    flow: FlowUpdate,
    _: dict = Depends(require_admin)
):
    """Update a flow (admin only)"""
    try:
        result = await update_flow(flow_id, flow.model_dump(exclude_unset=True))
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating flow: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar fluxo")

@api_router.delete("/flows/{flow_id}")
async def delete_existing_flow(
    flow_id: str,
    _: dict = Depends(require_admin)
):
    """Delete a flow (admin only)"""
    try:
        success = await delete_flow(flow_id)
        if not success:
            raise HTTPException(status_code=404, detail="Fluxo não encontrado")
        return {"message": "Fluxo excluído com sucesso"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting flow: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir fluxo")

@api_router.post("/flows/bulk-delete")
async def delete_flows_in_bulk(
    flow_ids: List[str],
    _: dict = Depends(require_admin)
):
    """Delete multiple flows (admin only)"""
    try:
        result = await delete_flows_bulk(flow_ids)
        return {
            "message": f"{result['deleted_count']} fluxo(s) excluído(s) com sucesso",
            "deleted_count": result['deleted_count'],
            "skipped": result['skipped']
        }
    except Exception as e:
        logger.error(f"Error deleting flows in bulk: {e}")
        raise HTTPException(status_code=500, detail="Erro ao excluir fluxos")

@api_router.post("/flows/{flow_id}/duplicate", response_model=FlowResponse)
async def duplicate_existing_flow(
    flow_id: str,
    _: dict = Depends(require_admin)
):
    """Duplicate a flow (admin only)"""
    try:
        result = await duplicate_flow(flow_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error duplicating flow: {e}")
        raise HTTPException(status_code=500, detail="Erro ao duplicar fluxo")

@api_router.get("/flows/{flow_id}/export")
async def export_existing_flow(
    flow_id: str,
    _: dict = Depends(require_admin)
):
    """Export a flow as JSON (admin only)"""
    try:
        result = await export_flow(flow_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error exporting flow: {e}")
        raise HTTPException(status_code=500, detail="Erro ao exportar fluxo")

@api_router.post("/flows/import", response_model=FlowResponse)
async def import_new_flow(
    flow: FlowImport,
    _: dict = Depends(require_admin)
):
    """Import a flow from JSON (admin only)"""
    try:
        result = await import_flow(flow.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error importing flow: {e}")
        raise HTTPException(status_code=500, detail="Erro ao importar fluxo")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
