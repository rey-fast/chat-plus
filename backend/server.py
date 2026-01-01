from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path

from database import init_database, get_user_by_login, verify_password
from auth import create_access_token, verify_token
from models import LoginRequest, LoginResponse, UserResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize database on startup
try:
    init_database()
except Exception as e:
    logging.error(f"Failed to initialize database: {e}")

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Login endpoint - accepts email or username"""
    user = get_user_by_login(credentials.login)
    
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)