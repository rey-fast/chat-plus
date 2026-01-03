from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    login: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class UserResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    role: str
    created_at: datetime

# Agent Models
class AgentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    is_active: bool = True

class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = None

class AgentResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    is_active: bool
    created_at: datetime

class AgentListResponse(BaseModel):
    agents: List[AgentResponse]
    total: int
    page: int
    per_page: int

# Admin Models
class AdminCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    is_active: bool = True

class AdminUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = None

class AdminResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    is_active: bool
    created_at: datetime

class AdminListResponse(BaseModel):
    admins: List[AdminResponse]
    total: int
    page: int
    per_page: int


# Channel Models
class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    type: str = Field(..., pattern="^(site|whatsapp|telegram|instagram|facebook|email)$")

class ChannelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    is_active: Optional[bool] = None
    flow_id: Optional[str] = None

class ChannelResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    is_active: bool
    flow_id: Optional[str] = None
    flow_name: Optional[str] = None
    chat_link: Optional[str] = None
    created_at: datetime

class ChannelListResponse(BaseModel):
    channels: List[ChannelResponse]
    total: int
    page: int
    per_page: int


# Flow Models
class FlowCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class FlowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)

class FlowResponse(BaseModel):
    id: str
    name: str
    is_in_use: bool
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    nodes: Optional[List[dict]] = None
    edges: Optional[List[dict]] = None
    created_at: datetime
    updated_at: datetime

class FlowListResponse(BaseModel):
    flows: List[FlowResponse]
    total: int
    page: int
    per_page: int

class FlowImport(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    nodes: Optional[List[dict]] = None
    edges: Optional[List[dict]] = None
