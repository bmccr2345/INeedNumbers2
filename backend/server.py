"""
I Need Numbers - Production-Ready FastAPI Backend
Real Estate Investment Analysis Platform
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Cookie, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta, timezone, date
import pytz
from decimal import Decimal
import math
from calendar import monthrange
from jose import JWTError, jwt
from app.security_modules.password import hash_password, verify_password, check_needs_rehash
from app.two_factor import (
    generate_totp_secret,
    generate_qr_code,
    verify_totp_code,
    generate_backup_codes,
    hash_backup_codes,
    verify_backup_code
)
import stripe
import logging
import uuid
import json
import time
import secrets
from pathlib import Path
import sys
from enum import Enum
import asyncio
import tempfile
from fastapi.responses import Response
# WeasyPrint removed - using Playwright for PDF generation (Emergent compatibility)
import io
import os
import re
import base64
from typing import BinaryIO
from fastapi import UploadFile, File, Form
from PIL import Image, ImageOps
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import subprocess

# Add app directory to path for modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import production-ready configuration and security
from config import get_config
from app.deps import get_settings
from app.security import (
    SecurityHeadersMiddleware, 
    RateLimitMiddleware,
    CSRFMiddleware,
    get_allowlist, 
    enforce_body_limit,
    create_secure_cookie_response
)
from app.security_modules.password import hash_password, verify_password, check_needs_rehash

# Initialize configuration - will fail if required secrets missing
config = get_config()

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# JWT Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Initialize Stripe with production-ready error handling
try:
    stripe.api_key = config.STRIPE_API_KEY
    logger.info("Stripe initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Stripe: {e}")
    sys.exit(1)

# MongoDB connection with production-ready error handling
try:
    client = AsyncIOMotorClient(config.MONGO_URL)
    db = client[config.DB_NAME]
    logger.info(f"MongoDB connected: {config.DB_NAME}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    sys.exit(1)

# Initialize MongoDB-based caching for rate limiting  
try:
    from app.mongodb_cache import get_cache
    cache = get_cache()
    if cache and cache.is_connected():
        logger.info("MongoDB cache initialized successfully")
    else:
        logger.warning("MongoDB cache not available - rate limiting will use fallback")
except Exception as e:
    logger.error(f"MongoDB cache initialization error: {e}")

# Password hashing now handled by app.security.password module

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Get version from git or default
def get_version() -> str:
    """Get application version from git hash or default."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return "development"

APP_VERSION = get_version()

# Create the main app with production configuration
app = FastAPI(
    title="I Need Numbers API",
    description="Real Estate Investment Analysis Platform",
    version=APP_VERSION,
    docs_url="/docs" if not config.is_production() else None,  # Disable docs in production
    redoc_url="/redoc" if not config.is_production() else None
)

# HTTPS redirect in production ONLY
if config.is_production():
    app.add_middleware(HTTPSRedirectMiddleware)
    logger.info("HTTPS redirect enabled for production")

# Security headers middleware (ALWAYS enabled)
app.add_middleware(SecurityHeadersMiddleware)
logger.info("Security headers middleware enabled")

# CSRF protection middleware
app.add_middleware(CSRFMiddleware)
logger.info("CSRF protection middleware enabled")

# Rate limiting middleware (uses MongoDB cache in production)
if config.RATE_LIMIT_ENABLED:
    app.add_middleware(RateLimitMiddleware)
    logger.info(f"Rate limiting enabled: {config.RATE_LIMIT_REQUESTS}/{config.RATE_LIMIT_WINDOW}s")

# CORS middleware with strict allowlist
cors_origins = config.get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)
logger.info(f"CORS configured for origins: {cors_origins}")

# Global JSON body size limit enforcement
@app.middleware("http")
async def body_size_limit_middleware(request: Request, call_next):
    """Enforce JSON body size limits globally."""
    if request.headers.get("content-type", "").startswith("application/json"):
        enforce_body_limit(request, config.MAX_JSON_BODY_KB)
    return await call_next(request)

# Health check endpoint (REQUIRED for production)
@app.get("/health")
async def health_check():
    """
    Production health check endpoint.
    Returns application status, version, and service health.
    """
    # Check MongoDB cache health
    try:
        cache_health = {"status": "healthy", "connected": True}
        if 'cache' in globals():
            cache_health = cache.health_check() if hasattr(cache, 'health_check') else {"status": "healthy", "connected": True}
    except Exception as e:
        cache_health = {"status": "unhealthy", "connected": False, "error": str(e)}
    
    # Check MongoDB connection
    try:
        await db.command("ping")
        mongo_status = {"status": "healthy", "connected": True}
    except Exception as e:
        mongo_status = {"status": "unhealthy", "connected": False, "error": str(e)}
    
    return {
        "ok": True,
        "version": APP_VERSION,
        "environment": config.NODE_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "mongodb": mongo_status,
            "cache": cache_health,
            "stripe": {"configured": bool(config.STRIPE_API_KEY)},
            "s3": {"configured": bool(config.S3_BUCKET and config.S3_ACCESS_KEY_ID)}
        }
    }

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize S3 client with production-ready error handling
s3_client = None

# Check if S3 credentials are properly configured
s3_credentials_configured = (
    hasattr(config, 'S3_ACCESS_KEY_ID') and config.S3_ACCESS_KEY_ID and
    hasattr(config, 'S3_SECRET_ACCESS_KEY') and config.S3_SECRET_ACCESS_KEY and
    hasattr(config, 'S3_BUCKET') and config.S3_BUCKET and
    hasattr(config, 'S3_REGION') and config.S3_REGION
)

if s3_credentials_configured:
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=config.S3_ACCESS_KEY_ID,
            aws_secret_access_key=config.S3_SECRET_ACCESS_KEY,
            region_name=config.S3_REGION
        )
        logger.info("S3 client initialized successfully")
    except Exception as e:
        if config.is_production():
            logger.error(f"S3 client initialization failed in production: {e}")
            sys.exit(1)
        else:
            logger.warning(f"S3 client initialization failed (dev mode): {e}")
            s3_client = None
else:
    logger.info("S3 credentials not configured - using local storage fallback for file uploads")

# PDF Branding Helper Functions
def create_transparent_png_fallback() -> str:
    """Create a 1x1 transparent PNG as base64 fallback for missing assets."""
    try:
        # Create a 1x1 transparent PNG
        img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to create transparent PNG fallback: {e}")
        return ""

async def fetch_and_convert_s3_image(s3_url: str, max_size_kb: int = 500) -> str:
    """
    Fetch image from S3 private URL and convert to base64 for PDF embedding.
    
    Args:
        s3_url: S3 URL in format 's3://bucket/key' or direct key
        max_size_kb: Maximum image size in KB (for optimization)
    
    Returns:
        Base64 encoded image string, or empty string on failure
    """
    if not s3_client or not s3_url:
        return create_transparent_png_fallback()
    
    try:
        # Extract S3 bucket and key from URL
        if s3_url.startswith('s3://'):
            # Format: s3://bucket/key
            parts = s3_url[5:].split('/', 1)
            if len(parts) != 2:
                logger.warning(f"Invalid S3 URL format: {s3_url}")
                return create_transparent_png_fallback()
            bucket, key = parts
        else:
            # Assume it's just the key, use configured bucket
            bucket = config.S3_BUCKET
            key = s3_url
        
        # Fetch image from S3
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
        
        # Open image with PIL for processing
        with Image.open(io.BytesIO(image_data)) as img:
            # Convert to RGB if necessary (for JPEG compatibility)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Keep transparency for PNG
                img_format = 'PNG'
            else:
                img = img.convert('RGB')
                img_format = 'JPEG'
            
            # Resize if too large (maintain aspect ratio)
            max_dimension = 800  # Max width or height in pixels
            if max(img.width, img.height) > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            
            # Optimize and convert to base64
            buffer = io.BytesIO()
            
            if img_format == 'JPEG':
                # Optimize JPEG quality
                img.save(buffer, format=img_format, quality=85, optimize=True)
            else:
                # Optimize PNG
                img.save(buffer, format=img_format, optimize=True)
            
            buffer.seek(0)
            image_bytes = buffer.getvalue()
            
            # Check size limit
            size_kb = len(image_bytes) / 1024
            if size_kb > max_size_kb:
                logger.warning(f"Image {key} is {size_kb:.1f}KB, exceeds {max_size_kb}KB limit")
                # Try reducing quality or size further
                if img_format == 'JPEG':
                    buffer = io.BytesIO()
                    img.save(buffer, format=img_format, quality=60, optimize=True)
                    buffer.seek(0)
                    image_bytes = buffer.getvalue()
            
            # Convert to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            logger.info(f"Successfully converted S3 image {key} to base64 ({len(image_bytes)/1024:.1f}KB)")
            return base64_image
            
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            logger.warning(f"S3 key not found: {key}")
        elif error_code == 'AccessDenied':
            logger.warning(f"S3 access denied for key: {key}")
        else:
            logger.error(f"S3 error fetching {key}: {e}")
        return create_transparent_png_fallback()
        
    except Exception as e:
        logger.error(f"Failed to fetch and convert S3 image {s3_url}: {e}")
        return create_transparent_png_fallback()

# Enums
class PlanType(str, Enum):
    FREE = "FREE"
    STARTER = "STARTER"
    PRO = "PRO"

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    MASTER_ADMIN = "master_admin"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class AuditAction(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    REGISTER = "register"
    CREATE = "create"
    UPDATE = "update"
    DELETE_ACCOUNT = "delete_account"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_CONFIRM = "password_reset_confirm"
    PASSWORD_CHANGE = "password_change"
    UPDATE_PROFILE = "update_profile"
    ADMIN_USER_VIEW = "admin_user_view"
    ADMIN_USER_UPDATE = "admin_user_update"
    ADMIN_USER_DELETE = "admin_user_delete"
    ADMIN_PLAN_CHANGE = "admin_plan_change"
    ADMIN_STATS_VIEW = "admin_stats_view"
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"

# Pydantic Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    plan: PlanType = PlanType.FREE
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    plan: Optional[PlanType] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None

class User(UserBase):
    id: str
    created_at: str
    updated_at: Optional[str] = None
    hashed_password: str
    deals_count: int = 0

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    plan: PlanType
    role: UserRole
    status: UserStatus
    created_at: str
    updated_at: Optional[str] = None
    deals_count: int = 0

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class AuditLog(BaseModel):
    id: str
    user_id: str
    user_email: str
    action: AuditAction
    details: Dict[str, Any]
    ip_address: str
    user_agent: str
    timestamp: str

class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    action: AuditAction
    details: Dict[str, Any]
    ip_address: str
    user_agent: str
    timestamp: str

class PaymentTransaction(BaseModel):
    id: str
    user_id: str
    stripe_session_id: str
    stripe_customer_id: Optional[str] = None
    plan: PlanType
    amount: int  # in cents
    currency: str = "usd"
    status: PaymentStatus
    created_at: str
    updated_at: Optional[str] = None

class Deal(BaseModel):
    id: str
    user_id: str
    address: str
    price: float
    rent_monthly: float
    cap_rate: Optional[float] = None
    cash_on_cash: Optional[float] = None
    created_at: str

class AffordabilityCalculation(BaseModel):
    id: str
    title: str
    home_price: float
    down_payment: float
    down_payment_percent: float
    interest_rate: float
    loan_term: int
    property_taxes: float
    property_taxes_percent: float
    insurance: float
    pmi_rate: float
    hoa: float
    income: float
    debt: float
    piti: float
    ltv: float
    dti: float
    qualified: bool
    max_home_price: float
    created_at: str

# Commission Split Calculator Models
class CommissionSplitCalculation(BaseModel):
    id: str
    title: str
    sale_price: float
    commission_percent: float
    your_side: str  # "buyer" or "seller" or "dual"
    brokerage_split: float  # percentage
    referral_fee: float
    team_fee: float
    transaction_fee: float
    other_deductions: float
    gross_commission: float
    agent_gross: float
    final_take_home: float
    created_at: str

# Seller Net Sheet Calculator Models  
class SellerNetSheetCalculation(BaseModel):
    id: str
    title: str
    sale_price: float
    loan_payoff: float
    concessions: float
    commission_rate: float
    title_escrow: float
    recording_fees: float
    transfer_tax: float
    doc_stamps: float
    hoa_fees: float
    staging_costs: float
    other_costs: float
    prorated_taxes: float
    estimated_net: float
    created_at: str

# Brand Profile Models
class BrandAsset(BaseModel):
    url: str = ""
    w: int = 0
    h: int = 0
    mime: str = ""
    updatedAt: str = ""

class BrandAgent(BaseModel):
    firstName: str = ""
    lastName: str = ""
    email: str = ""
    phone: str = ""
    licenseNumber: str = ""
    licenseState: str = ""

class BrandBrokerage(BaseModel):
    name: str = ""
    licenseNumber: str = ""
    address: str = ""

class BrandAssets(BaseModel):
    headshot: BrandAsset = BrandAsset()
    agentLogo: BrandAsset = BrandAsset()
    brokerLogo: BrandAsset = BrandAsset()

class BrandColors(BaseModel):
    primaryHex: str = "#16a34a"
    secondaryHex: str = "#0ea5e9"
    fontKey: str = "default"

class BrandFooter(BaseModel):
    compliance: str = ""
    cta: str = "Contact {{agent.name}} — {{agent.email}}"

class BrandPlanRules(BaseModel):
    starterHeaderBar: bool = True
    proShowAgentLogo: bool = True
    proShowBrokerLogo: bool = True
    proShowCta: bool = True

class BrandProfile(BaseModel):
    id: str
    userId: str
    agent: BrandAgent = BrandAgent()
    brokerage: BrandBrokerage = BrandBrokerage()
    assets: BrandAssets = BrandAssets()
    brand: BrandColors = BrandColors()
    footer: BrandFooter = BrandFooter()
    planRules: BrandPlanRules = BrandPlanRules()
    completion: float = 0.0
    updatedAt: str

class BrandProfileUpdate(BaseModel):
    agent: Optional[BrandAgent] = None
    brokerage: Optional[BrandBrokerage] = None
    brand: Optional[BrandColors] = None
    footer: Optional[BrandFooter] = None
    planRules: Optional[BrandPlanRules] = None

class BrandResolveResponse(BaseModel):
    agent: dict
    brokerage: dict
    colors: dict
    assets: dict
    footer: dict
    plan: str
    show: dict

# P&L Tracker Models
class PnLDeal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    house_address: str
    amount_sold_for: float
    commission_percent: float
    split_percent: float
    team_brokerage_split_percent: float
    lead_source: str
    contract_signed: str = Field(default="")  # YYYY-MM-DD format - optional for existing deals
    due_diligence_start: str = Field(default="")  # YYYY-MM-DD format - optional for existing deals
    due_diligence_over: str = Field(default="")  # YYYY-MM-DD format - optional for existing deals
    closing_date: str  # YYYY-MM-DD format
    month: str  # YYYY-MM format for filtering
    cap_amount: float = 0  # Amount that went to cap
    final_income: float  # Calculated field (after cap deduction)
    pre_cap_income: float = 0  # Income before cap deduction
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class PnLDealCreate(BaseModel):
    house_address: str
    amount_sold_for: float
    commission_percent: float
    split_percent: float
    team_brokerage_split_percent: float
    lead_source: str
    contract_signed: str
    due_diligence_start: str
    due_diligence_over: str
    closing_date: str

class PnLExpense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    category: str
    budget: Optional[float] = 0
    amount: float
    description: Optional[str] = None
    month: str  # YYYY-MM format for filtering
    recurring: bool = False
    recurring_until: Optional[str] = None  # YYYY-MM format - end of year when recurring stops
    is_recurring_instance: bool = False  # True if this was auto-created from recurring
    original_expense_id: Optional[str] = None  # Reference to original recurring expense
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class PnLExpenseCreate(BaseModel):
    date: str
    category: str
    budget: Optional[float] = 0
    amount: float
    description: Optional[str] = None
    recurring: bool = False

class PnLBudget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    category: str
    monthly_budget: float
    month: str  # YYYY-MM format
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class PnLBudgetCreate(BaseModel):
    category: str
    monthly_budget: float

class PnLExpenseCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    is_predefined: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PnLExpenseCategoryCreate(BaseModel):
    name: str

class PnLSummary(BaseModel):
    month: str
    total_income: float
    total_expenses: float
    net_income: float
    deals: List[PnLDeal]
    expenses: List[PnLExpense]
    budget_utilization: Dict[str, Dict[str, float]]  # {category: {budget, spent, remaining, percent}}

# Commission Cap Tracker Models
class CapConfiguration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    annual_cap_amount: float
    cap_percentage: float = 5.0  # Default to 5% if not specified (backward compatibility)
    cap_period_type: str  # calendar_year, rolling_12_months
    cap_period_start: str  # YYYY-MM-DD format
    current_cap_paid: float = 0
    reset_date: str  # YYYY-MM-DD format
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class CapConfigurationCreate(BaseModel):
    annual_cap_amount: float
    cap_percentage: float
    cap_period_type: str
    cap_period_start: str
    current_cap_paid: Optional[float] = 0
    reset_date: str

class CapProgress(BaseModel):
    total_cap: float
    paid_so_far: float
    remaining: float
    percentage: float
    is_complete: bool
    deals_contributing: int

# AI Coach Models
class CoachingProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    market: Optional[str] = "General"
    commission_cap_cents: Optional[int] = 0
    cap_year_start: Optional[str] = None
    # Goals
    annual_gci_cents: Optional[int] = 0
    weekly_outbound_calls: Optional[int] = 0
    weekly_new_convos: Optional[int] = 0
    weekly_appointments: Optional[int] = 0
    monthly_new_listings: Optional[int] = 0
    # Constraints
    weekly_hours: Optional[int] = 40
    max_buyers_in_flight: Optional[int] = 5
    budget_monthly_marketing_cents: Optional[int] = 0
    # Optional funnel benchmarks
    funnel_benchmarks: Optional[Dict[str, float]] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

class CoachingProfileCreate(BaseModel):
    market: Optional[str] = "General"
    annual_gci_cents: Optional[int] = 0
    weekly_outbound_calls: Optional[int] = 0
    weekly_new_convos: Optional[int] = 0
    weekly_appointments: Optional[int] = 0
    monthly_new_listings: Optional[int] = 0
    weekly_hours: Optional[int] = 40
    max_buyers_in_flight: Optional[int] = 5
    budget_monthly_marketing_cents: Optional[int] = 0

class WeeklyMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    week_of: str  # YYYY-MM-DD format (Monday of the week)
    deals_created: int = 0
    deals_closed: int = 0
    gci_cents: int = 0
    cap_remaining_cents: Optional[int] = 0
    calls_made: int = 0
    new_conversations: int = 0
    appointments: int = 0
    avg_days_to_close: Optional[float] = 0
    pipeline_value_cents: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Legacy AI Coach Response Model (keeping for backward compatibility)
class AICoachResponse(BaseModel):
    coaching_text: str

class AICoachCache(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    cache_key: str
    response_data: Dict
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str

# Helper Functions
async def get_user_by_email(email: str) -> Optional[User]:
    user_data = await db.users.find_one({"email": email})
    if user_data:
        # Convert datetime fields to strings for Pydantic validation
        if 'updated_at' in user_data and isinstance(user_data['updated_at'], datetime):
            user_data['updated_at'] = user_data['updated_at'].isoformat()
        if 'created_at' in user_data and isinstance(user_data['created_at'], datetime):
            user_data['created_at'] = user_data['created_at'].isoformat()
        return User(**user_data)
    return None

async def get_user_by_id(user_id: str) -> Optional[User]:
    user_data = await db.users.find_one({"id": user_id})
    if user_data:
        # Convert datetime fields to strings for Pydantic validation
        if 'updated_at' in user_data and isinstance(user_data['updated_at'], datetime):
            user_data['updated_at'] = user_data['updated_at'].isoformat()
        if 'created_at' in user_data and isinstance(user_data['created_at'], datetime):
            user_data['created_at'] = user_data['created_at'].isoformat()
        return User(**user_data)
    return None

async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from HttpOnly cookie"""
    token = request.cookies.get("access_token")
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    
    user = await get_user_by_id(user_id)
    return user

async def get_current_user_unified(request: Request, token: str = Depends(oauth2_scheme)) -> Optional[User]:
    """
    Unified authentication that accepts both Bearer tokens and cookies.
    This allows frontend to use either method seamlessly.
    """
    auth_token = None
    
    # Try Bearer token first (from Authorization header)
    if token:
        auth_token = token
    else:
        # Fallback to cookie-based authentication
        auth_token = request.cookies.get('access_token')
    
    if not auth_token:
        return None
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(auth_token, config.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user

async def get_current_user_form_upload(request: Request) -> Optional[User]:
    """
    Authentication for form uploads (multipart/form-data) that doesn't use oauth2_scheme.
    This avoids potential conflicts with form data parsing.
    """
    auth_token = None
    
    # Try Bearer token from Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer ") and len(auth_header) > 7:
        auth_token = auth_header[7:]
    else:
        # Fallback to cookie-based authentication
        auth_token = request.cookies.get('access_token')
    
    if not auth_token:
        return None
        
    try:
        payload = jwt.decode(auth_token, config.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    
    user = await get_user_by_id(user_id)
    return user

async def get_current_user_optional(token: str = Depends(oauth2_scheme)) -> Optional[User]:
    """Get current user without raising an exception if not authenticated"""
    if not token:
        return None
        
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
            
        user = await get_user_by_id(user_id)
        return user
    except JWTError:
        return None

async def require_auth(request: Request) -> User:
    current_user = await get_current_user(request)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return current_user

async def require_auth_unified(request: Request, current_user: User = Depends(get_current_user_unified)) -> User:
    """Unified authentication requirement for both Bearer tokens and cookies"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

async def require_auth_form_upload(request: Request) -> User:
    """Authentication requirement for form uploads (multipart/form-data)"""
    current_user = await get_current_user_form_upload(request)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

def require_plan_unified(required: str):
    """Unified plan gating that works with both auth methods"""
    def dep(user = Depends(require_auth_unified)):
        allowed = {"PRO"}
        if required.upper() == "STARTER":
            allowed.add("STARTER")
        elif required.upper() == "FREE":
            allowed.update(["STARTER", "FREE"])
            
        if user.plan not in allowed:
            raise HTTPException(status_code=403, detail="Upgrade required")
        return user
    return dep

async def require_admin(current_user: User = Depends(require_auth)) -> User:
    if current_user.role not in [UserRole.ADMIN, UserRole.MASTER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def require_master_admin(current_user: User = Depends(require_auth)) -> User:
    if current_user.role != UserRole.MASTER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Master admin access required"
        )
    return current_user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password_legacy(plain_password, hashed_password):
    """Legacy function name - use app.security_modules.password.verify_password directly"""
    return verify_password(plain_password, hashed_password)

def get_password_hash(password):
    """Hash password using Argon2id"""
    return hash_password(password)

async def log_audit_event(
    user: User,
    action: AuditAction,
    details: Dict[str, Any],
    request: Request
):
    """Log an audit event"""
    try:
        audit_log = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "user_email": user.email,
            "action": action.value,
            "details": details,
            "ip_address": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.audit_logs.insert_one(audit_log)
        logger.info(f"Audit log created: {action.value} for user {user.email}")
    except Exception as e:
        logger.error(f"Failed to create audit log: {str(e)}")

async def check_plan_limits(user: User, operation: str) -> Optional[dict]:
    """Check if user's plan allows the operation. Returns error response if blocked, None if allowed."""
    if user.plan == PlanType.FREE:
        # Free users cannot save deals or closing date calculations
        if operation in ["save_deal", "closing_date"]:
            return {
                "detail": "Saving calculations requires a paid plan. Upgrade to Starter or Pro plan to save your calculations.",
                "status_code": 402
            }
    elif user.plan == PlanType.STARTER:
        # Starter users have limited deal saves
        if operation == "save_deal":
            user_deals_count = await db.deals.count_documents({"user_id": user.id})
            if user_deals_count >= 10:
                return {
                    "detail": "You have reached the limit of 10 saved deals for Starter plan. Upgrade to Pro for unlimited saves.",
                    "status_code": 402
                }
        elif operation == "closing_date":
            closing_date_count = await db.closing_date_calculations.count_documents({"user_id": user.id})
            if closing_date_count >= 10:
                return {
                    "detail": "You have reached the limit of 10 saved closing date calculations for Starter plan. Upgrade to Pro for unlimited saves.",
                    "status_code": 402
                }
    # Pro users have unlimited access
    return None

def get_effective_plan(current_user: Optional[User], plan_preview: Optional[str]) -> str:
    """Get the effective plan for the user, considering plan preview"""
    if plan_preview and plan_preview in ['FREE', 'STARTER', 'PRO']:
        return plan_preview
    if current_user:
        return current_user.plan.value
    return 'FREE'

# Brand Profile Helper Functions
async def get_brand_profile(user_id: str) -> Optional[BrandProfile]:
    """Get brand profile for user, create default if doesn't exist"""
    try:
        profile_data = await db.brand_profiles.find_one({"userId": user_id})
        if profile_data:
            return BrandProfile(**profile_data)
        
        # Create default profile
        default_profile = {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "agent": BrandAgent().dict(),
            "brokerage": BrandBrokerage().dict(),
            "assets": BrandAssets().dict(),
            "brand": BrandColors().dict(),
            "footer": BrandFooter().dict(),
            "planRules": BrandPlanRules().dict(),
            "completion": 0.0,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.brand_profiles.insert_one(default_profile)
        return BrandProfile(**default_profile)
    except Exception as e:
        logger.error(f"Error getting brand profile for user {user_id}: {e}")
        return None

def calculate_completion_score(profile: BrandProfile) -> float:
    """Calculate completion score based on profile data"""
    score = 0.0
    
    # Agent details (+25 points)
    agent = profile.agent
    if agent.firstName and agent.lastName and agent.email:
        score += 25
    
    # Brokerage details (+25 points)
    brokerage = profile.brokerage
    if brokerage.name:
        score += 25
    
    # Headshot (+20 points)
    if profile.assets.headshot.url:
        score += 20
    
    # Primary brand color (+15 points)
    if profile.brand.primaryHex and profile.brand.primaryHex != "#16a34a":
        score += 15
    
    # At least one logo for Pro users (+15 points)
    if profile.assets.agentLogo.url or profile.assets.brokerLogo.url:
        score += 15
    
    return min(score, 100.0)

def process_image_with_pillow(image_data: bytes, asset_type: str) -> bytes:
    """Process image using Pillow based on asset type"""
    try:
        # Open image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary (preserving transparency for logos)
        if asset_type == "headshot":
            # Headshots: convert to RGB (no transparency needed)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparency
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'RGBA':
                    background.paste(image, mask=image.split()[-1])
                    image = background
                else:
                    image = image.convert('RGB')
        else:
            # Logos: preserve transparency
            if image.mode in ('LA', 'P'):
                image = image.convert('RGBA')
        
        # Remove EXIF data and apply orientation
        image = ImageOps.exif_transpose(image)
        
        # Process based on asset type
        if asset_type == "headshot":
            # Headshot: crop/resize to 600×600 PNG, strip EXIF, sRGB
            target_size = (600, 600)
            # Center crop to square if not already
            width, height = image.size
            if width != height:
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                image = image.crop((left, top, left + size, top + size))
            
            # Resize to target
            image = image.resize(target_size, Image.Resampling.LANCZOS)
            
        else:
            # Logos: keep transparency; normalize height ~200px
            width, height = image.size
            if height > 200:
                # Maintain aspect ratio, set height to 200px
                aspect_ratio = width / height
                new_height = 200
                new_width = int(new_height * aspect_ratio)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save as PNG
        output = io.BytesIO()
        if asset_type == "headshot":
            image.save(output, format='PNG', optimize=True)
        else:
            # Preserve transparency for logos
            image.save(output, format='PNG', optimize=True)
        
        return output.getvalue()
        
    except Exception as e:
        logger.error(f"Error processing {asset_type} image: {e}")
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

async def upload_to_s3(file_data: bytes, key: str, content_type: str = "image/png") -> str:
    """Upload file to S3 without ACL (ACLs disabled on bucket)"""
    if not s3_client:
        raise HTTPException(status_code=500, detail="File upload not configured")
    
    try:
        # PutObject without ACL field (bucket has ACLs disabled)
        s3_client.put_object(
            Bucket=config.S3_BUCKET,
            Key=key,
            Body=file_data,
            ContentType=content_type
            # NO ACL field - bucket has "Object ownership = ACLs disabled"
        )
        
        # Return S3 URL
        url = f"https://{config.S3_BUCKET}.s3.{config.S3_REGION}.amazonaws.com/{key}"
        return url
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'AccessControlListNotSupported':
            logger.error("ACL not supported - bucket has ACLs disabled")
            raise HTTPException(status_code=500, detail="Storage configuration error")
        elif error_code == 'SignatureDoesNotMatch':
            logger.error("S3 signature mismatch - check credentials")
            raise HTTPException(status_code=500, detail="Storage authentication error")
        else:
            logger.error(f"S3 upload error: {e}")
            raise HTTPException(status_code=500, detail="File upload failed")
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

async def delete_from_s3(key: str) -> bool:
    """Delete file from S3"""
    if not s3_client:
        return False
    
    try:
        s3_client.delete_object(Bucket=config.S3_BUCKET, Key=key)
        return True
    except Exception as e:
        logger.error(f"S3 delete error: {e}")
        return False

async def test_s3_connection() -> bool:
    """Test S3 connection with a health check"""
    if not s3_client:
        return False
    
    try:
        # Try a small PutObject and DeleteObject
        test_key = f"healthcheck/{uuid.uuid4()}"
        test_data = b"health-check"
        
        # Upload test file
        s3_client.put_object(
            Bucket=config.S3_BUCKET,
            Key=test_key,
            Body=test_data,
            ContentType='text/plain'
        )
        
        # Delete test file
        s3_client.delete_object(Bucket=config.S3_BUCKET, Key=test_key)
        
        return True
    except Exception as e:
        logger.error(f"S3 health check failed: {e}")
        return False

# Template rendering functions
def ensure_branding_structure(branding_data: dict) -> dict:
    """Ensure branding data has proper nested structure for template rendering"""
    if not branding_data:
        branding_data = {}
    
    # Ensure all required nested structures exist with empty defaults
    default_structure = {
        "agent": {"name": "", "initials": "", "email": "", "phone": ""},
        "brokerage": {"name": "", "license": "", "address": ""},
        "colors": {"primary": "#16a34a", "secondary": "#0ea5e9"},
        "assets": {"headshotPngBase64": "", "agentLogoPngBase64": "", "brokerLogoPngBase64": ""},
        "footer": {"compliance": "", "cta": ""},
        "plan": "FREE",
        "show": {"headerBar": False, "agentLogo": False, "brokerLogo": False, "cta": False}
    }
    
    # Merge with defaults - preserve any existing values
    for key, default_value in default_structure.items():
        if key not in branding_data:
            branding_data[key] = default_value
        elif isinstance(default_value, dict):
            # Ensure nested dicts have all required keys
            for nested_key, nested_default in default_value.items():
                if nested_key not in branding_data[key]:
                    branding_data[key][nested_key] = nested_default
    
    return branding_data

def render_template(template_content: str, data: dict) -> str:
    """Production-ready Mustache template rendering using pystache library"""
    import pystache
    
    # Ensure branding data has proper structure for pystache
    if "branding" in data:
        data["branding"] = ensure_branding_structure(data["branding"])
        logger.info(f"Branding structure ensured, keys: {list(data['branding'].keys())}")
    else:
        # Add empty branding structure if missing
        data["branding"] = ensure_branding_structure({})
        logger.info("Added empty branding structure to data")
    
    # Create renderer with no HTML escaping (we want raw output for PDFs)
    # Using string_encoding=None to handle missing keys gracefully
    renderer = pystache.Renderer(
        escape=lambda u: u,  # Disable HTML escaping
        string_encoding=None,  # Return unicode directly
        missing_tags='ignore'  # Ignore missing tags instead of raising errors
    )
    
    try:
        rendered = renderer.render(template_content, data)
        logger.info(f"Template rendered successfully using pystache, output length: {len(rendered)}")
        return rendered
    except Exception as e:
        logger.error(f"Pystache template rendering error: {str(e)}")
        # Log the data keys for debugging
        logger.error(f"Available data keys: {list(data.keys())}")
        if "branding" in data:
            logger.error(f"Branding structure: {json.dumps(data['branding'], indent=2)}")
        raise

async def prepare_affordability_report_data_generic(calculation_data: dict, property_data: dict, current_user=None) -> dict:
    """Prepare data for affordability report template"""
    
    # Get branding information
    branding_data = {}
    if current_user:
        try:
            profile = await get_brand_profile(current_user.id)
            if profile:
                # Process brand profile into branding data format
                plan = current_user.plan.value
                is_paid_user = plan in ["STARTER", "PRO"]
                
                # Prepare agent name
                agent_name = f"{profile.agent.firstName} {profile.agent.lastName}".strip()
                if not agent_name:
                    agent_name = current_user.full_name or ""
                
                # Generate agent initials for PDF header
                agent_initials = ""
                if profile.agent.firstName and profile.agent.lastName:
                    agent_initials = f"{profile.agent.firstName[0]}{profile.agent.lastName[0]}".upper()
                elif agent_name:
                    name_parts = agent_name.split()
                    if len(name_parts) >= 2:
                        agent_initials = f"{name_parts[0][0]}{name_parts[1][0]}".upper()
                    elif len(name_parts) == 1:
                        agent_initials = name_parts[0][0].upper()
                
                branding_data = {
                    "agent": {
                        "name": agent_name,
                        "initials": agent_initials,
                        "email": profile.agent.email or current_user.email,
                        "phone": profile.agent.phone
                    },
                    "brokerage": {
                        "name": profile.brokerage.name,
                        "address": profile.brokerage.address
                    },
                    "colors": {
                        "primary": profile.brand.primaryHex,
                        "secondary": profile.brand.secondaryHex
                    },
                    "plan": plan,
                    "show": {
                        "headerBar": is_paid_user,
                        "agentLogo": is_paid_user and bool(profile.assets.agentLogo.url),
                        "brokerLogo": is_paid_user and bool(profile.assets.brokerLogo.url),
                        "cta": plan == "PRO"
                    }
                }
        except Exception as e:
            logger.warning(f"Failed to get branding data: {e}")
            branding_data = {}
    
    # Format financial values
    def format_currency(value):
        if not value or value == '':
            return "$0"
        try:
            # Handle string values with commas
            if isinstance(value, str):
                clean_value = value.replace(',', '')
                numeric_value = float(clean_value)
            else:
                numeric_value = float(value)
            return f"${numeric_value:,.0f}"
        except:
            return "$0"
    
    def format_percent(value):
        try:
            numeric_value = float(value) if value else 0
            return f"{numeric_value:.2f}%"
        except:
            return "0.00%"
    
    # Parse inputs with proper number handling
    def parse_number(value):
        if not value or value == '':
            return 0
        try:
            if isinstance(value, str):
                clean_value = value.replace(',', '')
                return float(clean_value)
            else:
                return float(value)
        except:
            return 0
    
    # Parse property data (frontend inputs)
    home_price = parse_number(property_data.get("homePrice", ""))
    down_payment = parse_number(property_data.get("downPayment", ""))
    down_payment_type = property_data.get("downPaymentType", "dollar")
    interest_rate = parse_number(property_data.get("interestRate", ""))
    term_years = int(parse_number(property_data.get("termYears", 30)))
    property_taxes = parse_number(property_data.get("propertyTaxes", ""))
    tax_type = property_data.get("taxType", "dollar")
    insurance = parse_number(property_data.get("insurance", ""))
    pmi_rate = parse_number(property_data.get("pmiRate", ""))
    hoa_monthly = parse_number(property_data.get("hoaMonthly", ""))
    gross_monthly_income = parse_number(property_data.get("grossMonthlyIncome", ""))
    other_monthly_debt = parse_number(property_data.get("otherMonthlyDebt", ""))
    
    # Calculate down payment amount
    if down_payment_type == "percent":
        down_payment_amount = home_price * (down_payment / 100)
        down_payment_percent = down_payment
    else:
        down_payment_amount = down_payment
        down_payment_percent = (down_payment / home_price * 100) if home_price > 0 else 0
    
    # Calculate property taxes monthly
    if tax_type == "percent":
        property_taxes_annual = home_price * (property_taxes / 100)
    else:
        property_taxes_annual = property_taxes
    
    property_taxes_monthly = property_taxes_annual / 12
    insurance_monthly = insurance / 12
    
    # Get results from calculations (frontend calculation results)
    loan_amount = calculation_data.get("loanAmount", 0)
    ltv = calculation_data.get("ltv", 0)
    principal_interest = calculation_data.get("principalInterest", 0)
    pmi_monthly = calculation_data.get("pmiMonthly", 0)
    piti = calculation_data.get("piti", 0)
    dti = calculation_data.get("dti", 0)
    qualified = calculation_data.get("qualified", None)
    max_affordable_price = calculation_data.get("maxAffordablePrice", 0)
    
    # Prepare report data
    report_data = {
        "title": "Home Affordability Analysis",
        "generatedAt": datetime.now().strftime("%B %d, %Y"),
        "address": property_data.get('address', ''),
        "preparedBy": branding_data.get("agent", {}).get("name", "Real Estate Professional"),
        
        # Property Information
        "property": {
            "homePrice": format_currency(home_price),
            "homePriceRaw": home_price
        },
        
        # Loan Information
        "loan": {
            "downPayment": format_currency(down_payment_amount),
            "downPaymentPercent": format_percent(down_payment_percent),
            "loanAmount": format_currency(loan_amount),
            "interestRate": format_percent(interest_rate),
            "loanTerm": f"{term_years} years",
            "ltv": format_percent(ltv),
            "monthlyPayment": format_currency(principal_interest)
        },
        
        # Monthly Costs Breakdown
        "costs": {
            "principalInterest": format_currency(principal_interest),
            "propertyTaxes": format_currency(property_taxes_monthly),
            "insurance": format_currency(insurance_monthly),
            "pmi": format_currency(pmi_monthly) if pmi_monthly > 0 else "N/A",
            "hoa": format_currency(hoa_monthly) if hoa_monthly > 0 else "N/A",
            "totalPITI": format_currency(piti)
        },
        
        # Income & Qualification
        "qualification": {
            "grossMonthlyIncome": format_currency(gross_monthly_income),
            "otherMonthlyDebt": format_currency(other_monthly_debt),
            "totalMonthlyDebt": format_currency(piti + other_monthly_debt),
            "dti": format_percent(dti),
            "targetDti": "36.00%",
            "qualified": "Yes" if qualified else "No" if qualified is not None else "N/A",
            "maxAffordablePrice": format_currency(max_affordable_price) if max_affordable_price else "N/A"
        },
        
        # Branding
        "branding": branding_data
    }
    
    return report_data

def prepare_investor_report_data(calculation_data: dict, property_data: dict, current_user=None) -> dict:
    """Prepare comprehensive data for investor report template with all inputs, calculations, and explanations"""
    
    # Helper functions
    def format_currency(value):
        if value is None or value == 0:
            return "$0"
        if isinstance(value, str):
            try:
                value = float(value.replace(',', '').replace('$', ''))
            except ValueError:
                return "$0"
        return f"${value:,.0f}"
    
    def format_percentage(value):
        if value is None or value == 0:
            return "0.00%"
        if isinstance(value, str):
            try:
                value = float(value.replace('%', ''))
            except ValueError:
                return "0.00%"
        return f"{value:.2f}%"
    
    def safe_float(value, default=0.0):
        """Safely convert value to float"""
        if value is None or value == '':
            return default
        if isinstance(value, str):
            try:
                return float(value.replace(',', '').replace('$', '').replace('%', ''))
            except ValueError:
                return default
        return float(value)
    
    # Extract and format all property inputs
    property_address = property_data.get('address', 'Property Address')
    full_address = f"{property_address}"
    if property_data.get('city'):
        full_address += f", {property_data.get('city')}"
    if property_data.get('state'):
        full_address += f", {property_data.get('state')}"
    if property_data.get('zipCode'):
        full_address += f" {property_data.get('zipCode')}"
    
    # Financial inputs
    purchase_price = safe_float(property_data.get('purchasePrice', 0))
    down_payment = safe_float(property_data.get('downPayment', 0))
    loan_amount = safe_float(property_data.get('loanAmount', 0))
    interest_rate = safe_float(property_data.get('interestRate', 6.75))
    loan_term = safe_float(property_data.get('loanTerm', 30))
    
    # Income inputs
    monthly_rent = safe_float(property_data.get('monthlyRent', 0))
    other_monthly_income = safe_float(property_data.get('otherMonthlyIncome', 0))
    total_monthly_income = monthly_rent + other_monthly_income
    annual_rent = total_monthly_income * 12
    
    # Expense inputs
    property_taxes = safe_float(property_data.get('propertyTaxes', 0))
    insurance = safe_float(property_data.get('insurance', 0))
    maintenance = safe_float(property_data.get('repairReserves', 0))
    vacancy_allowance = safe_float(property_data.get('vacancyAllowance', 0))
    property_management = safe_float(property_data.get('propertyManagement', 0))
    
    # Additional property details
    square_footage = safe_float(property_data.get('squareFootage', 0))
    year_built = property_data.get('yearBuilt', '')
    property_type = property_data.get('propertyType', 'Single Family')
    bedrooms = property_data.get('bedrooms', '')
    bathrooms = property_data.get('bathrooms', '')
    
    # Calculate key metrics
    total_monthly_expenses = (property_taxes + insurance + maintenance + vacancy_allowance + property_management) / 12
    monthly_mortgage_payment = safe_float(calculation_data.get('monthlyPayment') or calculation_data.get('monthlyMortgage', 0))
    monthly_noi = total_monthly_income - total_monthly_expenses
    monthly_cash_flow = monthly_noi - monthly_mortgage_payment
    annual_noi = monthly_noi * 12
    annual_cash_flow = monthly_cash_flow * 12
    
    # Cash invested calculation
    cash_invested = down_payment + safe_float(property_data.get('closingCosts', purchase_price * 0.03))
    
    # Key performance metrics
    cap_rate = (annual_noi / purchase_price * 100) if purchase_price > 0 else 0
    cash_on_cash = (annual_cash_flow / cash_invested * 100) if cash_invested > 0 else 0
    
    # DSCR calculation (simplified)
    annual_debt_service = monthly_mortgage_payment * 12
    dscr = (annual_noi / annual_debt_service) if annual_debt_service > 0 else 0
    
    # 1% rule and 2% rule
    one_percent_rule = (monthly_rent / purchase_price * 100) if purchase_price > 0 else 0
    
    return {
        "generatedAt": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
        "preparedBy": current_user.full_name if current_user else "Real Estate Professional",
        "isPro": current_user and current_user.plan.value in ["STARTER", "PRO"] if current_user else False,
        
        # Property Information Section
        "property": {
            "addressLine": full_address,
            "propertyType": property_type,
            "yearBuilt": year_built,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "squareFootage": f"{square_footage:,.0f}" if square_footage > 0 else "Not specified"
        },
        
        # Purchase Information Section
        "purchase": {
            "purchasePrice": format_currency(purchase_price),
            "downPayment": format_currency(down_payment),
            "downPaymentPercent": f"{(down_payment/purchase_price*100):.1f}%" if purchase_price > 0 else "0%",
            "loanAmount": format_currency(loan_amount),
            "interestRate": f"{interest_rate:.2f}%",
            "loanTerm": f"{loan_term:.0f} years",
            "monthlyPayment": format_currency(monthly_mortgage_payment),
            "cashInvested": format_currency(cash_invested)
        },
        
        # Income Analysis Section
        "income": {
            "monthlyRent": format_currency(monthly_rent),
            "otherIncome": format_currency(other_monthly_income),
            "totalMonthlyIncome": format_currency(total_monthly_income),
            "annualIncome": format_currency(annual_rent)
        },
        
        # Expense Analysis Section  
        "expenses": {
            "propertyTaxes": format_currency(property_taxes),
            "insurance": format_currency(insurance),
            "maintenance": format_currency(maintenance),
            "vacancyAllowance": format_currency(vacancy_allowance),
            "propertyManagement": format_currency(property_management),
            "totalAnnualExpenses": format_currency(property_taxes + insurance + maintenance + vacancy_allowance + property_management),
            "totalMonthlyExpenses": format_currency(total_monthly_expenses)
        },
        
        # Cash Flow Analysis Section
        "cashFlow": {
            "monthlyNOI": format_currency(monthly_noi),
            "annualNOI": format_currency(annual_noi),
            "monthlyCashFlow": format_currency(monthly_cash_flow),
            "annualCashFlow": format_currency(annual_cash_flow),
            "isPositive": monthly_cash_flow > 0
        },
        
        # Key Performance Metrics (simplified for template)
        "metrics": {
            "capRate": format_percentage(cap_rate),
            "cashOnCash": format_percentage(cash_on_cash),
            "dscr": f"{dscr:.2f}",
            "onePercentRule": format_percentage(one_percent_rule)
        },
        
        # Investment Summary & Analysis
        "analysis": {
            "summary": monthly_cash_flow > 0 and cap_rate > 5,
            "cashFlowStatus": "positive" if monthly_cash_flow > 0 else "negative",
            "capRateGrade": "excellent" if cap_rate > 8 else "good" if cap_rate > 6 else "fair" if cap_rate > 4 else "poor",
            "dscrStatus": "strong" if dscr > 1.25 else "adequate" if dscr > 1.0 else "weak",
            "onePercentStatus": one_percent_rule >= 1.0
        },
        
        # Plain-Speak Definitions
        "definitions": [
            {
                "term": "Cap Rate (Capitalization Rate)",
                "definition": "The annual return on investment you'd get if you bought the property with all cash. Higher cap rates generally mean better returns, but also potentially higher risk."
            },
            {
                "term": "Cash-on-Cash Return", 
                "definition": "The annual return on the actual cash you invested (down payment + closing costs). This accounts for loan benefits and is often more relevant than cap rate for leveraged purchases."
            },
            {
                "term": "NOI (Net Operating Income)",
                "definition": "The property's annual income after operating expenses but before mortgage payments and taxes. This is the core income the property generates."
            },
            {
                "term": "DSCR (Debt Service Coverage Ratio)",
                "definition": "Measures whether the property generates enough income to comfortably cover its mortgage payments. Above 1.2 is generally considered safe."
            },
            {
                "term": "Cash Flow",
                "definition": "The money left over each month after all expenses including mortgage payments. Positive cash flow means the property pays for itself plus extra."
            },
            {
                "term": "1% Rule",
                "definition": "A quick screening tool: monthly rent should be at least 1% of the purchase price. Properties that meet this often have better cash flow potential."
            }
        ],
        
        # Investment Recommendation
        "recommendation": {
            "isRecommended": monthly_cash_flow > 0 and cap_rate > 5 and dscr > 1.0,
            "summary": f"This property shows a {cap_rate:.1f}% cap rate with {format_currency(monthly_cash_flow)} monthly cash flow.",
            "strengths": [],
            "concerns": [],
            "bottomLine": ""
        }
    }

def prepare_commission_split_report_data(calculation_data: dict, property_data: dict, current_user=None) -> dict:
    """Prepare data for commission split report template"""
    
    # Debug logging
    logger.info(f"prepare_commission_split_report_data called with:")
    logger.info(f"  calculation_data: {calculation_data}")
    logger.info(f"  property_data: {property_data}")
    
    def format_currency(value):
        if value is None or value == 0:
            return "$0"
        try:
            if isinstance(value, str):
                value = float(value.replace(',', '').replace('$', ''))
            return f"${value:,.0f}"
        except:
            return "$0"
    
    def format_percentage(value):
        try:
            numeric_value = float(value) if value else 0
            return f"{numeric_value:.1f}%"
        except:
            return "0.0%"
    
    def safe_float(value, default=0.0):
        if value is None or value == '':
            return default
        try:
            if isinstance(value, str):
                return float(value.replace(',', '').replace('$', '').replace('%', ''))
            return float(value)
        except:
            return default
    
    # Extract data from frontend inputs (property_data)
    sale_price = safe_float(property_data.get('salePrice', 0))
    commission_percent = safe_float(property_data.get('totalCommission', 0))
    your_side = property_data.get('yourSide', 'listing')
    brokerage_split = safe_float(property_data.get('brokerageSplit', 0))
    referral_percent = safe_float(property_data.get('referralPercent', 0))
    team_percent = safe_float(property_data.get('teamPercent', 0))
    transaction_fee = safe_float(property_data.get('transactionFee', 0))
    royalty_fee = safe_float(property_data.get('royaltyFee', 0))
    
    # Extract calculated results (calculation_data)
    gci = safe_float(calculation_data.get('gci', 0))
    side_gci = safe_float(calculation_data.get('sideGCI', 0))
    agent_gross = safe_float(calculation_data.get('agentGrossBeforeFees', 0))
    referral_amount = safe_float(calculation_data.get('referralAmount', 0))
    team_amount = safe_float(calculation_data.get('teamAmount', 0))
    fixed_fees = safe_float(calculation_data.get('fixedFees', 0))
    final_take_home = safe_float(calculation_data.get('agentTakeHome', 0))
    effective_rate = safe_float(calculation_data.get('effectiveCommissionRate', 0))
    
    # Format side description
    side_descriptions = {
        'listing': 'Listing Side (50%)',
        'buyer': 'Buyer Side (50%)', 
        'dual': 'Dual Agency (100%)'
    }
    
    return {
        "title": "Commission Split Analysis",
        "generatedAt": datetime.now().strftime("%B %d, %Y"),
        "preparedBy": current_user.full_name if current_user else "Real Estate Professional",
        "address": property_data.get('address', ''),
        
        # Property and Commission Info
        "salePrice": format_currency(sale_price),
        "commissionRate": format_percentage(commission_percent),
        "yourSide": side_descriptions.get(your_side, your_side.title()),
        "brokeragePercent": format_percentage(brokerage_split),
        "agentPercent": format_percentage(100 - brokerage_split),
        
        # Results
        "totalCommission": format_currency(gci),
        "sideGCI": format_currency(side_gci),
        "agentGross": format_currency(agent_gross),
        "brokerFee": format_currency(agent_gross - (agent_gross * (brokerage_split / 100))),
        "referralAmount": format_currency(referral_amount),
        "teamAmount": format_currency(team_amount),
        "transactionFee": format_currency(transaction_fee),
        "royaltyFee": format_currency(royalty_fee),
        "totalDeductions": format_currency(referral_amount + team_amount + fixed_fees),
        "finalTakeHome": format_currency(final_take_home),
        "effectiveRate": format_percentage(effective_rate),
        
        # Split percentages
        "referralPercent": format_percentage(referral_percent),
        "teamPercent": format_percentage(team_percent),
        
        # Conditional fields for template
        "hasReferral": referral_amount > 0,
        "hasTeam": team_amount > 0,
        "hasTransactionFee": transaction_fee > 0,
        "hasRoyaltyFee": royalty_fee > 0,
        
        # Additional metrics
        "dollarsPerPercent": format_currency(sale_price / 100) if sale_price > 0 else "$0",
        "efficiency": format_percentage((final_take_home / gci * 100) if gci > 0 else 0)
    }

def prepare_seller_net_sheet_report_data(calculation_data: dict, property_data: dict, current_user=None) -> dict:
    """Prepare data for seller net sheet report template"""
    
    def format_currency(value):
        if value is None or value == 0:
            return "$0"
        try:
            if isinstance(value, str):
                value = float(value.replace(',', '').replace('$', ''))
            return f"${value:,.0f}"
        except:
            return "$0"
    
    def format_percentage(value):
        try:
            numeric_value = float(value) if value else 0
            return f"{numeric_value:.2f}%"
        except:
            return "0.00%"
    
    def safe_float(value, default=0.0):
        if value is None or value == '':
            return default
        try:
            if isinstance(value, str):
                return float(value.replace(',', '').replace('$', '').replace('%', ''))
            return float(value)
        except:
            return default
    
    # Extract data from frontend inputs (property_data) - using actual field names
    sale_price = safe_float(property_data.get('expectedSalePrice', 0))
    first_payoff = safe_float(property_data.get('firstPayoff', 0))
    second_payoff = safe_float(property_data.get('secondPayoff', 0))
    commission_rate = safe_float(property_data.get('totalCommission', 0))
    seller_concessions = safe_float(property_data.get('sellerConcessions', 0))
    title_escrow_fee = safe_float(property_data.get('titleEscrowFee', 0))
    recording_fee = safe_float(property_data.get('recordingFee', 0))
    transfer_tax = safe_float(property_data.get('transferTax', 0))
    doc_stamps = safe_float(property_data.get('docStamps', 0))
    hoa_fees = safe_float(property_data.get('hoaFees', 0))
    staging_photography = safe_float(property_data.get('stagingPhotography', 0))
    other_costs = safe_float(property_data.get('otherCosts', 0))
    prorated_taxes = safe_float(property_data.get('proratedTaxes', 0))
    
    # Extract calculated results (calculation_data)
    estimated_net = safe_float(calculation_data.get('estimatedSellerNet', 0))
    total_deductions = safe_float(calculation_data.get('totalDeductions', 0))
    commission_amount = safe_float(calculation_data.get('commissionAmount', 0))
    concessions_amount = safe_float(calculation_data.get('concessionsAmount', 0))
    closing_costs = safe_float(calculation_data.get('closingCosts', 0))
    total_payoffs = safe_float(calculation_data.get('totalPayoffs', 0))
    net_percentage = safe_float(calculation_data.get('netAsPercentOfSale', 0))
    
    return {
        "title": "Seller Net Sheet Analysis",
        "generatedAt": datetime.now().strftime("%B %d, %Y"),
        "address": property_data.get('address', ''),
        "preparedBy": current_user.full_name if current_user else "Real Estate Professional",
        
        # Property and Sale Info
        "salePrice": format_currency(sale_price),
        "commissionRate": format_percentage(commission_rate),
        "commissionAmount": format_currency(commission_amount),
        
        # Loan Information
        "firstPayoff": format_currency(first_payoff),
        "secondPayoff": format_currency(second_payoff),
        "totalPayoffs": format_currency(total_payoffs),
        
        # Concessions
        "concessionsAmount": format_currency(concessions_amount),
        
        # Closing Costs Breakdown
        "titleEscrowFee": format_currency(title_escrow_fee),
        "recordingFee": format_currency(recording_fee),
        "transferTax": format_currency(transfer_tax),
        "docStamps": format_currency(doc_stamps),
        "hoaFees": format_currency(hoa_fees),
        "stagingPhotography": format_currency(staging_photography),
        "otherCosts": format_currency(other_costs),
        "proratedTaxes": format_currency(prorated_taxes),
        
        # Totals
        "totalDeductions": format_currency(total_deductions),
        "estimatedNet": format_currency(estimated_net),
        "netPercentage": format_percentage(net_percentage),
        
        # Conditional fields for template
        "hasFirstPayoff": first_payoff > 0,
        "hasSecondPayoff": second_payoff > 0,
        "hasConcessions": concessions_amount > 0,
        "hasDocStamps": doc_stamps > 0,
        "hasHOAFees": hoa_fees > 0,
        "hasStagingPhotography": staging_photography > 0,
        "hasOtherCosts": other_costs > 0,
        "hasProratedTaxes": prorated_taxes > 0,
        
        # Summary metrics
        "isPositiveNet": estimated_net > 0,
        "costEfficiency": format_percentage(((sale_price - total_deductions) / sale_price * 100) if sale_price > 0 else 0)
    }

def prepare_closing_date_report_data(calculation_data: dict, property_data: dict, current_user=None) -> dict:
    """Prepare data for closing date report template"""
    
    def format_date(date_str):
        if not date_str:
            return "TBD"
        try:
            if isinstance(date_str, str):
                # Parse ISO date string
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                return date_obj.strftime("%B %d, %Y")
        except:
            return date_str
    
    def calculate_days_between(start_date, end_date):
        try:
            if not start_date or not end_date:
                return 0
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            return (end - start).days
        except:
            return 0
    
    def get_status_class(status):
        status_map = {
            'completed': 'status-completed',
            'upcoming': 'status-upcoming', 
            'overdue': 'status-overdue'
        }
        return status_map.get(status, 'status-upcoming')
    
    # Extract data from inputs (property_data)
    property_address = property_data.get('address', 'Property Address')
    contract_date = property_data.get('underContractDate', '')
    closing_date = property_data.get('closingDate', '')
    loan_type = property_data.get('loanType', 'Conventional')
    is_cash = property_data.get('isCashPurchase', False)
    
    # Extract timeline from calculation data
    timeline = calculation_data.get('timeline', [])
    timeline_length = calculate_days_between(contract_date, closing_date)
    
    # Generate timeline table HTML (excluding past-due items)
    timeline_table_html = ""
    if timeline:
        for milestone in timeline:
            name = milestone.get('name', '')
            description = milestone.get('description', '')
            date = format_date(milestone.get('date', ''))
            status = milestone.get('status', 'upcoming')
            agent_note = milestone.get('agentNote', '')
            
            # Skip past-due items - only include upcoming and current items
            if status in ['past-due', 'overdue']:
                continue
            
            timeline_table_html += f"""
            <tr>
                <td class="font-bold">{name}</td>
                <td>{description}</td>
                <td class="date-col">{date}</td>
                <td class="text-right">
                    <span class="{get_status_class(status)}">{status.title()}</span>
                </td>
            </tr>"""
            
            if agent_note:
                timeline_table_html += f"""
                <tr>
                    <td colspan="4" style="padding-left: 20px; font-style: italic; color: #2563eb; font-size: 11px;">
                        Agent Note: "{agent_note}"
                    </td>
                </tr>"""
    
    # Generate visual timeline section HTML - REMOVED as requested
    visual_timeline_section = ""
    logger.info(f"Visual Timeline Overview section removed from PDF as requested")
    
    # Calculate counts excluding past-due items
    active_timeline = [item for item in timeline if item.get('status', 'upcoming') not in ['past-due', 'overdue']]
    critical_count = sum(1 for item in active_timeline if 'inspection' in item.get('name', '').lower() or 
                        'appraisal' in item.get('name', '').lower() or 
                        'loan' in item.get('name', '').lower())
    
    return {
        "title": "Home Purchase Timeline",
        "generatedAt": datetime.now().strftime("%B %d, %Y"),
        "preparedBy": current_user.full_name if current_user else "Real Estate Professional",
        
        # Property and Transaction Info
        "propertyAddress": property_address,
        "contractDate": format_date(contract_date),
        "closingDate": format_date(closing_date),
        "loanType": loan_type,
        "purchaseType": "Cash Purchase" if is_cash else "Financed Purchase",
        
        # Timeline Summary
        "timelineLength": str(timeline_length) if timeline_length >= 0 else "0",
        "milestoneCount": str(len(active_timeline)),
        "criticalCount": str(critical_count),
        "timelineStatus": "On Track" if timeline_length > 0 and timeline_length <= 45 else "Extended Timeline",
        
        # Timeline HTML sections
        "timelineTableRows": timeline_table_html,
        "visualTimelineSection": visual_timeline_section,
        
        # Additional data
        "hasTimeline": len(timeline) > 0
    }

def generate_income_table(calculation_data: dict, property_data: dict) -> str:
    """Generate HTML table for income analysis"""
    
    def format_currency(value):
        if value is None or value == 0:
            return "$0"
        # Convert to float if it's a string
        if isinstance(value, str):
            try:
                value = float(value)
            except ValueError:
                return "$0"
        return f"${value:,.0f}"
    
    def safe_float(value, default=0.0):
        """Safely convert value to float"""
        if value is None or value == '':
            return default
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return default
        return float(value)
    
    monthly_rent = safe_float(property_data.get('monthlyRent', 0))
    annual_rent = monthly_rent * 12
    vacancy_rate = 0.05  # 5% default vacancy
    effective_gross_income = annual_rent * (1 - vacancy_rate)
    
    html = f"""
    <table class="table">
        <thead>
            <tr>
                <th>Income Source</th>
                <th class="table-right">Monthly</th>
                <th class="table-right">Annual</th>
            </tr>
        </thead>
        <tbody>
            <tr class="income-positive">
                <td><strong>Gross Rental Income</strong></td>
                <td class="table-right">{format_currency(monthly_rent)}</td>
                <td class="table-right">{format_currency(annual_rent)}</td>
            </tr>
            <tr class="income-negative">
                <td>Vacancy &amp; Collection Loss (5%)</td>
                <td class="table-right">-{format_currency(monthly_rent * vacancy_rate)}</td>
                <td class="table-right">-{format_currency(annual_rent * vacancy_rate)}</td>
            </tr>
            <tr class="income-total">
                <td><strong>Effective Gross Income</strong></td>
                <td class="table-right"><strong>{format_currency(effective_gross_income / 12)}</strong></td>
                <td class="table-right"><strong>{format_currency(effective_gross_income)}</strong></td>
            </tr>
        </tbody>
    </table>
    """
    
    return html

def generate_cashflow_table(calculation_data: dict, property_data: dict) -> str:
    """Generate HTML table for cash flow analysis"""
    
    def format_currency(value):
        if value is None or value == 0:
            return "$0"
        # Convert to float if it's a string
        if isinstance(value, str):
            try:
                value = float(value)
            except ValueError:
                return "$0"
        return f"${value:,.0f}"
    
    def safe_float(value, default=0.0):
        """Safely convert value to float"""
        if value is None or value == '':
            return default
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return default
        return float(value)
    
    effective_gross_income = safe_float(calculation_data.get('effectiveGrossIncome', 0))
    operating_expenses = safe_float(calculation_data.get('operatingExpenses', 0))
    noi = safe_float(calculation_data.get('noi', 0))
    monthly_mortgage = safe_float(calculation_data.get('monthlyMortgage', 0))
    annual_debt_service = monthly_mortgage * 12
    annual_cash_flow = safe_float(calculation_data.get('annualCashFlow', 0))
    
    html = f"""
    <table class="table">
        <thead>
            <tr>
                <th>Cash Flow Item</th>
                <th class="table-right">Annual Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr class="income-positive">
                <td><strong>Effective Gross Income</strong></td>
                <td class="table-right">{format_currency(effective_gross_income)}</td>
            </tr>
            <tr class="income-negative">
                <td>Operating Expenses</td>
                <td class="table-right">-{format_currency(operating_expenses)}</td>
            </tr>
            <tr class="income-total">
                <td><strong>Net Operating Income (NOI)</strong></td>
                <td class="table-right"><strong>{format_currency(noi)}</strong></td>
            </tr>
            <tr class="income-negative">
                <td>Annual Debt Service</td>
                <td class="table-right">-{format_currency(annual_debt_service)}</td>
            </tr>
            <tr class="income-total" style="background-color: #f0fdf4; border-color: #16a34a;">
                <td><strong>Annual Cash Flow</strong></td>
                <td class="table-right"><strong style="color: #16a34a;">{format_currency(annual_cash_flow)}</strong></td>
            </tr>
        </tbody>
    </table>
    <div style="text-align: center; margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 8px;">
        <div style="font-size: 16px; color: #111827;"><strong>Monthly Cash Flow: {format_currency(annual_cash_flow / 12 if annual_cash_flow != 0 else 0)}</strong></div>
    </div>
    """
    
    return html

def generate_summary_table(calculation_data: dict, property_data: dict) -> str:
    """Generate HTML table for investment summary"""
    
    def format_currency(value):
        if value is None or value == 0:
            return "$0"
        # Convert to float if it's a string
        if isinstance(value, str):
            try:
                value = float(value)
            except ValueError:
                return "$0"
        return f"${value:,.0f}"
    
    def format_percentage(value):
        if value is None or value == 0:
            return "0.00%"
        # Convert to float if it's a string
        if isinstance(value, str):
            try:
                value = float(value)
            except ValueError:
                return "0.00%"
        return f"{value:.2f}%"
    
    def safe_float(value, default=0.0):
        """Safely convert value to float"""
        if value is None or value == '':
            return default
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return default
        return float(value)
    
    purchase_price = safe_float(property_data.get('purchasePrice', 0))
    down_payment = safe_float(property_data.get('downPayment', 0))
    down_payment_pct = (down_payment / purchase_price * 100) if purchase_price > 0 else 0
    closing_costs = purchase_price * 0.03  # Estimate 3% closing costs
    total_cash_needed = safe_float(calculation_data.get('cashInvested', 0))
    
    html = f"""
    <div class="two-col">
        <div>
            <h4 style="font-weight: 700; font-size: 18px; margin-bottom: 16px; color: #111827;">Purchase Details</h4>
            <table class="table">
                <tbody>
                    <tr>
                        <td>Purchase Price</td>
                        <td class="table-right">{format_currency(purchase_price)}</td>
                    </tr>
                    <tr>
                        <td>Down Payment ({down_payment_pct:.1f}%)</td>
                        <td class="table-right">{format_currency(down_payment)}</td>
                    </tr>
                    <tr>
                        <td>Closing Costs (est.)</td>
                        <td class="table-right">{format_currency(closing_costs)}</td>
                    </tr>
                    <tr class="income-total">
                        <td><strong>Total Cash Required</strong></td>
                        <td class="table-right"><strong>{format_currency(total_cash_needed)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div>
            <h4 style="font-weight: 700; font-size: 18px; margin-bottom: 16px; color: #111827;">Key Ratios</h4>
            <table class="table">
                <tbody>
                    <tr>
                        <td>Cap Rate</td>
                        <td class="table-right">{format_percentage(safe_float(calculation_data.get('capRate', 0)))}</td>
                    </tr>
                    <tr>
                        <td>Cash-on-Cash Return</td>
                        <td class="table-right">{format_percentage(safe_float(calculation_data.get('cashOnCash', 0)))}</td>
                    </tr>
                    <tr>
                        <td>DSCR</td>
                        <td class="table-right">{safe_float(calculation_data.get('dscr', 0)):.2f}</td>
                    </tr>
                    <tr>
                        <td>IRR (5 yr)</td>
                        <td class="table-right">{format_percentage(safe_float(calculation_data.get('irrPercent', 0)))}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    """
    
    return html

# PDF Generation Routes
@api_router.post("/reports/{tool}/preview")
async def get_report_preview(tool: str, request: Request, current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Render the report preview page using the golden template
    """
    try:
        # Get calculation data from request body
        body = await request.json()
        calculation_data = body.get('calculation_data', {})
        property_data = body.get('property_data', {})
        
        if not calculation_data or not property_data:
            raise HTTPException(status_code=400, detail="Calculation data and property data required")
        
        # Load comprehensive template
        template_path = Path(__file__).parent / "templates" / "investor_report_comprehensive.html"
        if not template_path.exists():
            raise HTTPException(status_code=500, detail="Report template not found")
        
        template_content = template_path.read_text(encoding='utf-8')
        
        # Prepare data for template
        if tool == "investor":
            # Get branding data for PDF
            branding_data = {}  # Branding disabled
            
            report_data = prepare_investor_report_data(calculation_data, property_data, current_user)
        elif tool == "affordability":
            # Load affordability template instead of investor template
            template_path = Path(__file__).parent / "templates" / "affordability_report.html"
            if not template_path.exists():
                raise HTTPException(status_code=500, detail="Affordability template not found")
            template_content = template_path.read_text(encoding='utf-8')
            
            # Get branding data for affordability PDF
            branding_data = {}  # Branding disabled
            
            report_data = await prepare_affordability_report_data_generic(calculation_data, property_data, current_user)
        elif tool == "commission":
            # Load commission split template
            template_path = Path(__file__).parent / "templates" / "commission_split_report.html"
            if not template_path.exists():
                raise HTTPException(status_code=500, detail="Commission split template not found")
            template_content = template_path.read_text(encoding='utf-8')
            
            # Get branding data for commission split PDF
            branding_data = {}  # Branding disabled
            
            report_data = prepare_commission_split_report_data(calculation_data, property_data, current_user)
        else:
            raise HTTPException(status_code=404, detail="Tool not supported")
        
        # Render template
        html_content = render_template(template_content, report_data)
        
        return Response(content=html_content, media_type="text/html")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report preview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/reports/{tool}/pdf")
async def generate_pdf(tool: str, request: Request, current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Generate PDF using WeasyPrint from the golden template
    """
    try:
        # Get calculation data from request body  
        body = await request.json()
        calculation_data = body.get('calculation_data', {})
        property_data = body.get('property_data', {})
        
        if not calculation_data or not property_data:
            raise HTTPException(status_code=400, detail="Calculation data and property data required")
        
        # Load comprehensive template
        template_path = Path(__file__).parent / "templates" / "investor_report_comprehensive.html"
        if not template_path.exists():
            raise HTTPException(status_code=500, detail="Report template not found")
        
        template_content = template_path.read_text(encoding='utf-8')
        
        # Prepare data for template
        if tool == "investor":
            # Get branding data for PDF
            branding_data = {}  # Branding disabled
            
            report_data = prepare_investor_report_data(calculation_data, property_data, current_user)
        elif tool == "affordability":
            # Load affordability template instead of investor template
            template_path = Path(__file__).parent / "templates" / "affordability_report.html"
            if not template_path.exists():
                raise HTTPException(status_code=500, detail="Affordability template not found")
            template_content = template_path.read_text(encoding='utf-8')
            
            # Get branding data for affordability PDF
            branding_data = {}  # Branding disabled
            
            report_data = await prepare_affordability_report_data_generic(calculation_data, property_data, current_user)
        elif tool == "commission":
            # Load commission split template
            template_path = Path(__file__).parent / "templates" / "commission_split_report.html"
            if not template_path.exists():
                raise HTTPException(status_code=500, detail="Commission split template not found")
            template_content = template_path.read_text(encoding='utf-8')
            
            # Get branding data for commission split PDF
            branding_data = {}  # Branding disabled
            
            report_data = prepare_commission_split_report_data(calculation_data, property_data, current_user)
            
            # Debug logging for commission PDF
            logger.info(f"Commission PDF - calculation_data: {calculation_data}")
            logger.info(f"Commission PDF - property_data: {property_data}")
            logger.info(f"Commission PDF - report_data keys: {list(report_data.keys())}")
            logger.info(f"Commission PDF - salePrice: {report_data.get('salePrice', 'MISSING')}")
            logger.info(f"Commission PDF - finalTakeHome: {report_data.get('finalTakeHome', 'MISSING')}")
        elif tool == "seller-net":
            # Load seller net sheet template
            template_path = Path(__file__).parent / "templates" / "seller_net_sheet_report.html"
            if not template_path.exists():
                raise HTTPException(status_code=500, detail="Seller net sheet template not found")
            template_content = template_path.read_text(encoding='utf-8')
            
            # Get branding data for seller net sheet PDF
            branding_data = {}  # Branding disabled
            
            report_data = prepare_seller_net_sheet_report_data(calculation_data, property_data, current_user)
            
            # Pre-compute brand colors for template (avoids Jinja2 # character issues)
            primary_color = branding_data.get("colors", {}).get("primary", "#10b981")
            report_data["brandPrimaryColor"] = primary_color
            report_data["brandPrimaryDark"] = primary_color + "dd" if primary_color else "#15803ddd"
            report_data["agentLogoUrl"] = branding_data.get("assets", {}).get("agentLogoUrl", "")
        elif tool == "closing-date":
            # Load closing date timeline template
            template_path = Path(__file__).parent / "templates" / "closing_date_report.html"
            if not template_path.exists():
                raise HTTPException(status_code=500, detail="Closing date template not found")
            template_content = template_path.read_text(encoding='utf-8')
            
            # Get branding data for closing date PDF
            branding_data = {}  # Branding disabled
            
            print(f"🔍 DEBUG: Closing Date PDF - Data received: calculation_data keys: {list(calculation_data.keys()) if calculation_data else 'None'}")
            print(f"🔍 DEBUG: Closing Date PDF - Timeline length: {len(calculation_data.get('timeline', [])) if calculation_data else 0}")
            logger.info(f"Closing Date PDF - Data received: calculation_data keys: {list(calculation_data.keys()) if calculation_data else 'None'}")
            logger.info(f"Closing Date PDF - Timeline length: {len(calculation_data.get('timeline', [])) if calculation_data else 0}")
            if calculation_data and calculation_data.get('timeline'):
                print(f"🔍 DEBUG: Closing Date PDF - First timeline item: {calculation_data['timeline'][0] if calculation_data['timeline'] else 'Empty'}")
                logger.info(f"Closing Date PDF - First timeline item: {calculation_data['timeline'][0] if calculation_data['timeline'] else 'Empty'}")
            
            report_data = prepare_closing_date_report_data(calculation_data, property_data, current_user)
            
            print(f"🔍 DEBUG: Closing Date PDF - Timeline HTML length: {len(report_data.get('timelineTableRows', ''))}")
            print(f"🔍 DEBUG: Closing Date PDF - Visual timeline HTML length: {len(report_data.get('visualTimelineSection', ''))}")
            print(f"🔍 DEBUG: Closing Date PDF - Report data keys: {list(report_data.keys())}")
            print(f"🔍 DEBUG: Closing Date PDF - Timeline table rows sample: {report_data.get('timelineTableRows', '')[:200]}...")
            print(f"🔍 DEBUG: Closing Date PDF - Visual timeline section sample: {report_data.get('visualTimelineSection', '')[:200]}...")
            logger.info(f"Closing Date PDF - Timeline HTML length: {len(report_data.get('timelineTableRows', ''))}")
            logger.info(f"Closing Date PDF - Visual timeline HTML length: {len(report_data.get('visualTimelineSection', ''))}")
            logger.info(f"Closing Date PDF - Report data keys: {list(report_data.keys())}")
            logger.info(f"Closing Date PDF - Timeline table rows sample: {report_data.get('timelineTableRows', '')[:200]}...")
            logger.info(f"Closing Date PDF - Visual timeline section sample: {report_data.get('visualTimelineSection', '')[:200]}...")
        else:
            raise HTTPException(status_code=404, detail="Tool not supported")
        
        # Render template
        logger.info(f"Rendering template for tool: {tool}")
        logger.info(f"Template content length: {len(template_content)}")
        html_content = render_template(template_content, report_data)
        logger.info(f"Rendered HTML length: {len(html_content)}")
        
        # Check if template variables are still present
        if "{{" in html_content:
            logger.error(f"Template variables still present in rendered HTML!")
            vars_found = re.findall(r'\{\{[^}]+\}\}', html_content)
            logger.error(f"Template variables found: {vars_found[:10]}")
        else:
            logger.info(f"Template rendering successful, no variables remaining")
        
        # Generate PDF using WeasyPrint
        pdf_buffer = await generate_pdf_with_weasyprint_from_html(html_content)
        
        # Generate filename based on tool type
        if tool == "affordability":
            home_price = property_data.get('homePrice', 'Unknown')
            date_str = datetime.now().strftime('%Y-%m-%d')
            filename = f"affordability_analysis_{home_price}_{date_str}.pdf"
        elif tool == "commission":
            sale_price = calculation_data.get('salePrice', 'Unknown')
            date_str = datetime.now().strftime('%Y-%m-%d')
            filename = f"commission_split_{sale_price}_{date_str}.pdf"
        elif tool == "seller-net":
            sale_price = property_data.get('salePrice', 'Unknown')
            date_str = datetime.now().strftime('%Y-%m-%d')
            filename = f"seller_net_sheet_{sale_price}_{date_str}.pdf"
        elif tool == "closing-date":
            closing_date = property_data.get('closingDate', 'Unknown')
            date_str = datetime.now().strftime('%Y-%m-%d')
            # Clean the closing date for filename
            clean_closing = closing_date.replace('/', '-').replace(' ', '_') if closing_date != 'Unknown' else 'Unknown'
            filename = f"closing_timeline_{clean_closing}_{date_str}.pdf"
        else:  # investor
            property_address = property_data.get('address', 'Property')
            date_str = datetime.now().strftime('%Y-%m-%d')
            clean_address = re.sub(r'[^\w\s-]', '', property_address).replace(' ', '_')
            filename = f"investor_{clean_address}_{date_str}.pdf"
        
        # Return PDF response
        return Response(
            content=pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Cache-Control": "no-cache"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/reports/{tool}/debug")
async def debug_report(tool: str, request: Request, current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Debug route to verify HTML, CSS, and fonts are properly embedded
    """
    try:
        # Get calculation data from request body
        body = await request.json()
        calculation_data = body.get('calculation_data', {})
        property_data = body.get('property_data', {})
        
        if not calculation_data or not property_data:
            raise HTTPException(status_code=400, detail="Calculation data and property data required")
        
        # Load comprehensive template
        template_path = Path(__file__).parent / "templates" / "investor_report_comprehensive.html"
        if not template_path.exists():
            raise HTTPException(status_code=500, detail="Report template not found")
        
        template_content = template_path.read_text(encoding='utf-8')
        
        # Prepare data for template
        if tool == "investor":
            # Get branding data for PDF
            branding_data = {}  # Branding disabled
            
            report_data = prepare_investor_report_data(calculation_data, property_data, current_user)
        elif tool == "affordability":
            # Load affordability template instead of investor template
            template_path = Path(__file__).parent / "templates" / "affordability_report.html"
            if not template_path.exists():
                raise HTTPException(status_code=500, detail="Affordability template not found")
            template_content = template_path.read_text(encoding='utf-8')
            
            # Get branding data for affordability PDF
            branding_data = {}  # Branding disabled
            
            report_data = await prepare_affordability_report_data_generic(calculation_data, property_data, current_user)
        else:
            raise HTTPException(status_code=404, detail="Tool not supported")
        
        # Render template
        html_content = render_template(template_content, report_data)
        
        # Debug analysis
        debug_info = {
            "html_length": len(html_content),
            "first_500_chars": html_content[:500],
            "has_style_block": "<style>" in html_content and "</style>" in html_content,
            "has_embedded_fonts": "data:font/woff2;base64" in html_content,
            "style_block_size": 0,
            "font_count": 0,
            "template_tokens_found": [],
            "css_classes_found": []
        }
        
        # Extract style block
        if debug_info["has_style_block"]:
            style_start = html_content.find("<style>")
            style_end = html_content.find("</style>") + 8
            if style_start != -1 and style_end != -1:
                style_block = html_content[style_start:style_end]
                debug_info["style_block_size"] = len(style_block)
                
                # Count fonts
                debug_info["font_count"] = style_block.count("@font-face")
                
                # Find CSS classes
                classes = re.findall(r'\.([a-zA-Z][a-zA-Z0-9_-]*)', style_block)
                debug_info["css_classes_found"] = list(set(classes))[:20]  # First 20 unique classes
        
        # Check for template tokens that might not have been rendered
        template_tokens = re.findall(r'\{\{[^}]*\}\}', html_content)
        debug_info["template_tokens_found"] = template_tokens[:10]  # First 10 unrendered tokens
        
        return {
            "status": "debug_complete",
            "tool": tool,
            "debug_info": debug_info,
            "template_path": str(template_path),
            "template_exists": template_path.exists()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in debug route: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_pdf_with_weasyprint_from_html(html_content: str) -> bytes:
    """
    Generate PDF from HTML using Playwright (maintains original HTML/CSS design)
    
    Emergent platform requires pure-Python solutions.
    Using Playwright with explicit browser path to render beautiful PDFs from HTML/CSS.
    """
    try:
        from playwright.async_api import async_playwright
        import os
        
        logger.info("Generating PDF using Playwright with HTML/CSS rendering")
        
        # Set browser path to the installed location
        os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/pw-browsers'
        
        async with async_playwright() as p:
            # Launch browser with explicit executable path
            browser = await p.chromium.launch(
                headless=True,
                executable_path='/pw-browsers/chromium_headless_shell-1187/chrome-linux/headless_shell'
            )
            page = await browser.new_page()
            
            # Set content and wait for everything to load
            await page.set_content(html_content, wait_until="networkidle")
            
            # Generate PDF with print-friendly settings
            pdf_bytes = await page.pdf(
                format='Letter',
                print_background=True,
                margin={
                    'top': '0.5in',
                    'right': '0.5in',
                    'bottom': '0.5in',
                    'left': '0.5in'
                }
            )
            
            await browser.close()
            
            logger.info(f"PDF generated successfully using Playwright: {len(pdf_bytes)} bytes")
            return pdf_bytes
            
    except ImportError as e:
        logger.error(f"Playwright not available: {e}")
        raise HTTPException(
            status_code=500,
            detail="PDF generation service unavailable. Playwright is required."
        )
    except Exception as e:
        logger.error(f"Playwright PDF generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF: {str(e)}"
        )

@api_router.post("/reports/{tool}/pdf-playwright")
async def generate_pdf_playwright(tool: str, request: Request, current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Generate PDF using Playwright with exact specifications from requirements
    """
    try:
        # Get calculation data from request body  
        body = await request.json()
        calculation_data = body.get('calculation_data', {})
        property_data = body.get('property_data', {})
        
        if not calculation_data or not property_data:
            raise HTTPException(status_code=400, detail="Calculation data and property data required")
        
        # Generate PDF using Playwright with exact specifications
        pdf_buffer = await generate_pdf_with_playwright_exact(tool, calculation_data, property_data, current_user)
        
        # Generate filename based on tool type
        if tool == "affordability":
            home_price = property_data.get('homePrice', 'Unknown')
            date_str = datetime.now().strftime('%Y-%m-%d')
            filename = f"affordability_analysis_{home_price}_{date_str}.pdf"
        else:  # investor
            property_address = property_data.get('address', 'Property')
            date_str = datetime.now().strftime('%Y-%m-%d')
            clean_address = re.sub(r'[^\w\s-]', '', property_address).replace(' ', '_')
            filename = f"investor_{clean_address}_{date_str}.pdf"
        
        # Return PDF response
        return Response(
            content=pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Cache-Control": "no-cache"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating Playwright PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_pdf_with_playwright_exact(tool: str, calculation_data: dict, property_data: dict, current_user = None) -> bytes:
    """Generate PDF using Playwright with exact specifications from requirements"""
    
    # Import playwright here to avoid dependency issues if not needed
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.error("Playwright not available, falling back to WeasyPrint")
        # Fallback to WeasyPrint
        template_path = Path(__file__).parent / "templates" / "investor_report_comprehensive.html"
        template_content = template_path.read_text(encoding='utf-8')
        
        if tool == "investor":
            # Get branding data for PDF
            branding_data = {}  # Branding disabled
            
            report_data = prepare_investor_report_data(calculation_data, property_data, current_user)
        else:
            raise HTTPException(status_code=404, detail="Tool not supported")
        
        html_content = render_template(template_content, report_data)
        return await generate_pdf_with_weasyprint_from_html(html_content)
    
    async with async_playwright() as p:
        try:
            # Launch browser
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-gpu'
                ]
            )
            
            page = await browser.new_page()
            
            # Load template and render
            template_path = Path(__file__).parent / "templates" / "investor_report_comprehensive.html"
            template_content = template_path.read_text(encoding='utf-8')
            
            if tool == "investor":
                # Get branding data for PDF
                branding_data = {}  # Branding disabled
                
                report_data = prepare_investor_report_data(calculation_data, property_data, current_user)
            else:
                raise HTTPException(status_code=404, detail="Tool not supported")
            
            html_content = render_template(template_content, report_data)
            
            # Set content and wait as specified
            await page.set_content(html_content, wait_until='networkidle', timeout=60000)
            await page.emulate_media(media='screen')
            await page.evaluate('() => document.fonts && document.fonts.ready')
            await page.wait_for_timeout(50)
            
            # Generate PDF with exact specifications
            pdf_buffer = await page.pdf(
                print_background=True,
                prefer_css_page_size=True,
                margin={'top': '0.5in', 'right': '0.5in', 'bottom': '0.5in', 'left': '0.5in'},
                scale=1,
                display_header_footer=False
            )
            
            await browser.close()
            return pdf_buffer
            
        except Exception as e:
            logger.error(f"Playwright PDF generation error: {str(e)}")
            if 'browser' in locals():
                await browser.close()
            raise e

# PDF generation helper functions
def convert_calculation_to_pdf_data_from_request(calculation_data: dict, property_data: dict, tool: str) -> dict:
    """Convert request calculation data to PDF data format"""
    
    def safe_float(value, default=0.0):
        """Safely convert value to float, handling empty strings and None"""
        if value is None or value == '' or value == 'null':
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default
    
    def safe_int(value, default=0):
        """Safely convert value to int, handling empty strings and None"""
        if value is None or value == '' or value == 'null':
            return default
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    
    if tool == "investor":
        # Handle investor calculator data from request
        purchase_price = safe_float(property_data.get("purchasePrice"))
        down_payment = safe_float(property_data.get("downPayment"))
        
        return {
            "plan": "FREE",
            "property": {
                "address": property_data.get("address", ""),
                "type": property_data.get("propertyType", "Property"),
                "beds": safe_int(property_data.get("bedrooms")),
                "baths": safe_float(property_data.get("bathrooms")),
                "sqft": safe_int(property_data.get("squareFootage")),
                "year_built": safe_int(property_data.get("yearBuilt")) if property_data.get("yearBuilt") else None,
                "photo_url": property_data.get("propertyImageUrl")
            },
            "inputs": {
                "price": purchase_price,
                "rent_monthly": safe_float(property_data.get("monthlyRent")),
                "rehab_budget": 0,
                "closing_costs": 0,
                "taxes_annual": safe_float(property_data.get("propertyTaxes")),
                "insurance_annual": safe_float(property_data.get("insurance")),
                "down_pct": down_payment / purchase_price if purchase_price > 0 else 0.25
            },
            "derived": {
                "total_cash_needed": safe_float(calculation_data.get("cashInvested")),
                "effective_gross_income_annual": safe_float(calculation_data.get("effectiveGrossIncome")),
                "operating_expenses_annual": safe_float(calculation_data.get("operatingExpenses")),
                "noi_annual": safe_float(calculation_data.get("noi")),
                "annual_debt_service": safe_float(calculation_data.get("monthlyMortgage")) * 12,
                "annual_cash_flow": safe_float(calculation_data.get("annualCashFlow")),
                "cap_rate": safe_float(calculation_data.get("capRate")) / 100,
                "dscr": safe_float(calculation_data.get("dscr")),
                "cash_on_cash": safe_float(calculation_data.get("cashOnCash")) / 100,
                "break_even_occupancy": safe_float(calculation_data.get("breakEvenOccupancy")) / 100,
                "irr_5yr": safe_float(calculation_data.get("irrPercent")) / 100
            },
            "glossary_one_liners": {
                "cap_rate": "Yearly return based on purchase price.",
                "cash_on_cash": "Annual cash flow vs cash invested.",
                "dscr": "Rent coverage vs mortgage; lenders want ~1.2+.",
                "irr_5yr": "Average yearly return including sale.",
                "break_even_occupancy": "% rented to cover costs."
            },
            "disclaimer": "These calculations are estimates based on the assumptions provided. I Need Numbers and the agent/brokerage do not guarantee performance. Verify all information independently before investing."
        }
    
    # Add other tool types as needed
    return {}

def generate_print_html(data: dict, plan: str = "FREE", agent_profile: dict = None) -> str:
    """Generate HTML for the print page that exactly matches PDFReport component"""
    
    # Helper functions
    def format_currency(value):
        if value is None:
            return "$0"
        # Convert to float if it's a string
        if isinstance(value, str):
            try:
                value = float(value)
            except ValueError:
                return "$0"
        return f"${value:,.0f}"
    
    def format_percentage(value):
        if value is None:
            return "0%"
        return f"{value * 100:.2f}%"
    
    is_pro = plan == "PRO"
    is_starter = plan == "STARTER" 
    is_paid = is_pro or is_starter
    show_agent_contact = is_paid and agent_profile
    
    brand_color = agent_profile.get("agent_brand_color", "#2FA163") if show_agent_contact else "linear-gradient(135deg, #2FA163 0%, #286C4E 100%)"
    
    # Agent contact block
    def generate_agent_contact_block(compact=False):
        if not show_agent_contact or not agent_profile:
            return ""
        
        compact_class = "text-xs space-y-0.5" if compact else "text-sm space-y-1"
        name_class = "text-sm font-bold" if compact else "text-base font-bold"
        
        return f"""
        <div class="{compact_class}">
            <div class="{name_class} text-gray-900">
                {agent_profile.get('agent_full_name', 'Agent Name')}
            </div>
            {f'<div class="text-xs text-gray-600">{agent_profile.get("agent_title_or_team", "")}</div>' if agent_profile.get("agent_title_or_team") else ''}
            {f'<div class="text-xs text-gray-600">{agent_profile.get("agent_brokerage", "")}</div>' if agent_profile.get("agent_brokerage") else ''}
            <div class="flex flex-col space-y-0.5 text-xs text-gray-600">
                {f'<span>{agent_profile.get("agent_phone", "")}</span>' if agent_profile.get("agent_phone") else ''}
                {f'<span>{agent_profile.get("agent_email", "")}</span>' if agent_profile.get("agent_email") else ''}
                {f'<span>{agent_profile.get("agent_website", "").replace("https://", "").replace("http://", "")}</span>' if agent_profile.get("agent_website") else ''}
            </div>
        </div>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Property Analysis - {data.get('property', {}).get('address', 'Property')}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page {{
                size: Letter;
                margin: 0.5in;
            }}
            * {{
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            body {{
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
                margin: 0;
                padding: 20px;
                line-height: 1.6;
                color: #374151;
                background: white;
            }}
            .card {{
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                margin-bottom: 2rem;
                overflow: hidden;
                page-break-inside: avoid;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }}
            .card-header {{
                padding: 2rem;
            }}
            .card-content {{
                padding: 2rem;
            }}
            @media print {{
                .card {{
                    box-shadow: none;
                    border: 2px solid #e5e7eb;
                }}
                body {{
                    padding: 0;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="max-w-4xl mx-auto space-y-8">
            
            <!-- Page 1 - Snapshot -->
            <div class="card">
                <div class="card-header text-white" style="background: {brand_color}">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-4">
                            <img 
                                src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
                                alt="I Need Numbers" 
                                class="h-10 w-auto"
                            />
                            <div class="text-4xl font-bold text-white">Property Analysis</div>
                        </div>
                        {f'''
                        <div class="text-right text-sm">
                            <p class="opacity-90">Prepared by</p>
                            <p class="font-semibold">{agent_profile.get("agent_full_name", "Agent")}</p>
                            <p class="text-sm opacity-90">{agent_profile.get("agent_brokerage", "")}</p>
                        </div>
                        ''' if show_agent_contact else ''}
                    </div>
                </div>
                <div class="card-content">
                    <!-- Property Header -->
                    <div class="grid md:grid-cols-2 gap-8 mb-8">
                        <div>
                            {f'''
                            <div class="mb-6">
                                <img 
                                    src="{data.get('property', {}).get('photo_url')}" 
                                    alt="Property" 
                                    class="w-full h-48 object-cover rounded-lg"
                                />
                            </div>
                            ''' if data.get('property', {}).get('photo_url') else ''}
                            <div class="space-y-2">
                                <h2 class="text-2xl font-bold text-gray-900">{data.get('property', {}).get('address', 'Property Address')}</h2>
                                <div class="flex space-x-4 text-sm text-gray-500">
                                    <span>{data.get('property', {}).get('beds', 0)} bed</span>
                                    <span>{data.get('property', {}).get('baths', 0)} bath</span>
                                    <span>{data.get('property', {}).get('sqft', 0):,} sqft</span>
                                    <span>Built {data.get('property', {}).get('year_built', 'N/A')}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <h3 class="text-lg font-semibold text-gray-900">Investment Snapshot</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-blue-50 p-4 rounded-lg">
                                    <p class="text-sm text-blue-600 font-medium">Purchase Price</p>
                                    <p class="text-2xl font-bold text-blue-900">{format_currency(data.get('inputs', {}).get('price', 0))}</p>
                                </div>
                                <div class="bg-green-50 p-4 rounded-lg">
                                    <p class="text-sm text-green-600 font-medium">Monthly Rent</p>
                                    <p class="text-2xl font-bold text-green-900">{format_currency(data.get('inputs', {}).get('rent_monthly', 0))}</p>
                                </div>
                                <div class="bg-purple-50 p-4 rounded-lg">
                                    <p class="text-sm text-purple-600 font-medium">Rehab/CapEx</p>
                                    <p class="text-2xl font-bold text-purple-900">{format_currency(data.get('inputs', {}).get('rehab_budget', 0))}</p>
                                </div>
                                <div class="bg-orange-50 p-4 rounded-lg">
                                    <p class="text-sm text-orange-600 font-medium">Total Cash Needed</p>
                                    <p class="text-2xl font-bold text-orange-900">{format_currency(data.get('derived', {}).get('total_cash_needed', 0))}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Key Metrics with Explanations -->
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900">Key Investment Metrics</h3>
                        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-3xl font-bold text-green-600">{format_percentage(data.get('derived', {}).get('cap_rate', 0))}</div>
                                <div class="text-sm font-medium text-gray-900 mt-1">Cap Rate</div>
                                <div class="text-xs text-gray-500 mt-1">{data.get('glossary_one_liners', {}).get('cap_rate', '')}</div>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-3xl font-bold text-blue-600">{format_percentage(data.get('derived', {}).get('cash_on_cash', 0))}</div>
                                <div class="text-sm font-medium text-gray-900 mt-1">Cash-on-Cash</div>
                                <div class="text-xs text-gray-500 mt-1">{data.get('glossary_one_liners', {}).get('cash_on_cash', '')}</div>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-3xl font-bold text-purple-600">{data.get('derived', {}).get('dscr', 0):.2f}</div>
                                <div class="text-sm font-medium text-gray-900 mt-1">DSCR</div>
                                <div class="text-xs text-gray-500 mt-1">{data.get('glossary_one_liners', {}).get('dscr', '')}</div>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-3xl font-bold text-indigo-600">{format_percentage(data.get('derived', {}).get('irr_5yr', 0))}</div>
                                <div class="text-sm font-medium text-gray-900 mt-1">IRR (5 yr)</div>
                                <div class="text-xs text-gray-500 mt-1">{data.get('glossary_one_liners', {}).get('irr_5yr', '')}</div>
                            </div>
                            <div class="text-center p-4 bg-gray-50 rounded-lg">
                                <div class="text-3xl font-bold text-orange-600">{format_percentage(data.get('derived', {}).get('break_even_occupancy', 0))}</div>
                                <div class="text-sm font-medium text-gray-900 mt-1">Break-even Occupancy</div>
                                <div class="text-xs text-gray-500 mt-1">{data.get('glossary_one_liners', {}).get('break_even_occupancy', '')}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Agent Contact Block (Starter/Pro only) -->
                    {f'''
                    <div class="mt-8 pt-6 border-t border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div class="bg-gray-50 p-6 rounded-lg">
                            {generate_agent_contact_block()}
                        </div>
                    </div>
                    ''' if show_agent_contact else ''}
                </div>
            </div>

            <!-- Page 2 - Financial Breakdown -->
            <div class="card">
                <div class="card-header">
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                        </svg>
                        <span class="text-xl font-bold">Financial Breakdown</span>
                    </div>
                    <p class="text-gray-600 mt-1">Where the money comes from and where it goes</p>
                </div>
                <div class="card-content">
                    <div class="grid md:grid-cols-2 gap-8">
                        <!-- Initial Investment -->
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-4">Initial Investment Breakdown</h4>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center p-3 bg-blue-50 rounded">
                                    <span class="text-sm font-medium">Down Payment ({format_percentage(data.get('inputs', {}).get('down_pct', 0.25))})</span>
                                    <span class="font-semibold text-blue-900">{format_currency((data.get('inputs', {}).get('price', 0)) * (data.get('inputs', {}).get('down_pct', 0.25)))}</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-purple-50 rounded">
                                    <span class="text-sm font-medium">Rehab/CapEx</span>
                                    <span class="font-semibold text-purple-900">{format_currency(data.get('inputs', {}).get('rehab_budget', 0))}</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span class="text-sm font-medium">Closing Costs (est.)</span>
                                    <span class="font-semibold text-gray-900">{format_currency(data.get('inputs', {}).get('closing_costs', 0))}</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-green-50 rounded border-2 border-green-200">
                                    <span class="font-semibold">Total Cash Required</span>
                                    <span class="font-bold text-green-900">{format_currency(data.get('derived', {}).get('total_cash_needed', 0))}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Income & Expenses -->
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-4">Annual Income & Expenses</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between text-green-700">
                                    <span>Effective Gross Income</span>
                                    <span class="font-semibold">{format_currency(data.get('derived', {}).get('effective_gross_income_annual', 0))}</span>
                                </div>
                                <div class="flex justify-between text-red-700">
                                    <span>Operating Expenses</span>
                                    <span class="font-semibold">({format_currency(data.get('derived', {}).get('operating_expenses_annual', 0))})</span>
                                </div>
                                <hr class="my-2">
                                <div class="flex justify-between font-bold text-lg">
                                    <span>Net Operating Income (NOI)</span>
                                    <span>{format_currency(data.get('derived', {}).get('noi_annual', 0))}</span>
                                </div>
                                <div class="flex justify-between text-gray-600">
                                    <span>Annual Debt Service</span>
                                    <span>({format_currency(data.get('derived', {}).get('annual_debt_service', 0))})</span>
                                </div>
                                <hr class="my-2">
                                <div class="flex justify-between font-bold text-lg text-green-600">
                                    <span>Annual Cash Flow</span>
                                    <span>{format_currency(data.get('derived', {}).get('annual_cash_flow', 0))}</span>
                                </div>
                            </div>

                            <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                                <p class="text-sm text-blue-800">
                                    <strong>Note:</strong> NOI is income after expenses, before loan payments. 
                                    Investors use it to compare properties regardless of financing.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Page 3 - Terms & Disclaimer -->
            <div class="card">
                <div class="card-header">
                    <div class="flex items-center space-x-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span class="text-xl font-bold">Terms & Disclaimer</span>
                    </div>
                    <p class="text-gray-600 mt-1">Understanding the numbers</p>
                </div>
                <div class="card-content">
                    <div class="grid md:grid-cols-2 gap-8">
                        <!-- Mini Glossary -->
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-4">Key Terms</h4>
                            <div class="space-y-3 text-sm">
                                <div>
                                    <p class="font-medium text-gray-900">Cap Rate:</p>
                                    <p class="text-gray-600">{data.get('glossary_one_liners', {}).get('cap_rate', '')}</p>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900">Cash on Cash:</p>
                                    <p class="text-gray-600">{data.get('glossary_one_liners', {}).get('cash_on_cash', '')}</p>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900">DSCR:</p>
                                    <p class="text-gray-600">{data.get('glossary_one_liners', {}).get('dscr', '')}</p>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900">IRR (5 yr):</p>
                                    <p class="text-gray-600">{data.get('glossary_one_liners', {}).get('irr_5yr', '')}</p>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900">Break-even Occupancy:</p>
                                    <p class="text-gray-600">{data.get('glossary_one_liners', {}).get('break_even_occupancy', '')}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Disclaimer -->
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-4">Important Disclaimer</h4>
                            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <p class="text-sm text-yellow-800 leading-relaxed">
                                    {data.get('disclaimer', 'These calculations are estimates based on the assumptions provided. I Need Numbers and the agent/brokerage do not guarantee performance. Verify all information independently before investing.')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Footer with Agent Contact (Compact) -->
                    <div class="mt-8 pt-6 border-t border-gray-200">
                        {f'''
                        <div class="grid md:grid-cols-2 gap-4 items-center">
                            <div>
                                {generate_agent_contact_block(compact=True)}
                            </div>
                            <div class="text-right">
                                <p class="text-sm text-gray-500">
                                    Generated by I Need Numbers (www.ineednumbers.com) • Agent-friendly investor packets in minutes
                                </p>
                            </div>
                        </div>
                        ''' if show_agent_contact else '''
                        <div class="text-center">
                            <p class="text-sm text-gray-500">
                                Generated by I Need Numbers (www.ineednumbers.com) • Agent-friendly investor packets in minutes
                            </p>
                        </div>
                        '''}
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html

async def generate_pdf_with_weasyprint_from_data(tool: str, calculation_data: dict, property_data: dict, current_user = None) -> bytes:
    """Generate PDF using WeasyPrint from calculation data"""
    try:
        # Get user's plan for personalization
        plan = "FREE"
        agent_profile = None
        
        if current_user:
            plan = current_user.plan or "FREE"
            agent_profile = {
                "agent_full_name": getattr(current_user, 'full_name', ''),
                "agent_email": getattr(current_user, 'email', ''),
                "agent_brand_color": "#2FA163"
            }
        
        # Convert calculation data to PDF format
        pdf_data = convert_calculation_to_pdf_data_from_request(calculation_data, property_data, tool)
        
        # Generate the HTML for the print page
        html_content = generate_print_html(pdf_data, plan, agent_profile)
        
        # Generate PDF using WeasyPrint
        html_obj = HTML(string=html_content)
        pdf_buffer = html_obj.write_pdf()
        
        return pdf_buffer
        
    except Exception as e:
        logger.error(f"WeasyPrint PDF generation error: {str(e)}")
        raise e

# Authentication Routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Prevent direct registration - users must subscribe first
    raise HTTPException(
        status_code=403,
        detail="Direct registration is not allowed. Please subscribe to Starter or Pro plan first. Use the calculator without an account for free access."
    )

@api_router.post("/auth/set-password")
async def set_password(request: dict):
    """Allow users created via Stripe webhook to set their password"""
    try:
        session_id = request.get("session_id")
        password = request.get("password")
        
        if not session_id or not password:
            raise HTTPException(status_code=400, detail="Session ID and password required")
        
        # Get checkout session info
        session = stripe.checkout.Session.retrieve(session_id)
        customer_email = session.customer_details.email if session.customer_details else None
        
        if not customer_email:
            raise HTTPException(status_code=400, detail="Invalid session")
        
        # Find user by email
        user = await get_user_by_email(customer_email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found. Please subscribe first.")
        
        # Update user password
        hashed_password = get_password_hash(password)
        await db.users.update_one(
            {"id": user.id},
            {
                "$set": {
                    "hashed_password": hashed_password,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Password set successfully"}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error in set password: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid session")
    except Exception as e:
        logger.error(f"Error setting password: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.post("/auth/login")
async def login(request: Request, response: Response, login_data: LoginRequest):
    user = await get_user_by_email(login_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user plan allows login (FREE users cannot login)
    if user.plan == PlanType.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free accounts cannot log in. Please upgrade to Starter or Pro plan to access your account."
        )
    
    if not verify_password(login_data.password, user.hashed_password):
        # Add detailed logging for production debugging
        logger.error(f"Password verification failed for user {user.email}")
        logger.error(f"Hash starts with: {user.hashed_password[:20] if user.hashed_password else 'None'}")
        logger.error(f"Password length: {len(login_data.password) if login_data.password else 0}")
        
        await log_audit_event(user, AuditAction.LOGIN, {"success": False, "reason": "invalid_password"}, request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Migrate bcrypt passwords to Argon2id on successful login
    if user.hashed_password.startswith('$2b$') or user.hashed_password.startswith('$2a$') or user.hashed_password.startswith('$2y$'):
        try:
            logger.info(f"Migrating password hash for user {user.email} from bcrypt to Argon2id")
            new_hash = hash_password(login_data.password)
            await db.users.update_one(
                {"_id": user.id}, 
                {"$set": {"hashed_password": new_hash, "updated_at": datetime.now(timezone.utc)}}
            )
            logger.info(f"Successfully migrated password hash for user {user.email}")
        except Exception as e:
            logger.error(f"Failed to migrate password hash for user {user.email}: {e}")
            # Don't fail login if migration fails
    
    # Check if Argon2id hash needs parameter update
    elif user.hashed_password.startswith('$argon2') and check_needs_rehash(user.hashed_password):
        try:
            logger.info(f"Rehashing Argon2id password for user {user.email} with current parameters")
            new_hash = hash_password(login_data.password)
            await db.users.update_one(
                {"_id": user.id}, 
                {"$set": {"hashed_password": new_hash, "updated_at": datetime.now(timezone.utc)}}
            )
            logger.info(f"Successfully rehashed password for user {user.email}")
        except Exception as e:
            logger.error(f"Failed to rehash password for user {user.email}: {e}")
            # Don't fail login if rehashing fails
    
    access_token_expires = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS if login_data.remember_me else 1)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )
    
    # Set HttpOnly, Secure, SameSite cookie with proper domain handling
    # For subdomain setup (ineednumbers.com -> api.ineednumbers.com)
    # Use shared parent domain for cookie sharing
    is_production = config.NODE_ENV == "production" or "preview.emergentagent.com" in request.url.hostname or "emergent.host" in request.url.hostname
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=int(access_token_expires.total_seconds()),
        httponly=True,
        secure=True,  # REQUIRED for HTTPS
        samesite="none",  # Cross-site compatibility
        domain=".ineednumbers.com"  # Shared parent domain - allows cookies between ineednumbers.com and api.ineednumbers.com
    )
    
    await log_audit_event(user, AuditAction.LOGIN, {"success": True}, request)
    
    return {
        "success": True,
        "user": UserResponse(**user.dict())
    }

# ============================================
# 2FA (Two-Factor Authentication) Endpoints
# ============================================

@api_router.post("/auth/2fa/generate")
async def generate_2fa_secret(current_user: User = Depends(require_auth)):
    """
    Generate 2FA secret and QR code for user
    Returns QR code image and secret key
    """
    try:
        # Generate new TOTP secret
        secret = generate_totp_secret()
        
        # Generate QR code
        qr_code_data = generate_qr_code(current_user.email, secret)
        
        # Store secret temporarily (will be saved when user verifies)
        # For now, we'll return it and the frontend will send it back for verification
        
        return {
            "success": True,
            "secret": secret,
            "qr_code": qr_code_data,
            "email": current_user.email
        }
        
    except Exception as e:
        logger.error(f"Error generating 2FA secret: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate 2FA secret")


@api_router.post("/auth/2fa/verify")
async def verify_and_enable_2fa(
    request: Dict[str, str],
    current_user: User = Depends(require_auth)
):
    """
    Verify 2FA code and enable 2FA for user
    """
    try:
        secret = request.get("secret")
        code = request.get("code")
        
        if not secret or not code:
            raise HTTPException(status_code=400, detail="Secret and code are required")
        
        # Verify the TOTP code
        if not verify_totp_code(secret, code):
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        # Generate backup codes
        backup_codes_plain = generate_backup_codes(10)
        backup_codes_hashed = hash_backup_codes(backup_codes_plain)
        
        # Save 2FA settings to user
        update_result = await db.users.update_one(
            {"id": current_user.id},
            {
                "$set": {
                    "two_factor_enabled": True,
                    "two_factor_secret": secret,
                    "backup_codes": backup_codes_hashed,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to enable 2FA")
        
        return {
            "success": True,
            "message": "2FA enabled successfully",
            "backup_codes": backup_codes_plain
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying 2FA: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify 2FA")


@api_router.post("/auth/2fa/disable")
async def disable_2fa(
    request: Dict[str, str],
    current_user: User = Depends(require_auth)
):
    """
    Disable 2FA for user (requires password confirmation)
    """
    try:
        password = request.get("password")
        
        if not password:
            raise HTTPException(status_code=400, detail="Password is required")
        
        # Get user from database to verify password
        user_data = await db.users.find_one({"id": current_user.id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify password
        if not verify_password(password, user_data.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        # Disable 2FA
        update_result = await db.users.update_one(
            {"id": current_user.id},
            {
                "$set": {
                    "two_factor_enabled": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$unset": {
                    "two_factor_secret": "",
                    "backup_codes": ""
                }
            }
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to disable 2FA")
        
        return {
            "success": True,
            "message": "2FA disabled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling 2FA: {e}")
        raise HTTPException(status_code=500, detail="Failed to disable 2FA")


@api_router.get("/auth/2fa/status")
async def get_2fa_status(current_user: User = Depends(require_auth)):
    """
    Get 2FA status for current user
    """
    try:
        user_data = await db.users.find_one({"id": current_user.id})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "enabled": user_data.get("two_factor_enabled", False),
            "required": user_data.get("role") == "master_admin"  # 2FA required for master admins
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting 2FA status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get 2FA status")


@api_router.post("/auth/logout")
async def logout(response: Response):
    """Logout user by clearing authentication cookie"""
    response.delete_cookie("access_token")
    return {"success": True, "message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(require_auth)):
    return UserResponse(**current_user.dict())

@api_router.post("/auth/password-reset")
async def request_password_reset(request: PasswordResetRequest):
    """
    Request a password reset link.
    Generates a secure token and stores it in the database.
    In production, this would send an email with the reset link.
    """
    try:
        # Find user by email
        user = await db.users.find_one({"email": request.email})
        
        # Always return success to prevent email enumeration
        if not user:
            logger.warning(f"Password reset requested for non-existent email: {request.email}")
            return {
                "success": True,
                "message": "If an account exists with this email, a password reset link has been sent."
            }
        
        # Generate secure reset token (valid for 1 hour)
        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        
        # Store reset token in database
        await db.users.update_one(
            {"email": request.email},
            {
                "$set": {
                    "password_reset_token": reset_token,
                    "password_reset_expires": reset_expires.isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log the event
        await log_audit_event(
            User(**user),
            AuditAction.PASSWORD_RESET_REQUEST,
            {"method": "email"},
            None
        )
        
        # In production, send email with reset link
        # For now, log the token (REMOVE IN PRODUCTION)
        logger.info(f"Password reset token for {request.email}: {reset_token}")
        logger.info(f"Reset link: /auth/reset-password?token={reset_token}")
        
        return {
            "success": True,
            "message": "If an account exists with this email, a password reset link has been sent.",
            # ONLY FOR DEVELOPMENT - remove in production
            "dev_reset_token": reset_token if config.NODE_ENV == "development" else None
        }
        
    except Exception as e:
        logger.error(f"Error processing password reset request: {e}")
        return {
            "success": True,
            "message": "If an account exists with this email, a password reset link has been sent."
        }

@api_router.post("/auth/password-reset/confirm")
async def confirm_password_reset(reset_request: PasswordResetConfirm):
    """
    Confirm password reset with token and set new password.
    """
    try:
        # Find user with valid reset token
        user = await db.users.find_one({
            "password_reset_token": reset_request.token
        })
        
        if not user:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token"
            )
        
        # Check if token has expired
        if 'password_reset_expires' in user:
            expires = datetime.fromisoformat(user['password_reset_expires'])
            if expires < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=400,
                    detail="Reset token has expired. Please request a new one."
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid reset token"
            )
        
        # Hash the new password
        new_password_hash = hash_password(reset_request.new_password)
        
        # Update password and clear reset token
        await db.users.update_one(
            {"email": user['email']},
            {
                "$set": {
                    "hashed_password": new_password_hash,
                    "password_changed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$unset": {
                    "password_reset_token": "",
                    "password_reset_expires": ""
                }
            }
        )
        
        # Log the event
        await log_audit_event(
            User(**user),
            AuditAction.PASSWORD_RESET_CONFIRM,
            {"method": "email_token"},
            None
        )
        
        logger.info(f"Password reset successful for user: {user['email']}")
        
        return {
            "success": True,
            "message": "Password has been reset successfully. You can now log in with your new password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming password reset: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to reset password. Please try again."
        )

@api_router.post("/auth/change-password")
async def change_password(
    request: Request,
    password_data: Dict[str, str],
    current_user: User = Depends(require_auth)
):
    """
    Change password for logged-in user.
    Requires current password for verification.
    """
    try:
        current_password = password_data.get("current_password")
        new_password = password_data.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(
                status_code=400,
                detail="Both current and new passwords are required"
            )
        
        if len(new_password) < 8:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 8 characters"
            )
        
        # Verify current password
        if not verify_password(current_password, current_user.hashed_password):
            await log_audit_event(
                current_user,
                AuditAction.PASSWORD_CHANGE,
                {"success": False, "reason": "incorrect_current_password"},
                request
            )
            raise HTTPException(
                status_code=401,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        new_password_hash = hash_password(new_password)
        
        # Update password
        await db.users.update_one(
            {"id": current_user.id},
            {
                "$set": {
                    "hashed_password": new_password_hash,
                    "password_changed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log successful password change
        await log_audit_event(
            current_user,
            AuditAction.PASSWORD_CHANGE,
            {"success": True, "changed_by": "user_self"},
            request
        )
        
        logger.info(f"User {current_user.email} changed their password successfully")
        
        return {
            "success": True,
            "message": "Password changed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to change password"
        )

@api_router.delete("/auth/delete-account")
async def delete_account(request: Request, confirmation: dict, current_user: User = Depends(require_auth)):
    if confirmation.get("confirmation") != "DELETE":
        raise HTTPException(status_code=400, detail="Invalid confirmation")
    
    # Delete user's deals
    await db.deals.delete_many({"user_id": current_user.id})
    
    # Delete user
    await db.users.delete_one({"id": current_user.id})
    
    await log_audit_event(current_user, AuditAction.DELETE_ACCOUNT, {}, request)
    
    return {"message": "Account deleted successfully"}

# Closing Date Calculator Models
class ClosingDateCalculatorInput(BaseModel):
    underContractDate: str
    closingDate: str
    pestInspectionDays: Optional[str] = ""
    homeInspectionDays: Optional[str] = ""
    dueDiligenceRepairRequestsDays: Optional[str] = ""
    finalWalkthroughDays: Optional[str] = ""
    appraisalDays: Optional[str] = ""
    dueDiligenceStartDate: Optional[str] = ""
    dueDiligenceStopDate: Optional[str] = ""
    # Agent notes for each milestone
    pestInspectionNote: Optional[str] = ""
    homeInspectionNote: Optional[str] = ""
    dueDiligenceRepairRequestsNote: Optional[str] = ""
    finalWalkthroughNote: Optional[str] = ""
    appraisalNote: Optional[str] = ""
    dueDiligenceStartNote: Optional[str] = ""
    dueDiligenceStopNote: Optional[str] = ""
    generalNotes: Optional[str] = ""

class Milestone(BaseModel):
    name: str
    date: str
    type: str
    description: str
    status: str
    agentNote: Optional[str] = ""

class ClosingDateCalculatorResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    inputs: ClosingDateCalculatorInput
    timeline: List[Milestone]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = None

class SaveClosingDateRequest(BaseModel):
    title: str
    inputs: ClosingDateCalculatorInput
    timeline: List[Milestone]

class GenerateClosingDatePDFRequest(BaseModel):
    title: str
    inputs: ClosingDateCalculatorInput
    timeline: List[Milestone]

# Closing Date Calculator Endpoints
@api_router.post("/closing-date/save")
async def save_closing_date_calculation(
    request: SaveClosingDateRequest,
    current_user: User = Depends(require_auth),
    request_obj: Request = None
):
    """Save a closing date calculation"""
    try:
        # Check plan limits
        plan_limit_response = await check_plan_limits(current_user, "closing_date")
        if plan_limit_response:
            raise HTTPException(
                status_code=plan_limit_response["status_code"], 
                detail=plan_limit_response["detail"]
            )

        # Create calculation record
        calculation = ClosingDateCalculatorResult(
            title=request.title,
            inputs=request.inputs,
            timeline=request.timeline,
            user_id=current_user.id
        )

        # Convert to dict for MongoDB
        calculation_dict = calculation.dict()
        calculation_dict['created_at'] = calculation_dict['created_at'].isoformat()
        
        # Save to database
        await db.closing_date_calculations.insert_one(calculation_dict)
        
        await log_audit_event(current_user, AuditAction.CREATE, {
            "resource_type": "closing_date_calculation",
            "calculation_id": calculation.id
        }, request_obj)
        
        return {"message": "Closing date calculation saved successfully", "id": calculation.id}
        
    except Exception as e:
        logger.error(f"Error saving closing date calculation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/closing-date/saved")
async def get_saved_closing_date_calculations(current_user: User = Depends(require_auth)):
    """Get user's saved closing date calculations"""
    try:
        calculations = await db.closing_date_calculations.find({
            "user_id": current_user.id
        }).sort("created_at", -1).to_list(length=None)
        
        # Clean up MongoDB-specific fields for JSON serialization
        for calc in calculations:
            if '_id' in calc:
                calc.pop('_id')
        
        return {
            "calculations": calculations,
            "count": len(calculations)
        }
        
    except Exception as e:
        logger.error(f"Error fetching closing date calculations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/closing-date/shared/{calculation_id}")
async def get_shared_closing_date_calculation(calculation_id: str):
    """Get a shared closing date calculation (public access)"""
    try:
        calculation = await db.closing_date_calculations.find_one({"id": calculation_id})
        if not calculation:
            raise HTTPException(status_code=404, detail="Calculation not found")
        
        # Remove sensitive user information and MongoDB-specific fields
        if 'user_id' in calculation:
            calculation.pop('user_id')
        if '_id' in calculation:
            calculation.pop('_id')
        
        return calculation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shared closing date calculation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/closing-date/generate-pdf")
async def generate_closing_date_pdf(
    request: GenerateClosingDatePDFRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    plan_preview: Optional[str] = Cookie(None, alias="plan_preview")
):
    """Generate PDF for closing date timeline"""
    try:
        # Determine effective plan
        effective_plan = get_effective_plan(current_user, plan_preview)
        
        # Determine branding
        agent_profile = None
        is_branded = effective_plan in ['STARTER', 'PRO']
        
        if is_branded and current_user:
            # Get agent profile for branding (would be from database in real implementation)
            agent_profile = {
                "agent_full_name": "Demo Agent",
                "agent_brokerage": "Demo Brokerage",
                "agent_phone": "(555) 123-4567",
                "agent_email": "demo@example.com"
            }
        
        # Generate timeline content for PDF
        timeline_html = generate_closing_date_timeline_html(request.inputs, request.timeline, is_branded, agent_profile)
        
        # Create PDF using WeasyPrint
        html_doc = HTML(string=timeline_html)
        pdf_bytes = html_doc.write_pdf()
        
        # Return PDF as response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=closing-timeline-{datetime.now().strftime('%Y%m%d')}.pdf"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating closing date PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_closing_date_timeline_html(inputs, timeline, is_branded=False, agent_profile=None):
    """Generate HTML for closing date timeline PDF"""
    
    # Format dates
    def format_date(date_str):
        try:
            date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return date_obj.strftime('%B %d, %Y')
        except:
            return date_str
    
    # Generate timeline items HTML
    timeline_items = ""
    for milestone in timeline:
        # Handle both dict and Pydantic model formats
        if hasattr(milestone, 'status'):
            # Pydantic model
            status = milestone.status
            name = milestone.name
            date = milestone.date
            description = milestone.description
            agent_note = getattr(milestone, 'agentNote', '') or getattr(milestone, 'agent_note', '')
        else:
            # Dictionary
            status = milestone.get('status', 'upcoming')
            name = milestone.get('name', 'Milestone')
            date = milestone.get('date', '')
            description = milestone.get('description', '')
            agent_note = milestone.get('agentNote', '') or milestone.get('agent_note', '')
            
        status_color = {
            'completed': '#10B981',
            'today': '#F59E0B', 
            'upcoming': '#3B82F6',
            'past-due': '#EF4444'
        }.get(status, '#6B7280')
        
        # Add agent note if present
        agent_note_html = ""
        if agent_note:
            agent_note_html = f'<p class="agent-note">"{agent_note}"</p>'
        
        timeline_items += f"""
        <div class="timeline-item">
            <div class="timeline-marker" style="background-color: {status_color};"></div>
            <div class="timeline-content">
                <h3>{name}</h3>
                <p class="date">{format_date(date)}</p>
                {agent_note_html}
                <p class="description">{description}</p>
            </div>
        </div>
        """
    
    # Agent branding section
    agent_section = ""
    if is_branded and agent_profile:
        agent_section = f"""
        <div class="agent-section">
            <h3>Prepared by:</h3>
            <p><strong>{agent_profile.get('agent_full_name', 'Agent Name')}</strong></p>
            <p>{agent_profile.get('agent_brokerage', 'Brokerage Name')}</p>
            <p>Phone: {agent_profile.get('agent_phone', 'Phone')}</p>
            <p>Email: {agent_profile.get('agent_email', 'Email')}</p>
        </div>
        """
    
    # General notes section
    general_notes_section = ""
    general_notes = ""
    if hasattr(inputs, 'generalNotes'):
        general_notes = inputs.generalNotes
    else:
        general_notes = inputs.get('generalNotes', '')
    
    if general_notes:
        general_notes_section = f"""
        <div class="general-notes-section">
            <h3>Important Notes & Instructions:</h3>
            <div class="notes-content">{general_notes}</div>
        </div>
        """
    
    # Comprehensive terminology and buyer guide
    terminology_section = f"""
    <div class="page-break"></div>
    <div class="terminology-section">
        <h2>Home Buying Guide & Terminology</h2>
        
        <div class="buyer-guide">
            <h3>Important Considerations for Buyers</h3>
            <div class="guide-section">
                <h4>During the Contract Period:</h4>
                <ul>
                    <li><strong>Stay in communication</strong> with your agent and lender throughout the process</li>
                    <li><strong>Avoid major purchases</strong> or opening new credit accounts until after closing</li>
                    <li><strong>Keep all documents</strong> organized and respond promptly to requests</li>
                    <li><strong>Don't skip inspections</strong> - they protect your investment</li>
                    <li><strong>Review all documents carefully</strong> before signing</li>
                </ul>
            </div>
            
            <div class="guide-section">
                <h4>What to Expect:</h4>
                <ul>
                    <li><strong>Inspection Period:</strong> Time to identify any issues with the property</li>
                    <li><strong>Appraisal Process:</strong> Lender will verify the property's value</li>
                    <li><strong>Final Walkthrough:</strong> Last chance to ensure property condition before closing</li>
                    <li><strong>Closing Day:</strong> Final signatures and key handover</li>
                </ul>
            </div>
            
            <div class="guide-section">
                <h4>Questions to Ask Your Agent:</h4>
                <ul>
                    <li>What should I look for during the final walkthrough?</li>
                    <li>What documents will I need at closing?</li>
                    <li>How much should I expect to pay in closing costs?</li>
                    <li>What happens if issues are found during inspection?</li>
                    <li>When do I get the keys to my new home?</li>
                </ul>
            </div>
        </div>
        
        <div class="terminology">
            <h3>Real Estate Terminology</h3>
            <div class="term-grid">
                <div class="term-item">
                    <strong>Under Contract:</strong> The property is legally bound by a purchase agreement between buyer and seller.
                </div>
                <div class="term-item">
                    <strong>Due Diligence Period:</strong> A specified timeframe when the buyer can investigate the property and potentially withdraw without penalty.
                </div>
                <div class="term-item">
                    <strong>Home Inspection:</strong> A comprehensive examination of the property's condition by a licensed professional.
                </div>
                <div class="term-item">
                    <strong>Pest Inspection:</strong> Specialized inspection looking for termites, wood-destroying insects, or pest damage.
                </div>
                <div class="term-item">
                    <strong>Appraisal:</strong> A professional assessment of the property's market value, typically required by the lender.
                </div>
                <div class="term-item">
                    <strong>Final Walkthrough:</strong> A final inspection usually done 24-48 hours before closing to ensure property condition.
                </div>
                <div class="term-item">
                    <strong>Repair Requests:</strong> Formal requests made by the buyer to address issues found during inspections.
                </div>
                <div class="term-item">
                    <strong>Closing/Settlement:</strong> The final step where ownership is officially transferred from seller to buyer.
                </div>
                <div class="term-item">
                    <strong>Title Company:</strong> A neutral third party that handles the transfer of property ownership and funds.
                </div>
                <div class="term-item">
                    <strong>Escrow:</strong> A neutral account where funds and documents are held until all conditions are met.
                </div>
                <div class="term-item">
                    <strong>Contingencies:</strong> Conditions that must be met for the sale to proceed (e.g., financing, inspection).
                </div>
                <div class="term-item">
                    <strong>Clear to Close:</strong> Final approval from the lender indicating all conditions have been satisfied.
                </div>
            </div>
        </div>
        
        <div class="tips-section">
            <h3>Pro Tips for a Smooth Closing</h3>
            <div class="tips-grid">
                <div class="tip-item">
                    <strong>📋 Stay Organized:</strong> Keep all documents in one place and respond to requests quickly.
                </div>
                <div class="tip-item">
                    <strong>💰 Avoid Big Purchases:</strong> Don't buy furniture or cars until after closing - it can affect your loan.
                </div>
                <div class="tip-item">
                    <strong>📞 Communicate Regularly:</strong> Stay in touch with your agent and lender for updates.
                </div>
                <div class="tip-item">
                    <strong>🔍 Inspect Thoroughly:</strong> Don't skip inspections - they can save you thousands later.
                </div>
                <div class="tip-item">
                    <strong>📝 Read Everything:</strong> Review all documents carefully before signing.
                </div>
                <div class="tip-item">
                    <strong>💡 Ask Questions:</strong> Your agent is there to help - don't hesitate to ask.
                </div>
            </div>
        </div>
    </div>
    """
    
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Your Home Purchase Timeline</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #ffffff;
                color: #333;
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #2FA163;
            }}
            .header h1 {{
                color: #2FA163;
                margin-bottom: 10px;
                font-size: 28px;
            }}
            .header p {{
                color: #666;
                font-size: 16px;
            }}
            .timeline-container {{
                margin: 20px 0;
            }}
            .timeline-item {{
                display: flex;
                margin-bottom: 20px;
                page-break-inside: avoid;
            }}
            .timeline-marker {{
                width: 20px;
                height: 20px;
                border-radius: 50%;
                margin-right: 20px;
                margin-top: 5px;
                flex-shrink: 0;
            }}
            .timeline-content {{
                flex: 1;
                padding-bottom: 20px;
                border-bottom: 1px solid #eee;
            }}
            .timeline-content h3 {{
                margin: 0 0 5px 0;
                color: #333;
                font-size: 18px;
            }}
            .timeline-content .date {{
                color: #2FA163;
                font-weight: bold;
                margin: 5px 0;
                font-size: 16px;
            }}
            .timeline-content .description {{
                color: #666;
                margin: 5px 0 0 0;
                font-size: 14px;
                line-height: 1.4;
            }}
            .timeline-content .agent-note {{
                color: #2563EB;
                font-style: italic;
                margin: 5px 0;
                font-size: 14px;
                line-height: 1.4;
                font-weight: 500;
            }}
            .agent-section {{
                margin-top: 30px;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #2FA163;
            }}
            .agent-section h3 {{
                color: #2FA163;
                margin-top: 0;
            }}
            .agent-section p {{
                margin: 5px 0;
            }}
            .general-notes-section {{
                margin-top: 20px;
                padding: 15px;
                background-color: #f0f9ff;
                border: 1px solid #bfdbfe;
                border-radius: 8px;
            }}
            .general-notes-section h3 {{
                color: #1e40af;
                margin-top: 0;
                margin-bottom: 10px;
            }}
            .notes-content {{
                color: #1f2937;
                line-height: 1.5;
                white-space: pre-wrap;
            }}
            .page-break {{
                page-break-before: always;
            }}
            .terminology-section {{
                margin-top: 30px;
            }}
            .terminology-section h2 {{
                color: #2FA163;
                border-bottom: 2px solid #2FA163;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }}
            .buyer-guide {{
                margin-bottom: 30px;
            }}
            .buyer-guide h3 {{
                color: #1e40af;
                margin-bottom: 15px;
            }}
            .guide-section {{
                margin-bottom: 20px;
            }}
            .guide-section h4 {{
                color: #374151;
                margin-bottom: 10px;
            }}
            .guide-section ul {{
                list-style-type: disc;
                padding-left: 20px;
                margin: 0;
            }}
            .guide-section li {{
                margin-bottom: 8px;
                line-height: 1.4;
            }}
            .terminology h3 {{
                color: #1e40af;
                margin-bottom: 15px;
            }}
            .term-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }}
            .term-item {{
                padding: 10px;
                background-color: #f9fafb;
                border-radius: 5px;
                border-left: 3px solid #2FA163;
            }}
            .term-item strong {{
                color: #2FA163;
            }}
            .tips-section {{
                margin-top: 20px;
            }}
            .tips-section h3 {{
                color: #1e40af;
                margin-bottom: 15px;
            }}
            .tips-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }}
            .tip-item {{
                padding: 15px;
                background-color: #fef3c7;
                border-radius: 8px;
                border-left: 4px solid #f59e0b;
            }}
            .tip-item strong {{
                color: #92400e;
                display: block;
                margin-bottom: 5px;
            }}
            .disclaimer {{
                margin-top: 30px;
                padding: 15px;
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                font-size: 12px;
                text-align: center;
            }}
            .key-dates {{
                display: flex;
                justify-content: space-between;
                margin: 20px 0;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 8px;
            }}
            .key-date {{
                text-align: center;
            }}
            .key-date .label {{
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
            }}
            .key-date .date {{
                font-size: 16px;
                font-weight: bold;
                color: #2FA163;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Your Home Purchase Timeline</h1>
            <p>Important milestones and deadlines for your home purchase</p>
        </div>
        
        <div class="key-dates">
            <div class="key-date">
                <div class="label">Under Contract</div>
                <div class="date">{format_date(inputs.underContractDate if hasattr(inputs, 'underContractDate') else inputs.get('underContractDate', ''))}</div>
            </div>
            <div class="key-date">
                <div class="label">Closing Date</div> 
                <div class="date">{format_date(inputs.closingDate if hasattr(inputs, 'closingDate') else inputs.get('closingDate', ''))}</div>
            </div>
        </div>
        
        <div class="timeline-container">
            {timeline_items}
        </div>
        
        {general_notes_section}
        
        {agent_section}
        
        <div class="disclaimer">
            <strong>Disclaimer:</strong> Dates are estimates based on your input. Always confirm with your agent or lender for final deadlines.
        </div>
        
        {terminology_section}
    </body>
    </html>
    """
    
    return html_template


# ============================================================================
# CALCULATOR SAVE ENDPOINTS
# ============================================================================

# Request Models for Saving Calculations
class SaveCommissionSplitRequest(BaseModel):
    title: str
    inputs: dict
    results: dict

class SaveSellerNetSheetRequest(BaseModel):
    title: str
    inputs: dict
    results: dict

class SaveAffordabilityRequest(BaseModel):
    title: str
    inputs: dict
    results: dict

class SaveInvestorDealRequest(BaseModel):
    title: str
    inputs: dict
    results: dict

# Result Models for Saved Calculations
class CommissionSplitResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    inputs: dict
    results: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = None

class SellerNetSheetResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    inputs: dict
    results: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = None

class AffordabilityResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    inputs: dict
    results: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = None

class InvestorDealResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    inputs: dict
    results: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = None

# Commission Split Save Endpoint
@api_router.post("/commission/save")
async def save_commission_calculation(
    request: SaveCommissionSplitRequest,
    current_user: User = Depends(require_auth),
    request_obj: Request = None
):
    """Save a commission split calculation"""
    try:
        # Check plan - only STARTER and PRO can save
        if current_user.plan.value not in ["STARTER", "PRO"]:
            raise HTTPException(
                status_code=403,
                detail="Saving calculations requires a STARTER or PRO plan. Please upgrade."
            )

        # Create calculation record
        calculation = CommissionSplitResult(
            title=request.title,
            inputs=request.inputs,
            results=request.results,
            user_id=current_user.id
        )

        # Convert to dict for MongoDB
        calculation_dict = calculation.dict()
        calculation_dict['created_at'] = calculation_dict['created_at'].isoformat()
        
        # Save to database
        await db.commission_calculations.insert_one(calculation_dict)
        
        await log_audit_event(current_user, AuditAction.CREATE, {
            "resource_type": "commission_calculation",
            "calculation_id": calculation.id
        }, request_obj)
        
        return {"message": "Commission calculation saved successfully", "id": calculation.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving commission calculation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Seller Net Sheet Save Endpoint
@api_router.post("/seller-net/save")
async def save_seller_net_calculation(
    request: SaveSellerNetSheetRequest,
    current_user: User = Depends(require_auth),
    request_obj: Request = None
):
    """Save a seller net sheet calculation"""
    try:
        # Check plan - only STARTER and PRO can save
        if current_user.plan.value not in ["STARTER", "PRO"]:
            raise HTTPException(
                status_code=403,
                detail="Saving calculations requires a STARTER or PRO plan. Please upgrade."
            )

        # Create calculation record
        calculation = SellerNetSheetResult(
            title=request.title,
            inputs=request.inputs,
            results=request.results,
            user_id=current_user.id
        )

        # Convert to dict for MongoDB
        calculation_dict = calculation.dict()
        calculation_dict['created_at'] = calculation_dict['created_at'].isoformat()
        
        # Save to database
        await db.seller_net_calculations.insert_one(calculation_dict)
        
        await log_audit_event(current_user, AuditAction.CREATE, {
            "resource_type": "seller_net_calculation",
            "calculation_id": calculation.id
        }, request_obj)
        
        return {"message": "Seller net sheet saved successfully", "id": calculation.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving seller net sheet: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Affordability Save Endpoint
@api_router.post("/affordability/save")
async def save_affordability_calculation(
    request: SaveAffordabilityRequest,
    current_user: User = Depends(require_auth),
    request_obj: Request = None
):
    """Save an affordability calculation"""
    try:
        # Check plan - only STARTER and PRO can save
        if current_user.plan.value not in ["STARTER", "PRO"]:
            raise HTTPException(
                status_code=403,
                detail="Saving calculations requires a STARTER or PRO plan. Please upgrade."
            )

        # Create calculation record
        calculation = AffordabilityResult(
            title=request.title,
            inputs=request.inputs,
            results=request.results,
            user_id=current_user.id
        )

        # Convert to dict for MongoDB
        calculation_dict = calculation.dict()
        calculation_dict['created_at'] = calculation_dict['created_at'].isoformat()
        
        # Save to database
        await db.affordability_calculations.insert_one(calculation_dict)
        
        await log_audit_event(current_user, AuditAction.CREATE, {
            "resource_type": "affordability_calculation",
            "calculation_id": calculation.id
        }, request_obj)
        
        return {"message": "Affordability calculation saved successfully", "id": calculation.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving affordability calculation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Investor Deal Save Endpoint
@api_router.post("/investor/save")
async def save_investor_deal(
    request: SaveInvestorDealRequest,
    current_user: User = Depends(require_auth),
    request_obj: Request = None
):
    """Save an investor deal calculation"""
    try:
        # Check plan - only STARTER and PRO can save
        if current_user.plan.value not in ["STARTER", "PRO"]:
            raise HTTPException(
                status_code=403,
                detail="Saving deals requires a STARTER or PRO plan. Please upgrade."
            )

        # Create calculation record
        calculation = InvestorDealResult(
            title=request.title,
            inputs=request.inputs,
            results=request.results,
            user_id=current_user.id
        )

        # Convert to dict for MongoDB
        calculation_dict = calculation.dict()
        calculation_dict['created_at'] = calculation_dict['created_at'].isoformat()
        
        # Save to database
        await db.investor_deals.insert_one(calculation_dict)
        
        await log_audit_event(current_user, AuditAction.CREATE, {
            "resource_type": "investor_deal",
            "calculation_id": calculation.id
        }, request_obj)
        
        return {"message": "Investor deal saved successfully", "id": calculation.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving investor deal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Action Tracker Models
class TrackerSettings(BaseModel):
    userId: str
    month: str  # YYYY-MM format
    goalType: str  # 'closings' or 'gci'
    monthlyClosingsTarget: Optional[int] = None
    monthlyGciTarget: Optional[float] = None
    avgGciPerClosing: Optional[float] = None
    workdays: int = 20
    activities: List[str] = ["conversations", "appointments", "offersWritten", "listingsTaken"]
    requiredPerClosing: Dict[str, int] = {
        "conversations": 60,
        "appointments": 4, 
        "offersWritten": 3,
        "listingsTaken": 1
    }
    weights: Dict[str, float] = {
        "listingsTaken": 4.5,
        "appointments": 4.0,
        "offersWritten": 3.5,
        "conversations": 3.0
    }
    earnedGciToDate: float = 0

class TrackerDaily(BaseModel):
    userId: str
    date: str  # YYYY-MM-DD format
    completed: Dict[str, int] = {
        "conversations": 0,
        "appointments": 0,
        "offersWritten": 0,
        "listingsTaken": 0
    }
    hours: Dict[str, float] = {
        "prospecting": 0,
        "showings": 0,
        "admin": 0,
        "marketing": 0,
        "social": 0,
        "openHouses": 0,
        "travel": 0,
        "other": 0
    }
    reflection: str = ""

class TrackerSummary(BaseModel):
    dailyTargets: Dict[str, int]
    gaps: Dict[str, int]
    lowValueFlags: List[str]
    top3: List[str]
    progress: float
    goalPaceGciToDate: float
    requiredDollarsPerDay: float
    activityProgress: float

# Action Tracker Helper Functions
def get_ny_timezone():
    """Get America/New_York timezone"""
    return pytz.timezone('America/New_York')

def get_today_ny():
    """Get today's date in NY timezone"""
    ny_tz = get_ny_timezone()
    return datetime.now(ny_tz).date()

def get_workdays_elapsed(workdays: int, today_date: date, month_str: str):
    """Calculate workdays elapsed in the month up to today"""
    year, month = map(int, month_str.split('-'))
    first_day = date(year, month, 1)
    
    # Get the last day of the month or today, whichever is earlier
    last_day_of_month = date(year, month, monthrange(year, month)[1])
    end_date = min(today_date, last_day_of_month)
    
    if end_date < first_day:
        return 0
        
    # Simple approximation: assume workdays are evenly distributed
    total_days = (last_day_of_month - first_day).days + 1
    elapsed_days = (end_date - first_day).days + 1
    
    return min(round(workdays * elapsed_days / total_days), workdays)

def calculate_tracker_summary(settings: TrackerSettings, daily_entry: TrackerDaily, 
                            pnl_data: Optional[Dict] = None) -> TrackerSummary:
    """Calculate tracker summary with all metrics"""
    
    # Derive closings target
    if settings.goalType == 'gci':
        closings_target = math.ceil(settings.monthlyGciTarget / settings.avgGciPerClosing)
        monthly_gci_target = settings.monthlyGciTarget
    else:
        closings_target = settings.monthlyClosingsTarget
        monthly_gci_target = closings_target * settings.avgGciPerClosing
    
    # Calculate daily targets
    daily_targets = {}
    for activity in settings.activities:
        monthly_target = closings_target * settings.requiredPerClosing.get(activity, 0)
        daily_targets[activity] = math.ceil(monthly_target / settings.workdays)
    
    # Calculate gaps
    gaps = {}
    for activity in settings.activities:
        completed = daily_entry.completed.get(activity, 0)
        gaps[activity] = max(daily_targets[activity] - completed, 0)
    
    # Calculate workdays elapsed and money metrics
    today = get_today_ny()
    workdays_elapsed = get_workdays_elapsed(settings.workdays, today, settings.month)
    
    goal_pace_gci_to_date = round(monthly_gci_target * workdays_elapsed / settings.workdays) if settings.workdays > 0 else 0
    
    remaining_workdays = max(settings.workdays - workdays_elapsed, 1)
    earned_gci_to_date = settings.earnedGciToDate
    required_dollars_per_day = max(math.ceil((monthly_gci_target - earned_gci_to_date) / remaining_workdays), 0)
    
    # Calculate activity progress (projected closings)
    # Use average daily completion rate * workdays elapsed to estimate MTD
    activity_projection_closings = float('inf')
    for activity in settings.activities:
        required = settings.requiredPerClosing.get(activity, 1)
        if required > 0:
            # daily_entry.completed contains today's values
            # Estimate MTD by assuming consistent daily completion
            daily_avg = daily_entry.completed.get(activity, 0)
            estimated_mtd = daily_avg * max(workdays_elapsed, 1)
            projection = math.floor(estimated_mtd / required) if required > 0 else 0
            activity_projection_closings = min(activity_projection_closings, projection)
    
    if activity_projection_closings == float('inf'):
        activity_projection_closings = 0
        
    activity_progress = min(activity_projection_closings / closings_target, 1.0) if closings_target > 0 else 0
    
    # Money progress  
    progress = min(earned_gci_to_date / monthly_gci_target, 1.0) if monthly_gci_target > 0 else 0
    
    # Calculate busyness flags
    low_value_flags = []
    high_value_hours = daily_entry.hours.get('prospecting', 0) + daily_entry.hours.get('showings', 0) + daily_entry.hours.get('openHouses', 0)
    total_hours = sum(daily_entry.hours.values())
    low_value_hours = total_hours - high_value_hours
    
    if total_hours > 0.1:
        low_value_share = low_value_hours / total_hours
        has_gaps = sum(gaps.values()) > 0
        
        if (low_value_share > 0.30 and has_gaps) or (low_value_hours > 1.5 and has_gaps):
            low_value_flags.append(f"You spent {low_value_hours:.1f}h on low-value activities while gaps remain in core activities")
            
        if daily_entry.hours.get('admin', 0) > 2 and has_gaps:
            low_value_flags.append(f"Admin took {daily_entry.hours.get('admin', 0):.1f}h while activity gaps remain")
    
    # Calculate Tomorrow's Top 3
    top3 = []
    activity_scores = []
    for activity in settings.activities:
        gap = gaps[activity]
        weight = settings.weights.get(activity, 1.0)
        score = gap * weight
        if gap > 0:
            activity_scores.append((score, activity, gap))
    
    activity_scores.sort(reverse=True)
    for _, activity, gap in activity_scores[:3]:
        activity_label = activity.replace('_', ' ').title()
        top3.append(f"Do {gap} {activity_label}")
    
    if not top3:
        top3.append("Front-load prospecting 30m to stay ahead")
    
    return TrackerSummary(
        dailyTargets=daily_targets,
        gaps=gaps,
        lowValueFlags=low_value_flags,
        top3=top3,
        progress=progress,
        goalPaceGciToDate=goal_pace_gci_to_date,
        requiredDollarsPerDay=required_dollars_per_day,
        activityProgress=activity_progress
    )

# Action Tracker API Endpoints
@api_router.get("/tracker/settings")
async def get_tracker_settings(
    month: str,
    current_user: User = Depends(require_auth)
):
    """Get tracker settings for a specific month"""
    try:
        # Validate month format
        try:
            datetime.strptime(month, '%Y-%m')
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
        
        settings = await db.tracker_settings.find_one({
            "userId": current_user.id,
            "month": month
        })
        
        if not settings:
            # Create default settings
            default_settings = TrackerSettings(
                userId=current_user.id,
                month=month,
                goalType="gci",
                monthlyGciTarget=20000,
                avgGciPerClosing=10000,
                workdays=20
            )
            
            settings_dict = default_settings.dict()
            await db.tracker_settings.insert_one(settings_dict)
            return default_settings
        
        # Remove MongoDB _id and return
        settings.pop('_id', None)
        return TrackerSettings(**settings)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tracker settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/tracker/settings")
async def update_tracker_settings(
    settings: TrackerSettings,
    current_user: User = Depends(require_auth),
    request_obj: Request = None
):
    """Update tracker settings"""
    try:
        # Debug: Log the incoming settings
        logger.info(f"Tracker settings received: {settings.dict()}")
        
        # Automatically set userId from authentication
        settings.userId = current_user.id
        
        # Validate and clamp values
        if settings.goalType not in ['closings', 'gci']:
            raise HTTPException(status_code=400, detail="goalType must be 'closings' or 'gci'")
        
        if settings.goalType == 'gci':
            if not settings.monthlyGciTarget or settings.monthlyGciTarget <= 0:
                raise HTTPException(status_code=400, detail="monthlyGciTarget required for GCI goal")
            if not settings.avgGciPerClosing or settings.avgGciPerClosing <= 0:
                raise HTTPException(status_code=400, detail="avgGciPerClosing required for GCI goal")
        
        if settings.goalType == 'closings':
            if not settings.monthlyClosingsTarget or settings.monthlyClosingsTarget <= 0:
                raise HTTPException(status_code=400, detail="monthlyClosingsTarget required for closings goal")
        
        settings.workdays = max(1, min(settings.workdays, 31))
        settings.earnedGciToDate = max(0, settings.earnedGciToDate)
        
        # Upsert settings
        settings_dict = settings.dict()
        await db.tracker_settings.update_one(
            {"userId": current_user.id, "month": settings.month},
            {"$set": settings_dict},
            upsert=True
        )
        
        await log_audit_event(current_user, AuditAction.UPDATE, {
            "resource_type": "tracker_settings",
            "month": settings.month
        }, request_obj)
        
        return {"ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tracker settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tracker/daily")
async def get_tracker_daily(
    date: str,
    current_user: User = Depends(require_auth)
):
    """Get daily tracker entry and summary"""
    try:
        # Validate date format
        try:
            parsed_date = datetime.strptime(date, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        month = date[:7]  # Extract YYYY-MM
        
        # Get settings for the month
        settings_doc = await db.tracker_settings.find_one({
            "userId": current_user.id,
            "month": month
        })
        
        if not settings_doc:
            raise HTTPException(status_code=404, detail="Tracker settings not found for this month")
        
        settings_doc.pop('_id', None)
        settings = TrackerSettings(**settings_doc)
        
        # Get daily entry
        daily_doc = await db.tracker_daily.find_one({
            "userId": current_user.id,
            "date": date
        })
        
        if not daily_doc:
            # Create default daily entry
            daily_entry = TrackerDaily(
                userId=current_user.id,
                date=date
            )
        else:
            daily_doc.pop('_id', None)
            daily_entry = TrackerDaily(**daily_doc)
        
        # INTEGRATION: Get completed activities from activity_logs for today
        # Activity logs store data as: {activities: {conversations: 4, appointments: 2, ...}, hours: {...}, reflection: '...'}
        activity_logs = await db.activity_logs.find({
            "userId": current_user.id
        }).to_list(length=100)
        
        # Sum up activities from all logs (filter by date if needed)
        completed_activities = {}
        for log in activity_logs:
            log_date = log.get('loggedAt', '')
            # Check if log is from today (simple date comparison)
            if date in log_date:  # If today's date is in the loggedAt timestamp
                activities_dict = log.get('activities', {})
                for activity_name, count in activities_dict.items():
                    # Activity names are stored as: conversations, appointments, newListings, etc.
                    completed_activities[activity_name] = completed_activities.get(activity_name, 0) + count
        
        # Merge with daily_entry.completed (in case there are manually entered values)
        for activity, count in completed_activities.items():
            if activity in settings.activities:
                daily_entry.completed[activity] = daily_entry.completed.get(activity, 0) + count
        
        # Get P&L data if Pro user
        pnl_data = None
        if current_user.plan in ['STARTER', 'PRO']:
            try:
                # This would call the existing P&L endpoint
                # For now, we'll skip it and use earnedGciToDate from settings
                pass
            except:
                pass
        
        # Calculate summary
        summary = calculate_tracker_summary(settings, daily_entry, pnl_data)
        
        return {
            "dailyEntry": daily_entry,
            "summary": summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting daily tracker: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/tracker/daily")
async def save_tracker_daily(
    daily_data: Dict[str, Any],
    current_user: User = Depends(require_auth),
    request_obj: Request = None
):
    """Save daily tracker entry"""
    try:
        required_fields = ['date', 'completed', 'hours']
        for field in required_fields:
            if field not in daily_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Validate date
        try:
            datetime.strptime(daily_data['date'], '%Y-%m-%d')
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Create daily entry
        daily_entry = TrackerDaily(
            userId=current_user.id,
            date=daily_data['date'],
            completed=daily_data['completed'],
            hours=daily_data['hours'],
            reflection=daily_data.get('reflection', '')
        )
        
        # Clamp values
        for activity in daily_entry.completed:
            daily_entry.completed[activity] = max(0, daily_entry.completed[activity])
        
        for category in daily_entry.hours:
            daily_entry.hours[category] = max(0, round(daily_entry.hours[category] * 4) / 4)  # Round to 0.25
        
        # Upsert daily entry
        daily_dict = daily_entry.dict()
        await db.tracker_daily.update_one(
            {"userId": current_user.id, "date": daily_data['date']},
            {"$set": daily_dict},
            upsert=True
        )
        
        # Analytics
        total_hours = sum(daily_entry.hours.values())
        low_value_hours = total_hours - (daily_entry.hours.get('prospecting', 0) + 
                                       daily_entry.hours.get('showings', 0) + 
                                       daily_entry.hours.get('openHouses', 0))
        
        await log_audit_event(current_user, AuditAction.CREATE, {
            "resource_type": "tracker_daily_log",
            "date": daily_data['date'],
            "total_activities": sum(daily_entry.completed.values()),
            "total_hours": total_hours,
            "low_value_hours": low_value_hours
        }, request_obj)
        
        return {"ok": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving daily tracker: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Brand Profile API Endpoints
@api_router.get("/brand/profile")
async def get_brand_profile_endpoint(current_user: User = Depends(require_auth)):
    """Get or create brand profile for authenticated user"""
    try:
        profile = await get_brand_profile(current_user.id)
        if not profile:
            raise HTTPException(status_code=500, detail="Failed to create brand profile")
        
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting brand profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/brand/profile")
async def update_brand_profile_endpoint(
    profile_update: BrandProfileUpdate,
    current_user: User = Depends(require_auth)
):
    """Update brand profile for authenticated user"""
    try:
        # Get existing profile
        existing_profile = await get_brand_profile(current_user.id)
        if not existing_profile:
            raise HTTPException(status_code=500, detail="Failed to get brand profile")
        
        # Prepare update data
        update_data = {"updatedAt": datetime.now(timezone.utc).isoformat()}
        
        if profile_update.agent:
            update_data["agent"] = profile_update.agent.dict()
        
        if profile_update.brokerage:
            update_data["brokerage"] = profile_update.brokerage.dict()
        
        if profile_update.brand:
            update_data["brand"] = profile_update.brand.dict()
        
        if profile_update.footer:
            update_data["footer"] = profile_update.footer.dict()
        
        if profile_update.planRules:
            update_data["planRules"] = profile_update.planRules.dict()
        
        # Update in database
        result = await db.brand_profiles.update_one(
            {"userId": current_user.id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Brand profile not found")
        
        # Get updated profile and recalculate completion
        updated_profile = await get_brand_profile(current_user.id)
        if updated_profile:
            completion_score = calculate_completion_score(updated_profile)
            await db.brand_profiles.update_one(
                {"userId": current_user.id},
                {"$set": {"completion": completion_score}}
            )
            updated_profile.completion = completion_score
        
        return updated_profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating brand profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/brand/upload")
async def upload_brand_asset(
    asset: str = Form(..., description="Asset type: headshot, agentLogo, or brokerLogo"),
    file: UploadFile = File(...),
    current_user: User = Depends(require_auth_form_upload)
):
    """Upload and process brand asset with proper S3 integration"""
    try:
        # Validate asset type
        if asset not in ["headshot", "agentLogo", "brokerLogo"]:
            raise HTTPException(status_code=400, detail="Invalid asset type")
        
        # Check plan restrictions
        if asset in ["agentLogo", "brokerLogo"] and current_user.plan == PlanType.FREE:
            raise HTTPException(
                status_code=402, 
                detail="Logo uploads require a paid plan. Upgrade to Starter or Pro."
            )
        
        # Validate file type
        allowed_mime_types = config.ALLOWED_MIME.split(',')
        if not file.content_type or file.content_type not in allowed_mime_types:
            allowed_types = ", ".join(allowed_mime_types)
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Allowed types: {allowed_types}"
            )
        
        # Read and validate file size
        file_data = await file.read()
        max_size = config.ASSET_MAX_MB * 1024 * 1024  # Convert MB to bytes
        if len(file_data) > max_size:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size is {config.ASSET_MAX_MB}MB"
            )
        
        # Process image based on asset type
        processed_data = process_image_with_pillow(file_data, asset)
        
        # Generate S3 key with timestamp
        timestamp = int(datetime.now().timestamp() * 1000)  # Use Date.now() equivalent
        key = f"user/{current_user.id}/{asset}-{timestamp}.png"
        
        # Upload to S3 or local storage based on configuration
        if s3_client:
            # Production: Upload to S3 directly
            try:
                s3_client.put_object(
                    Bucket=config.S3_BUCKET,
                    Key=key,
                    Body=processed_data,
                    ContentType="image/png"
                )
                # Return S3 URL
                url = f"https://{config.S3_BUCKET}.s3.{config.S3_REGION}.amazonaws.com/{key}"
                logger.info(f"Brand asset uploaded to S3: {key}")
            except Exception as e:
                logger.error(f"S3 upload failed: {e}")
                raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")
        else:
            # Development: Save locally and return placeholder URL
            import os
            
            # Create local uploads directory
            upload_dir = "/tmp/uploads/branding"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Save file locally
            local_filename = f"{current_user.id}-{asset}-{timestamp}.png"
            local_path = os.path.join(upload_dir, local_filename)
            
            with open(local_path, "wb") as f:
                f.write(processed_data)
            
            # Return a local URL for development
            url = f"/api/uploads/branding/{local_filename}"
            logger.info(f"Brand asset saved locally: {local_path}")
        
        # Get image dimensions
        image = Image.open(io.BytesIO(processed_data))
        width, height = image.size
        
        # Update brand profile with new asset
        asset_data = {
            "url": url,
            "w": width,
            "h": height,
            "mime": "image/png",
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        # Update database
        update_field = f"assets.{asset}"
        result = await db.brand_profiles.update_one(
            {"userId": current_user.id},
            {"$set": {
                update_field: asset_data,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Brand profile not found")
        
        # Recalculate completion score
        updated_profile = await get_brand_profile(current_user.id)
        if updated_profile:
            completion_score = calculate_completion_score(updated_profile)
            await db.brand_profiles.update_one(
                {"userId": current_user.id},
                {"$set": {"completion": completion_score}}
            )
        
        return {
            "ok": True,
            "asset": asset,
            "key": key,
            "url": url,
            "width": width,
            "height": height,
            "message": f"{asset} uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading brand asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/uploads/branding/{filename}")
async def serve_branding_file(filename: str):
    """Serve locally uploaded branding files (development only)"""
    import os
    from fastapi.responses import FileResponse
    
    if s3_client:
        raise HTTPException(status_code=404, detail="Local files not available in production")
    
    file_path = f"/tmp/uploads/branding/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verify filename contains user ID for basic security
    if not any(char.isdigit() for char in filename):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    )

@api_router.delete("/brand/asset")
async def delete_brand_asset(
    type: str,
    current_user: User = Depends(require_auth)
):
    """Delete brand asset"""
    try:
        # Validate asset type
        if type not in ["headshot", "agentLogo", "brokerLogo"]:
            raise HTTPException(status_code=400, detail="Invalid asset type")
        
        # Get current profile
        profile = await get_brand_profile(current_user.id)
        if not profile:
            raise HTTPException(status_code=404, detail="Brand profile not found")
        
        # Get asset URL for S3 deletion (optional - we could keep for audit)
        current_asset = getattr(profile.assets, type)
        if current_asset.url:
            # Extract S3 key from URL and attempt deletion
            try:
                key = current_asset.url.split(f"{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/")[1]
                await delete_from_s3(key)
            except Exception as e:
                logger.warning(f"Failed to delete S3 asset: {e}")
        
        # Clear asset in database
        empty_asset = BrandAsset()
        update_field = f"assets.{type}"
        result = await db.brand_profiles.update_one(
            {"userId": current_user.id},
            {"$set": {
                update_field: empty_asset.dict(),
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Brand profile not found")
        
        # Recalculate completion score
        updated_profile = await get_brand_profile(current_user.id)
        if updated_profile:
            completion_score = calculate_completion_score(updated_profile)
            await db.brand_profiles.update_one(
                {"userId": current_user.id},
                {"$set": {"completion": completion_score}}
            )
        
        return {"success": True, "message": f"{type} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting brand asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/brand/test-pdf")
async def generate_test_pdf(
    current_user: User = Depends(require_auth)
):
    """Generate a test PDF with current branding settings"""
    try:
        # Get user's brand profile
        brand_profile = await db.brand_profiles.find_one({"userId": current_user.id})
        
        # Create sample data for test PDF
        test_data = {
            "property_address": "123 Sample Street, Demo City, ST 12345",
            "purchase_price": 450000,
            "monthly_payment": 2156,
            "loan_amount": 405000,
            "down_payment": 45000,
            "interest_rate": 6.5,
            "term_years": 30,
            "property_tax": 375,
            "insurance": 125,
            "pmi": 150,
            "hoa": 0,
            "total_monthly": 2806,
            "client_name": "Sample Client",
            "agent_name": current_user.full_name or "Your Name",
            "agent_email": current_user.email,
            "agent_phone": brand_profile.get("agent", {}).get("phone", "(555) 123-4567") if brand_profile else "(555) 123-4567",
            "license_number": brand_profile.get("agent", {}).get("licenseNumber", "LIC123456") if brand_profile else "LIC123456",
            "brokerage": brand_profile.get("agent", {}).get("brokerage", "Your Brokerage") if brand_profile else "Your Brokerage"
        }
        
        # Generate the HTML content for the test PDF
        html_content = await generate_test_pdf_html(test_data, current_user)
        
        # Generate PDF using WeasyPrint
        pdf_buffer = await generate_pdf_with_weasyprint_from_html(html_content)
        
        # Return the PDF
        filename = f"branding_test_{current_user.id}_{int(time.time())}.pdf"
        
        return Response(
            content=pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_buffer))
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating test PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate test PDF: {str(e)}")

async def generate_test_pdf_html(data: dict, current_user) -> str:
    """Generate HTML for test PDF with branding"""
    
    # Get branding data
    try:
        # This will use the existing brand resolve logic
        brand_data = {}
        if current_user:
            # Use the existing get_brand_profile function
            profile = await get_brand_profile(current_user.id)
            if profile:
                brand_data = {
                    "agentLogo": profile.assets.agentLogo.url if profile.assets.agentLogo.url else "",
                    "brokerLogo": profile.assets.brokerLogo.url if profile.assets.brokerLogo.url else "",
                    "primaryColor": profile.brand.primaryHex,
                    "secondaryColor": profile.brand.secondaryHex
                }
    except Exception:
        brand_data = {}
    
    # Create a sample affordability report HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Branding Test PDF</title>
        <style>
            @page {{
                size: A4;
                margin: 1in;
            }}
            
            body {{
                font-family: Arial, sans-serif;
                color: #333;
                line-height: 1.6;
                margin: 0;
                padding: 0;
            }}
            
            .header {{
                text-align: center;
                border-bottom: 2px solid {brand_data.get("primaryColor", "#4a90e2")};
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            
            .logo {{
                max-height: 80px;
                margin-bottom: 10px;
            }}
            
            .company-info {{
                font-size: 12px;
                color: #666;
            }}
            
            .title {{
                color: {brand_data.get("primaryColor", "#4a90e2")};
                font-size: 24px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
            }}
            
            .section {{
                margin: 20px 0;
                padding: 15px;
                background: #f9f9f9;
                border-left: 4px solid {brand_data.get("primaryColor", "#4a90e2")};
            }}
            
            .section h3 {{
                color: {brand_data.get("primaryColor", "#4a90e2")};
                margin-top: 0;
            }}
            
            .property-details {{
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
            }}
            
            .detail-item {{
                flex: 1;
                min-width: 200px;
            }}
            
            .detail-label {{
                font-weight: bold;
                color: #333;
            }}
            
            .detail-value {{
                font-size: 18px;
                color: {brand_data.get("primaryColor", "#4a90e2")};
            }}
            
            .footer {{
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 20px;
            }}
            
            .highlight-box {{
                background: {brand_data.get("primaryColor", "#4a90e2")};
                color: white;
                padding: 15px;
                text-align: center;
                margin: 20px 0;
            }}
            
            .highlight-box h2 {{
                margin: 0;
                font-size: 28px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            {f'<img src="{brand_data.get("agentLogo", "")}" class="logo" alt="Logo">' if brand_data.get("agentLogo") else ''}
            <h1>Mortgage Affordability Analysis</h1>
            <div class="company-info">
                <strong>{data['agent_name']}</strong><br>
                {data['brokerage']}<br>
                {data['agent_email']} | {data['agent_phone']}<br>
                License: {data['license_number']}
            </div>
        </div>
        
        <div class="title">Sample Property Analysis</div>
        
        <div class="section">
            <h3>Property Information</h3>
            <div class="detail-item">
                <div class="detail-label">Property Address:</div>
                <div class="detail-value">{data['property_address']}</div>
            </div>
            <br>
            <div class="detail-item">
                <div class="detail-label">Purchase Price:</div>
                <div class="detail-value">${data['purchase_price']:,}</div>
            </div>
        </div>
        
        <div class="highlight-box">
            <h2>Monthly Payment: ${data['monthly_payment']:,}</h2>
        </div>
        
        <div class="section">
            <h3>Loan Details</h3>
            <div class="property-details">
                <div class="detail-item">
                    <div class="detail-label">Loan Amount:</div>
                    <div class="detail-value">${data['loan_amount']:,}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Down Payment:</div>
                    <div class="detail-value">${data['down_payment']:,}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Interest Rate:</div>
                    <div class="detail-value">{data['interest_rate']}%</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Term:</div>
                    <div class="detail-value">{data['term_years']} years</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h3>Monthly Payment Breakdown</h3>
            <div class="property-details">
                <div class="detail-item">
                    <div class="detail-label">Principal & Interest:</div>
                    <div class="detail-value">${data['monthly_payment']:,}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Property Tax:</div>
                    <div class="detail-value">${data['property_tax']:,}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Insurance:</div>
                    <div class="detail-value">${data['insurance']:,}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">PMI:</div>
                    <div class="detail-value">${data['pmi']:,}</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: #e8f4fd; border: 2px solid {brand_data.get("primaryColor", "#4a90e2")};">
                <strong>Total Monthly Payment: ${data['total_monthly']:,}</strong>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>This is a sample PDF generated to showcase your branding.</strong></p>
            <p>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
            <p>© {datetime.now().year} {data['brokerage']}. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    return html

@api_router.get("/brand/resolve")
async def resolve_brand_data(
    context: str = "pdf",
    embed: bool = True,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Resolve brand data for PDF generation and other contexts"""
    try:
        if not current_user:
            # Return default branding for anonymous users
            return {
                "agent": {"name": "", "initials": "", "email": "", "phone": ""},
                "brokerage": {"name": "", "license": "", "address": ""},
                "colors": {"primary": "#16a34a", "secondary": "#0ea5e9"},
                "assets": {
                    "headshotPngBase64": "",
                    "agentLogoPngBase64": "",
                    "brokerLogoPngBase64": ""
                },
                "footer": {"compliance": "", "cta": ""},
                "plan": "FREE",
                "show": {
                    "headerBar": False,
                    "agentLogo": False,
                    "brokerLogo": False,
                    "cta": False
                }
            }
        
        # Get user's brand profile
        profile = await get_brand_profile(current_user.id)
        if not profile:
            profile = BrandProfile(
                id=str(uuid.uuid4()),
                userId=current_user.id,
                updatedAt=datetime.now(timezone.utc).isoformat()
            )
        
        # Apply plan-based rules for PDF branding
        plan = current_user.plan.value
        is_paid_user = plan in ["STARTER", "PRO"]  # Only STARTER and PRO get branding
        show_logos = plan in ["STARTER", "PRO"]
        show_cta = plan == "PRO"
        
        # FREE users get generic PDFs, STARTER/PRO get branded PDFs
        if plan == "FREE":
            # Return generic branding for FREE users
            return {
                "agent": {"name": "", "initials": "", "email": "", "phone": ""},
                "brokerage": {"name": "", "license": "", "address": ""},
                "colors": {"primary": "#16a34a", "secondary": "#0ea5e9"},
                "assets": {
                    "headshotPngBase64": "",
                    "agentLogoPngBase64": "",
                    "brokerLogoPngBase64": ""
                },
                "footer": {"compliance": "", "cta": ""},
                "plan": plan,
                "show": {
                    "headerBar": False,
                    "agentLogo": False,
                    "brokerLogo": False,
                    "cta": False
                }
            }
        
        # Prepare agent name
        agent_name = f"{profile.agent.firstName} {profile.agent.lastName}".strip()
        if not agent_name:
            agent_name = current_user.full_name or ""
        
        # Generate agent initials
        agent_initials = ""
        if profile.agent.firstName and profile.agent.lastName:
            agent_initials = f"{profile.agent.firstName[0]}{profile.agent.lastName[0]}".upper()
        elif agent_name:
            # Fallback: use first letter of each word in full name
            name_parts = agent_name.split()
            if len(name_parts) >= 2:
                agent_initials = f"{name_parts[0][0]}{name_parts[1][0]}".upper()
            elif len(name_parts) == 1:
                agent_initials = name_parts[0][0].upper()
        
        # Prepare response
        response_data = {
            "agent": {
                "name": agent_name,
                "initials": agent_initials,
                "email": profile.agent.email or current_user.email,
                "phone": profile.agent.phone
            },
            "brokerage": {
                "name": profile.brokerage.name,
                "license": profile.brokerage.licenseNumber,
                "address": profile.brokerage.address
            },
            "colors": {
                "primary": profile.brand.primaryHex,
                "secondary": profile.brand.secondaryHex
            },
            "footer": {
                "compliance": profile.footer.compliance,
                "cta": profile.footer.cta.replace("{{agent.name}}", agent_name).replace("{{agent.email}}", profile.agent.email or current_user.email)
            },
            "plan": plan,
            "show": {
                "headerBar": is_paid_user,  # Only STARTER/PRO get branded header
                "agentLogo": show_logos and bool(profile.assets.agentLogo.url),
                "brokerLogo": show_logos and bool(profile.assets.brokerLogo.url),
                "cta": show_cta and profile.planRules.proShowCta
            }
        }
        
        # Add assets (as base64 if embed=true, otherwise URLs)
        if embed and context == "pdf":
            # Convert images to base64 for PDF embedding
            assets = {}
            
            # Process headshot
            if profile.assets.headshot.url:
                try:
                    assets["headshotPngBase64"] = await fetch_and_convert_s3_image(
                        profile.assets.headshot.url, 
                        max_size_kb=300  # Smaller size for headshots
                    )
                except Exception as e:
                    logger.warning(f"Failed to fetch headshot: {e}")
                    assets["headshotPngBase64"] = create_transparent_png_fallback()
            else:
                assets["headshotPngBase64"] = create_transparent_png_fallback()
            
            # Process agent logo
            if profile.assets.agentLogo.url and show_logos:
                try:
                    assets["agentLogoPngBase64"] = await fetch_and_convert_s3_image(
                        profile.assets.agentLogo.url,
                        max_size_kb=200  # Logos should be smaller
                    )
                except Exception as e:
                    logger.warning(f"Failed to fetch agent logo: {e}")
                    assets["agentLogoPngBase64"] = create_transparent_png_fallback()
            else:
                assets["agentLogoPngBase64"] = create_transparent_png_fallback()
            
            # Process broker logo
            if profile.assets.brokerLogo.url and show_logos:
                try:
                    assets["brokerLogoPngBase64"] = await fetch_and_convert_s3_image(
                        profile.assets.brokerLogo.url,
                        max_size_kb=200  # Logos should be smaller
                    )
                except Exception as e:
                    logger.warning(f"Failed to fetch broker logo: {e}")
                    assets["brokerLogoPngBase64"] = create_transparent_png_fallback()
            else:
                assets["brokerLogoPngBase64"] = create_transparent_png_fallback()
            
            response_data["assets"] = assets
        else:
            # Return URLs
            response_data["assets"] = {
                "headshotUrl": profile.assets.headshot.url if profile.assets.headshot.url else "",
                "agentLogoUrl": profile.assets.agentLogo.url if profile.assets.agentLogo.url and show_logos else "",
                "brokerLogoUrl": profile.assets.brokerLogo.url if profile.assets.brokerLogo.url and show_logos else ""
            }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving brand data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/storage/health")
async def storage_health_check():
    """Health check for S3 storage connectivity"""
    try:
        if not s3_client:
            # S3 not configured - running in development mode with local storage fallback
            return {
                "ok": True, 
                "storage": "local", 
                "mode": "development",
                "message": "Using local file storage (S3 not configured)"
            }
        
        # Test S3 connection
        is_healthy = await test_s3_connection()
        
        if is_healthy:
            return {
                "ok": True, 
                "storage": "S3", 
                "bucket": config.S3_BUCKET,
                "mode": "production"
            }
        else:
            return {"ok": False, "error": "S3 connection test failed"}
            
    except Exception as e:
        logger.error(f"Storage health check error: {e}")
        return {"ok": False, "error": str(e)}

# P&L Tracker API Endpoints
@api_router.get("/pnl/deals")
async def get_pnl_deals(
    month: str = Query(default=None),
    current_user: User = Depends(require_auth)
) -> List[PnLDeal]:
    """Get all deals for a specific month (defaults to current month)"""
    try:
        # Default to current month if not provided
        if not month:
            month = datetime.now(timezone.utc).strftime("%Y-%m")
            
        deals_cursor = db.pnl_deals.find({
            "user_id": current_user.id,
            "month": month
        }).sort("closing_date", 1)
        
        deals = []
        async for deal_data in deals_cursor:
            deals.append(PnLDeal(**deal_data))
        
        return deals
    except Exception as e:
        logger.error(f"Error fetching P&L deals: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch deals")

@api_router.post("/pnl/deals")
async def create_pnl_deal(
    deal_data: PnLDealCreate,
    current_user: User = Depends(require_auth)
) -> PnLDeal:
    """Create a new P&L deal entry"""
    # Check if user is Pro (P&L is Pro-only feature)
    if current_user.plan not in ["PRO"]:
        raise HTTPException(
            status_code=402,
            detail="P&L Tracker requires a Pro plan. Please upgrade to access this feature."
        )
    
    try:
        # Calculate final income with cap logic: Commission split → Cap commission → Team split
        amount_sold = deal_data.amount_sold_for
        commission_percent = deal_data.commission_percent / 100
        # If split_percent is 0 or empty, default to 100% (agent gets full commission)
        split_percent = (deal_data.split_percent / 100) if deal_data.split_percent and deal_data.split_percent > 0 else 1.0
        team_brokerage_split_percent = deal_data.team_brokerage_split_percent / 100
        
        # Step 1: Calculate gross commission and agent's share after commission split
        gross_commission = amount_sold * commission_percent
        agent_gross_commission = gross_commission * split_percent
        
        # Step 2: Calculate cap deduction using fixed percentage
        cap_amount = 0
        pre_cap_income = agent_gross_commission
        
        # Get user's cap configuration to determine if cap applies
        cap_config = await db.cap_configurations.find_one({
            "user_id": current_user.id
        })
        
        if cap_config:
            # Check if we're within the cap period
            closing_date_obj = datetime.fromisoformat(deal_data.closing_date)
            cap_period_start = datetime.fromisoformat(cap_config["cap_period_start"])
            cap_period_end = datetime.fromisoformat(cap_config["reset_date"])
            
            if cap_period_start <= closing_date_obj <= cap_period_end:
                # Calculate current cap progress
                total_cap = cap_config["annual_cap_amount"]
                cap_percentage = cap_config["cap_percentage"] / 100  # Convert to decimal
                current_cap_paid = cap_config.get("current_cap_paid", 0)
                
                # Find all previous deals in this cap period
                deals_cursor = db.pnl_deals.find({
                    "user_id": current_user.id,
                    "closing_date": {
                        "$gte": cap_period_start.isoformat(),
                        "$lt": closing_date_obj.isoformat()  # Before this deal
                    }
                })
                
                # Sum up cap amounts from previous deals
                async for previous_deal in deals_cursor:
                    current_cap_paid += previous_deal.get("cap_amount", 0)
                
                # Check if cap is not yet complete
                remaining_cap = max(0, total_cap - current_cap_paid)
                
                if remaining_cap > 0:
                    # Apply fixed percentage to agent's commission
                    calculated_cap = agent_gross_commission * cap_percentage
                    # Don't exceed remaining cap obligation
                    cap_amount = min(calculated_cap, remaining_cap)
        
        # Step 3: Apply team/brokerage split to income after cap deduction
        income_after_cap = agent_gross_commission - cap_amount
        final_income = income_after_cap * (1 - team_brokerage_split_percent)
        
        # Extract month from closing date
        closing_date_obj = datetime.fromisoformat(deal_data.closing_date)
        month = f"{closing_date_obj.year}-{closing_date_obj.month:02d}"
        
        # Create deal
        new_deal = PnLDeal(
            user_id=current_user.id,
            house_address=deal_data.house_address,
            amount_sold_for=deal_data.amount_sold_for,
            commission_percent=deal_data.commission_percent,
            split_percent=deal_data.split_percent,
            team_brokerage_split_percent=deal_data.team_brokerage_split_percent,
            lead_source=deal_data.lead_source,
            contract_signed=deal_data.contract_signed,
            due_diligence_start=deal_data.due_diligence_start,
            due_diligence_over=deal_data.due_diligence_over,
            closing_date=deal_data.closing_date,
            month=month,
            cap_amount=cap_amount,
            pre_cap_income=pre_cap_income,
            final_income=final_income
        )
        
        # Save to database
        deal_dict = new_deal.dict()
        await db.pnl_deals.insert_one(deal_dict)
        
        return new_deal
    except Exception as e:
        logger.error(f"Error creating P&L deal: {e}")
        raise HTTPException(status_code=500, detail="Failed to create deal")

@api_router.patch("/pnl/deals/{deal_id}")
async def update_pnl_deal(
    deal_id: str,
    update_data: dict,
    current_user: User = Depends(require_auth)
) -> PnLDeal:
    """Update a P&L deal entry"""
    try:
        # Find the existing deal
        existing_deal = await db.pnl_deals.find_one({
            "id": deal_id,
            "user_id": current_user.id
        })
        
        if not existing_deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        # Update only the provided fields
        update_fields = {}
        for field, value in update_data.items():
            if field in ["amount_sold_for", "commission_percent", "split_percent", "team_brokerage_split_percent"]:
                update_fields[field] = float(value)
            elif field in ["house_address", "lead_source", "closing_date"]:
                update_fields[field] = str(value)
        
        # Recalculate final income if any financial fields were updated
        if any(field in update_fields for field in ["amount_sold_for", "commission_percent", "split_percent", "team_brokerage_split_percent"]):
            amount_sold = update_fields.get("amount_sold_for", existing_deal["amount_sold_for"])
            commission_percent = (update_fields.get("commission_percent", existing_deal["commission_percent"])) / 100
            split_percent = (update_fields.get("split_percent", existing_deal["split_percent"]) / 100) if update_fields.get("split_percent", existing_deal["split_percent"]) > 0 else 1.0
            team_brokerage_split_percent = (update_fields.get("team_brokerage_split_percent", existing_deal["team_brokerage_split_percent"])) / 100
            
            # Recalculate with cap logic (simplified for updates - keep existing cap_amount)
            gross_commission = amount_sold * commission_percent
            agent_gross_commission = gross_commission * split_percent
            cap_amount = existing_deal.get("cap_amount", 0)  # Keep existing cap amount
            
            pre_cap_income = agent_gross_commission
            income_after_cap = agent_gross_commission - cap_amount
            final_income = income_after_cap * (1 - team_brokerage_split_percent)
            
            update_fields["pre_cap_income"] = pre_cap_income
            update_fields["final_income"] = final_income
        
        # Update the deal
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.pnl_deals.update_one(
            {"id": deal_id, "user_id": current_user.id},
            {"$set": update_fields}
        )
        
        # Return updated deal
        updated_deal_data = await db.pnl_deals.find_one({
            "id": deal_id,
            "user_id": current_user.id
        })
        
        return PnLDeal(**updated_deal_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating P&L deal: {e}")
        raise HTTPException(status_code=500, detail="Failed to update deal")

@api_router.delete("/pnl/deals/{deal_id}")
async def delete_pnl_deal(
    deal_id: str,
    current_user: User = Depends(require_auth)
):
    """Delete a P&L deal entry"""
    try:
        result = await db.pnl_deals.delete_one({
            "id": deal_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        return {"message": "Deal deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting P&L deal: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete deal")

@api_router.get("/pnl/active-deals")
async def get_active_deals(
    current_user: User = Depends(require_auth)
):
    """Get all deals that haven't closed yet (closing_date >= today)"""
    try:
        # Get today's date in YYYY-MM-DD format
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Find all deals where closing_date >= today
        deals_cursor = db.pnl_deals.find({
            "user_id": current_user.id,
            "closing_date": {"$gte": today}
        }).sort("closing_date", 1)
        
        deals = []
        async for deal_data in deals_cursor:
            deals.append(PnLDeal(**deal_data))
        
        return deals
    except Exception as e:
        logger.error(f"Error fetching active deals: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch active deals")

@api_router.get("/pnl/expenses")
async def get_pnl_expenses(
    month: str = Query(default=None),
    current_user: User = Depends(require_auth)
) -> List[PnLExpense]:
    """Get all expenses for a specific month (defaults to current month)"""
    try:
        # Default to current month if not provided
        if not month:
            month = datetime.now(timezone.utc).strftime("%Y-%m")
            
        expenses_cursor = db.pnl_expenses.find({
            "user_id": current_user.id,
            "month": month
        }).sort("date", 1)
        
        expenses = []
        async for expense_data in expenses_cursor:
            expenses.append(PnLExpense(**expense_data))
        
        return expenses
    except Exception as e:
        logger.error(f"Error fetching P&L expenses: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch expenses")

@api_router.post("/pnl/expenses")
async def create_pnl_expense(
    expense_data: PnLExpenseCreate,
    current_user: User = Depends(require_auth)
) -> PnLExpense:
    """Create a new P&L expense entry"""
    # Check if user is Pro (P&L is Pro-only feature)
    if current_user.plan not in ["PRO"]:
        raise HTTPException(
            status_code=402,
            detail="P&L Tracker requires a Pro plan. Please upgrade to access this feature."
        )
    
    try:
        # Extract month from date
        expense_date_obj = datetime.fromisoformat(expense_data.date)
        month = f"{expense_date_obj.year}-{expense_date_obj.month:02d}"
        
        # Calculate recurring_until if this is a recurring expense (end of current year)
        recurring_until = None
        if expense_data.recurring:
            recurring_until = f"{expense_date_obj.year}-12"
        
        # Create main expense
        new_expense = PnLExpense(
            user_id=current_user.id,
            date=expense_data.date,
            category=expense_data.category,
            budget=expense_data.budget or 0,
            amount=expense_data.amount,
            description=expense_data.description,
            month=month,
            recurring=expense_data.recurring,
            recurring_until=recurring_until,
            is_recurring_instance=False,
            original_expense_id=None
        )
        
        # Save main expense to database
        expense_dict = new_expense.dict()
        await db.pnl_expenses.insert_one(expense_dict)
        
        # If recurring, create expenses for all remaining months in the year
        if expense_data.recurring:
            current_month = expense_date_obj.month
            current_year = expense_date_obj.year
            
            for month_num in range(current_month + 1, 13):  # From next month to December
                recurring_date = f"{current_year}-{month_num:02d}-{expense_date_obj.day:02d}"
                recurring_month = f"{current_year}-{month_num:02d}"
                
                # Create recurring instance
                recurring_expense = PnLExpense(
                    user_id=current_user.id,
                    date=recurring_date,
                    category=expense_data.category,
                    budget=expense_data.budget or 0,
                    amount=expense_data.amount,
                    description=expense_data.description,
                    month=recurring_month,
                    recurring=False,  # Individual instances are not recurring themselves
                    recurring_until=None,
                    is_recurring_instance=True,
                    original_expense_id=new_expense.id
                )
                
                # Save recurring instance
                recurring_dict = recurring_expense.dict()
                await db.pnl_expenses.insert_one(recurring_dict)
        
        return new_expense
    except Exception as e:
        logger.error(f"Error creating P&L expense: {e}")
        raise HTTPException(status_code=500, detail="Failed to create expense")

@api_router.patch("/pnl/expenses/{expense_id}")
async def update_pnl_expense(
    expense_id: str,
    update_data: dict,
    current_user: User = Depends(require_auth)
) -> PnLExpense:
    """Update a P&L expense entry"""
    try:
        # Find the existing expense
        existing_expense = await db.pnl_expenses.find_one({
            "id": expense_id,
            "user_id": current_user.id
        })
        
        if not existing_expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        # Update only the provided fields
        update_fields = {}
        for field, value in update_data.items():
            if field in ["amount", "budget"]:
                update_fields[field] = float(value)
            elif field in ["category", "description", "date"]:
                update_fields[field] = str(value)
        
        # Update the expense
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.pnl_expenses.update_one(
            {"id": expense_id, "user_id": current_user.id},
            {"$set": update_fields}
        )
        
        # Return updated expense
        updated_expense_data = await db.pnl_expenses.find_one({
            "id": expense_id,
            "user_id": current_user.id
        })
        
        return PnLExpense(**updated_expense_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating P&L expense: {e}")
        raise HTTPException(status_code=500, detail="Failed to update expense")

@api_router.delete("/pnl/expenses/{expense_id}")
async def delete_pnl_expense(
    expense_id: str,
    current_user: User = Depends(require_auth)
):
    """Delete a P&L expense entry"""
    try:
        # First, find the expense to check if it's recurring
        expense = await db.pnl_expenses.find_one({
            "id": expense_id,
            "user_id": current_user.id
        })
        
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        # Delete the main expense
        result = await db.pnl_expenses.delete_one({
            "id": expense_id,
            "user_id": current_user.id
        })
        
        # If this was a recurring expense, delete all its recurring instances
        if expense.get("recurring", False):
            await db.pnl_expenses.delete_many({
                "original_expense_id": expense_id,
                "user_id": current_user.id
            })
            return {"message": "Recurring expense and all instances deleted successfully"}
        
        # If this was a recurring instance, just delete this one
        return {"message": "Expense deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting P&L expense: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete expense")

@api_router.get("/pnl/categories")
async def get_expense_categories(
    current_user: User = Depends(require_auth)
) -> List[str]:
    """Get all expense categories (predefined + user custom)"""
    try:
        # Predefined categories
        predefined_categories = [
            "Marketing & Advertising",
            "Lead Generation", 
            "Client Entertainment",
            "Transportation",
            "Office Supplies",
            "Professional Development",
            "Technology & Software",
            "Insurance",
            "Legal & Professional Fees",
            "Other Business Expenses"
        ]
        
        # Get user custom categories
        custom_categories_cursor = db.pnl_expense_categories.find({
            "user_id": current_user.id,
            "is_predefined": False
        })
        
        custom_categories = []
        async for category_data in custom_categories_cursor:
            custom_categories.append(category_data["name"])
        
        # Combine and return
        all_categories = predefined_categories + custom_categories
        return sorted(all_categories)
    except Exception as e:
        logger.error(f"Error fetching expense categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")

@api_router.get("/pnl/lead-sources")
async def get_lead_sources(
    current_user: User = Depends(require_auth)
) -> List[str]:
    """Get all available lead sources"""
    try:
        lead_sources = [
            "Zillow",
            "Family",
            "Friends",
            "Referral",
            "Existing Client",
            "Referral - Past Client",
            "Referral - Agent",
            "Online Lead (Realtor.com)",
            "Social Media",
            "Open House",
            "Cold Calling/Prospecting",
            "Direct Marketing",
            "Sign Calls",
            "Other"
        ]
        return lead_sources
    except Exception as e:
        logger.error(f"Error fetching lead sources: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch lead sources")

@api_router.post("/pnl/categories")
async def create_expense_category(
    category_data: PnLExpenseCategoryCreate,
    current_user: User = Depends(require_auth)
) -> dict:
    """Create a new custom expense category"""
    try:
        # Check if category already exists
        existing = await db.pnl_expense_categories.find_one({
            "user_id": current_user.id,
            "name": category_data.name
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Category already exists")
        
        # Create new category
        new_category = PnLExpenseCategory(
            user_id=current_user.id,
            name=category_data.name,
            is_predefined=False
        )
        
        # Save to database
        category_dict = new_category.dict()
        await db.pnl_expense_categories.insert_one(category_dict)
        
        return {"message": "Category created successfully", "name": category_data.name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating expense category: {e}")
        raise HTTPException(status_code=500, detail="Failed to create category")

@api_router.get("/pnl/budgets")
async def get_pnl_budgets(
    month: str,
    current_user: User = Depends(require_auth)
) -> Dict[str, float]:
    """Get all budgets for a specific month"""
    try:
        budgets_cursor = db.pnl_budgets.find({
            "user_id": current_user.id,
            "month": month
        })
        
        budgets = {}
        async for budget_data in budgets_cursor:
            budgets[budget_data["category"]] = budget_data["monthly_budget"]
        
        return budgets
    except Exception as e:
        logger.error(f"Error fetching P&L budgets: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch budgets")

@api_router.post("/pnl/budgets")
async def update_pnl_budget(
    budget_data: PnLBudgetCreate,
    month: str,
    current_user: User = Depends(require_auth)
) -> dict:
    """Update budget for a specific category and month"""
    try:
        # Upsert budget
        await db.pnl_budgets.update_one(
            {
                "user_id": current_user.id,
                "category": budget_data.category,
                "month": month
            },
            {
                "$set": {
                    "monthly_budget": budget_data.monthly_budget,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "user_id": current_user.id,
                    "category": budget_data.category,
                    "month": month,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {"message": "Budget updated successfully"}
    except Exception as e:
        logger.error(f"Error updating P&L budget: {e}")
        raise HTTPException(status_code=500, detail="Failed to update budget")

@api_router.get("/pnl/summary")
async def get_pnl_summary(
    month: str,
    current_user: User = Depends(require_auth)
) -> PnLSummary:
    """Get P&L summary for a specific month"""
    try:
        # Get deals
        deals_cursor = db.pnl_deals.find({
            "user_id": current_user.id,
            "month": month
        }).sort("closing_date", 1)
        
        deals = []
        total_income = 0
        async for deal_data in deals_cursor:
            deal = PnLDeal(**deal_data)
            deals.append(deal)
            total_income += deal.final_income
        
        # Get expenses
        expenses_cursor = db.pnl_expenses.find({
            "user_id": current_user.id,
            "month": month
        }).sort("date", 1)
        
        expenses = []
        total_expenses = 0
        expense_by_category = {}
        async for expense_data in expenses_cursor:
            expense = PnLExpense(**expense_data)
            expenses.append(expense)
            total_expenses += expense.amount
            
            if expense.category not in expense_by_category:
                expense_by_category[expense.category] = 0
            expense_by_category[expense.category] += expense.amount
        
        # Get budgets
        budgets_cursor = db.pnl_budgets.find({
            "user_id": current_user.id,
            "month": month
        })
        
        budgets = {}
        async for budget_data in budgets_cursor:
            budgets[budget_data["category"]] = budget_data["monthly_budget"]
        
        # Calculate budget utilization
        budget_utilization = {}
        for category, spent in expense_by_category.items():
            budget = budgets.get(category, 0)
            budget_utilization[category] = {
                "budget": budget,
                "spent": spent,
                "remaining": budget - spent,
                "percent": (spent / budget * 100) if budget > 0 else 0
            }
        
        # Calculate net income
        net_income = total_income - total_expenses
        
        return PnLSummary(
            month=month,
            total_income=total_income,
            total_expenses=total_expenses,
            net_income=net_income,
            deals=deals,
            expenses=expenses,
            budget_utilization=budget_utilization
        )
    except Exception as e:
        logger.error(f"Error fetching P&L summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch P&L summary")

@api_router.get("/pnl/export")
async def export_pnl_data(
    month: Optional[str] = None,
    year: Optional[str] = None,
    format: str = "excel",
    current_user: User = Depends(require_auth)
):
    """Export P&L data to Excel format"""
    # Check if user is Pro (P&L is Pro-only feature)
    if current_user.plan not in ["PRO"]:
        raise HTTPException(
            status_code=402,
            detail="P&L export requires a Pro plan. Please upgrade to access this feature."
        )
    
    try:
        # This would implement Excel export functionality
        # For now, return a placeholder response
        return {
            "message": "Export functionality coming soon",
            "month": month,
            "year": year,
            "format": format
        }
    except Exception as e:
        logger.error(f"Error exporting P&L data: {e}")
        raise HTTPException(status_code=500, detail="Failed to export P&L data")

# Commission Cap Tracker API Endpoints
@api_router.get("/cap-tracker/config")
async def get_cap_configuration(
    current_user: User = Depends(require_auth)
) -> CapConfiguration:
    """Get user's cap configuration"""
    try:
        config = await db.cap_configurations.find_one({
            "user_id": current_user.id
        })
        
        if not config:
            raise HTTPException(status_code=404, detail="Cap configuration not found")
        
        return CapConfiguration(**config)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching cap configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cap configuration")

@api_router.post("/cap-tracker/config")
async def create_or_update_cap_configuration(
    config_data: CapConfigurationCreate,
    current_user: User = Depends(require_auth)
) -> CapConfiguration:
    """Create or update cap configuration"""
    # Check if user is Pro (Cap Tracker is Pro-only feature)
    if current_user.plan not in ["PRO"]:
        raise HTTPException(
            status_code=402,
            detail="Cap Tracker requires a Pro plan. Please upgrade to access this feature."
        )
    
    try:
        # Check if configuration already exists
        existing_config = await db.cap_configurations.find_one({
            "user_id": current_user.id
        })
        
        if existing_config:
            # Update existing configuration
            update_fields = {
                "annual_cap_amount": config_data.annual_cap_amount,
                "cap_percentage": config_data.cap_percentage,
                "cap_period_type": config_data.cap_period_type,
                "cap_period_start": config_data.cap_period_start,
                "current_cap_paid": config_data.current_cap_paid or 0,
                "reset_date": config_data.reset_date,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.cap_configurations.update_one(
                {"user_id": current_user.id},
                {"$set": update_fields}
            )
            
            # Return updated configuration
            updated_config = await db.cap_configurations.find_one({
                "user_id": current_user.id
            })
            return CapConfiguration(**updated_config)
        else:
            # Create new configuration
            new_config = CapConfiguration(
                user_id=current_user.id,
                annual_cap_amount=config_data.annual_cap_amount,
                cap_percentage=config_data.cap_percentage,
                cap_period_type=config_data.cap_period_type,
                cap_period_start=config_data.cap_period_start,
                current_cap_paid=config_data.current_cap_paid or 0,
                reset_date=config_data.reset_date
            )
            
            config_dict = new_config.dict()
            await db.cap_configurations.insert_one(config_dict)
            
            return new_config
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating/updating cap configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to save cap configuration")

@api_router.get("/cap-tracker/progress")
async def get_cap_progress(
    current_user: User = Depends(require_auth)
) -> CapProgress:
    """Get current cap progress"""
    try:
        # Get cap configuration
        config = await db.cap_configurations.find_one({
            "user_id": current_user.id
        })
        
        if not config:
            raise HTTPException(status_code=404, detail="Cap configuration not found")
        
        # Calculate cap progress from deals within the cap period
        cap_period_start = datetime.fromisoformat(config["cap_period_start"])
        cap_period_end = datetime.fromisoformat(config["reset_date"])
        
        # Find all deals within the cap period
        deals_cursor = db.pnl_deals.find({
            "user_id": current_user.id,
            "closing_date": {
                "$gte": cap_period_start.isoformat(),
                "$lte": cap_period_end.isoformat()
            }
        })
        
        total_cap_paid = config.get("current_cap_paid", 0)  # Manual adjustment
        deals_contributing = 0
        
        async for deal in deals_cursor:
            total_cap_paid += deal.get("cap_amount", 0)
            if deal.get("cap_amount", 0) > 0:
                deals_contributing += 1
        
        total_cap = config["annual_cap_amount"]
        remaining = max(0, total_cap - total_cap_paid)
        percentage = (total_cap_paid / total_cap * 100) if total_cap > 0 else 0
        is_complete = total_cap_paid >= total_cap
        
        return CapProgress(
            total_cap=total_cap,
            paid_so_far=total_cap_paid,
            remaining=remaining,
            percentage=min(100, percentage),
            is_complete=is_complete,
            deals_contributing=deals_contributing
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating cap progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate cap progress")

# AI Coach API Endpoints
@api_router.get("/ai-coach/profile")
async def get_coaching_profile(
    current_user: User = Depends(require_auth)
) -> CoachingProfile:
    """Get user's coaching profile"""
    try:
        profile = await db.coaching_profiles.find_one({
            "user_id": current_user.id
        })
        
        if not profile:
            raise HTTPException(status_code=404, detail="Coaching profile not found")
        
        return CoachingProfile(**profile)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching coaching profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch coaching profile")

@api_router.post("/ai-coach/profile")
async def create_coaching_profile(
    profile_data: CoachingProfileCreate,
    current_user: User = Depends(require_auth)
) -> CoachingProfile:
    """Create or update coaching profile"""
    try:
        # Get cap configuration if exists
        cap_config = await db.cap_configurations.find_one({
            "user_id": current_user.id
        })
        
        commission_cap_cents = 0
        cap_year_start = None
        if cap_config:
            commission_cap_cents = int((cap_config.get("annual_cap_amount", 0)) * 100)
            cap_year_start = cap_config.get("cap_period_start")
        
        # Check if profile exists
        existing_profile = await db.coaching_profiles.find_one({
            "user_id": current_user.id
        })
        
        if existing_profile:
            # Update existing
            update_fields = profile_data.dict()
            update_fields.update({
                "commission_cap_cents": commission_cap_cents,
                "cap_year_start": cap_year_start,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            await db.coaching_profiles.update_one(
                {"user_id": current_user.id},
                {"$set": update_fields}
            )
            
            updated_profile = await db.coaching_profiles.find_one({
                "user_id": current_user.id
            })
            return CoachingProfile(**updated_profile)
        else:
            # Create new
            new_profile = CoachingProfile(
                user_id=current_user.id,
                commission_cap_cents=commission_cap_cents,
                cap_year_start=cap_year_start,
                **profile_data.dict()
            )
            
            profile_dict = new_profile.dict()
            await db.coaching_profiles.insert_one(profile_dict)
            
            return new_profile
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating coaching profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to create coaching profile")

@api_router.get("/ai-coach/weekly-metrics")
async def get_weekly_metrics(
    limit: int = 12,
    current_user: User = Depends(require_auth)
) -> List[WeeklyMetrics]:
    """Get last N weeks of metrics"""
    try:
        # Get metrics ordered by week_of descending, limit to last N weeks
        metrics_cursor = db.weekly_metrics.find({
            "user_id": current_user.id
        }).sort("week_of", -1).limit(limit)
        
        metrics = []
        async for metric_data in metrics_cursor:
            metrics.append(WeeklyMetrics(**metric_data))
        
        # Reverse to get oldest to newest as required
        return list(reversed(metrics))
        
    except Exception as e:
        logger.error(f"Error fetching weekly metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch weekly metrics")

@api_router.post("/ai-coach/generate")
async def generate_ai_coach_response(
    current_user: User = Depends(require_auth)
) -> AICoachResponse:
    """Generate AI coach response"""
    import json
    import hashlib
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    
    try:
        # Get goal settings (new source of coaching data)
        goal_settings = await db.goal_settings.find_one({
            "userId": current_user.id
        })
        
        if not goal_settings or (not goal_settings.get("annualGciGoal") and not goal_settings.get("monthlyGciTarget")):
            # Return setup response
            return AICoachResponse(
                coaching_text="Welcome! I'm your personal real estate coach, ready to help you achieve your goals and maximize your productivity.\n\nTo get started, I need you to set up your goals in the Goal Settings tab. Once you've configured your annual GCI goal, monthly targets, and average commission per closing, I'll be able to analyze your performance and provide personalized coaching insights.\n\nI'll help you identify where to focus your energy, spot patterns in your activity, and create a strategic plan to reach your targets. Think of me as your personal mentor who's always watching your numbers and ready to guide you toward success.\n\nGo ahead and set up your goals, then come back here for your personalized coaching session!"
            )
        
        # Get recent activity logs (last 30 entries)
        activity_logs_cursor = db.activity_logs.find({
            "userId": current_user.id
        }).sort("loggedAt", -1).limit(30)
        
        activity_logs = []
        async for log_data in activity_logs_cursor:
            activity_logs.append({
                "loggedAt": log_data.get("loggedAt"),
                "activities": log_data.get("activities", {}),
                "hours": log_data.get("hours", {}),
                "reflection": log_data.get("reflection")
            })
        
        # Get recent reflection logs (last 15 entries)
        reflection_logs_cursor = db.reflection_logs.find({
            "userId": current_user.id
        }).sort("loggedAt", -1).limit(15)
        
        reflection_logs = []
        async for reflection_data in reflection_logs_cursor:
            reflection_logs.append({
                "loggedAt": reflection_data.get("loggedAt"),
                "reflection": reflection_data.get("reflection"),
                "mood": reflection_data.get("mood")
            })
        
        # Get weekly metrics (last 12 weeks) - keep existing for backward compatibility
        metrics_cursor = db.weekly_metrics.find({
            "user_id": current_user.id
        }).sort("week_of", -1).limit(12)
        
        weekly_metrics = []
        async for metric_data in metrics_cursor:
            weekly_metrics.append(metric_data)
        
        # Reverse to get oldest to newest
        weekly_metrics = list(reversed(weekly_metrics))
        
        # Check if we have any activity data to analyze
        has_activity_data = bool(activity_logs or reflection_logs or weekly_metrics)
        
        if not has_activity_data:
            # Return data collection response
            return AICoachResponse(
                coaching_text="I can see you have your goals set up - that's a great start! Your annual GCI goal of ${:,} and monthly target of ${:,} show you're serious about your success.\n\nHowever, I don't have any activity data to analyze yet. To provide you with personalized coaching insights, I need you to start logging your daily activities in the Action Tracker.\n\nHere's what I recommend you track:\n• Outbound calls made - This tracks your lead generation effort\n• New conversations started - This measures your conversion funnel\n• Appointments scheduled - This shows your progress toward deals\n• Deals created and closed - This tracks your income progress\n\nOnce you start logging this data, I'll be able to analyze your patterns, identify what's working, spot areas for improvement, and give you specific recommendations to hit your goals. Think of me as your personal coach who's always watching your numbers and ready to guide you toward success!".format(
                    int(goal_settings.get("annualGciGoal", 0) or 0),
                    int(goal_settings.get("monthlyGciTarget", 0) or 0)
                )
            )
        
        # Generate cache key including all data sources
        goal_settings_str = json.dumps(goal_settings, sort_keys=True, default=str)
        activity_logs_str = json.dumps(activity_logs, sort_keys=True, default=str)
        reflection_logs_str = json.dumps(reflection_logs, sort_keys=True, default=str)
        metrics_str = json.dumps(weekly_metrics, sort_keys=True, default=str)
        cache_key = hashlib.md5(f"{current_user.id}:{goal_settings_str}:{activity_logs_str}:{reflection_logs_str}:{metrics_str}:v2".encode()).hexdigest()
        
        # Check cache first
        cached_response = await db.ai_coach_cache.find_one({
            "user_id": current_user.id,
            "cache_key": cache_key,
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        
        if cached_response:
            # Handle both old and new cache formats
            response_data = cached_response["response_data"]
            if "coaching_text" in response_data:
                return AICoachResponse(**response_data)
            else:
                # Convert old format to new format
                return AICoachResponse(coaching_text=response_data.get("summary", "Cached coaching data needs refresh. Please click retry."))
        
        # Prepare data for LLM
        coaching_profile = {
            "userId": current_user.id,
            "market": "General",  # Default market since we're using goal_settings now
            "commissionCapCents": 0,  # Will be pulled from separate cap tracker if needed
            "capYearStart": None,
            "goals": {
                "annualGCI": goal_settings.get("annualGciGoal", 0) or 0,
                "monthlyGCITarget": goal_settings.get("monthlyGciTarget", 0) or 0,
                "avgGciPerClosing": goal_settings.get("avgGciPerClosing", 0) or 0,
                "earnedGciToDate": goal_settings.get("earnedGciToDate", 0) or 0,
                "workdaysThisMonth": goal_settings.get("workdays", 20)
            },
            "constraints": {
                "goalType": goal_settings.get("goalType", "gci")
            }
        }
        
        weekly_metrics_formatted = []
        for metric in weekly_metrics:
            weekly_metrics_formatted.append({
                "weekOf": metric.get("week_of"),
                "dealsCreated": metric.get("deals_created", 0),
                "dealsClosed": metric.get("deals_closed", 0),
                "gciCents": metric.get("gci_cents", 0),
                "capRemainingCents": metric.get("cap_remaining_cents", 0),
                "callsMade": metric.get("calls_made", 0),
                "newConversations": metric.get("new_conversations", 0),
                "appointments": metric.get("appointments", 0),
                "avgDaysToClose": metric.get("avg_days_to_close", 0),
                "pipelineValueCents": metric.get("pipeline_value_cents", 0)
            })
        
        # Initialize OpenAI client
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=openai_api_key)
        
        system_message = """You are an experienced real estate sales coach and mentor. Write a comprehensive, thoughtful analysis of the user's current situation, goals, and performance. Think through their data like ChatGPT would - be conversational, insightful, and strategic.

Analyze their goals, recent activity, deals, and performance data. Write your thoughts in a flowing, natural way that covers:
- Current goal progress and gaps
- Activity patterns and what's working/not working  
- Strategic recommendations for focus areas
- Specific next steps and priorities
- Encouragement and motivation

Write in first person as their personal coach. Be direct but encouraging. Use natural paragraphs, not bullet points. Reference specific numbers from their data when relevant. Keep it conversational but professional - like you're their mentor giving them honest feedback and a strategic plan.

All monetary values are provided in dollars. Format money with commas and dollar sign when mentioning them (e.g., $25,000 not $25,000.00).

Write 3-4 substantial paragraphs. Be specific and actionable based on their actual data."""
        
        # Create user message with all their data
        user_content = f"""Here's my current situation as a real estate agent. Please analyze this data and give me your honest coaching insights and strategic recommendations:

GOALS:
{json.dumps(coaching_profile.get('goals', {}), indent=2)}

RECENT ACTIVITY LOGS (Daily entries with specific activities and hours):
{json.dumps(activity_logs, indent=2) if activity_logs else "No activity logs available"}

RECENT REFLECTION LOGS (Daily thoughts and insights):
{json.dumps(reflection_logs, indent=2) if reflection_logs else "No reflection logs available"}

WEEKLY METRICS (Historical performance data):
{json.dumps(weekly_metrics_formatted, indent=2) if weekly_metrics_formatted else "No weekly metrics available"}

Please analyze my activity patterns, reflection insights, and goal progress. Write your coaching thoughts and strategic plan for me. Be specific about what I should focus on to reach my goals."""
        
        # Get response from OpenAI
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_content}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        llm_response = response.choices[0].message.content
        
        # Create response object with the coaching text
        coach_response = AICoachResponse(coaching_text=llm_response)
        
        # Cache the response (expires in 24 hours)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        cache_entry = AICoachCache(
            user_id=current_user.id,
            cache_key=cache_key,
            response_data={"coaching_text": llm_response},
            expires_at=expires_at
        )
        
        await db.ai_coach_cache.insert_one(cache_entry.dict())
        
        return coach_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating AI coach response: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate coaching insights")

# Goal Settings Models and Endpoints
class GoalSettings(BaseModel):
    userId: str = Field(default="")
    goalType: str = "gci"
    annualGciGoal: Optional[int] = None
    monthlyGciTarget: Optional[float] = None
    avgGciPerClosing: Optional[float] = None
    workdays: int = 20
    earnedGciToDate: float = 0
    updatedAt: Optional[str] = None

@api_router.get("/goal-settings")
async def get_goal_settings(current_user: User = Depends(require_auth)):
    """Get user's goal settings"""
    try:
        goal_settings = await db.goal_settings.find_one({"userId": current_user.id})
        
        if not goal_settings:
            # Return default settings if none exist
            return GoalSettings(userId=current_user.id).dict()
        
        # Remove MongoDB ObjectId for clean response
        goal_settings.pop('_id', None)
        return goal_settings
        
    except Exception as e:
        logger.error(f"Error fetching goal settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch goal settings")

@api_router.post("/goal-settings") 
async def update_goal_settings(
    goal_data: GoalSettings,
    current_user: User = Depends(require_auth),
    request_obj: Request = None
):
    """Update user's goal settings"""
    try:
        # Set user ID and timestamp
        goal_data.userId = current_user.id
        goal_data.updatedAt = datetime.now(timezone.utc).isoformat()
        
        # Convert to dict for MongoDB
        goal_dict = goal_data.dict()
        
        # Update or insert goal settings
        result = await db.goal_settings.update_one(
            {"userId": current_user.id},
            {"$set": goal_dict},
            upsert=True
        )
        
        # Log audit event
        await log_audit_event(
            current_user, 
            AuditAction.UPDATE,
            {"component": "goal_settings", "action": "Updated goal settings"},
            request_obj
        )
        
        logger.info(f"Goal settings updated for user: {current_user.id}")
        
        # Return updated settings
        goal_dict.pop('_id', None)  # Remove MongoDB ObjectId
        return goal_dict
        
    except Exception as e:
        logger.error(f"Error updating goal settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update goal settings")

# Activity Logging Models and Endpoints
class ActivityLogEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str = Field(default="")
    loggedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    activities: Dict[str, int] = Field(default_factory=dict)  # e.g. {"conversations": 5, "appointments": 2}
    hours: Dict[str, float] = Field(default_factory=dict)  # e.g. {"prospecting": 2.5, "admin": 1.0}
    reflection: Optional[str] = None

class ReflectionLogEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str = Field(default="")
    loggedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    reflection: str
    mood: Optional[str] = None  # "great", "good", "okay", "challenging"

@api_router.post("/activity-log")
async def create_activity_log(
    log_data: ActivityLogEntry,
    current_user: User = Depends(require_auth)
):
    """Create a new activity log entry"""
    try:
        # Set user ID and timestamp
        log_data.userId = current_user.id
        log_data.loggedAt = datetime.now(timezone.utc).isoformat()
        
        # Convert to dict for MongoDB
        log_dict = log_data.dict()
        
        # Insert log entry
        result = await db.activity_logs.insert_one(log_dict)
        
        logger.info(f"Activity log created for user: {current_user.id}")
        
        # Return created log entry
        log_dict['_id'] = str(result.inserted_id)
        return log_dict
        
    except Exception as e:
        logger.error(f"Error creating activity log: {e}")
        raise HTTPException(status_code=500, detail="Failed to create activity log")

@api_router.get("/activity-logs")
async def get_activity_logs(
    current_user: User = Depends(require_auth),
    limit: int = 50
):
    """Get user's activity logs"""
    try:
        # Get logs sorted by most recent first
        logs_cursor = db.activity_logs.find(
            {"userId": current_user.id}
        ).sort("loggedAt", -1).limit(limit)
        
        logs = []
        async for log in logs_cursor:
            log['_id'] = str(log['_id'])
            logs.append(log)
        
        return logs
        
    except Exception as e:
        logger.error(f"Error fetching activity logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch activity logs")

@api_router.patch("/activity-log/{log_id}")
async def update_activity_log(
    log_id: str,
    updates: Dict,
    current_user: User = Depends(require_auth)
):
    """Update an activity log entry (inline editing)"""
    try:
        # Update the log entry
        result = await db.activity_logs.update_one(
            {"id": log_id, "userId": current_user.id},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Activity log not found")
        
        # Return updated log
        updated_log = await db.activity_logs.find_one({"id": log_id, "userId": current_user.id})
        updated_log['_id'] = str(updated_log['_id'])
        
        return updated_log
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating activity log: {e}")
        raise HTTPException(status_code=500, detail="Failed to update activity log")

@api_router.post("/reflection-log")
async def create_reflection_log(
    reflection_data: ReflectionLogEntry,
    current_user: User = Depends(require_auth)
):
    """Create a new reflection log entry"""
    try:
        # Set user ID and timestamp
        reflection_data.userId = current_user.id
        reflection_data.loggedAt = datetime.now(timezone.utc).isoformat()
        
        # Convert to dict for MongoDB
        reflection_dict = reflection_data.dict()
        
        # Insert reflection entry
        result = await db.reflection_logs.insert_one(reflection_dict)
        
        logger.info(f"Reflection log created for user: {current_user.id}")
        
        # Return created reflection entry
        reflection_dict['_id'] = str(result.inserted_id)
        return reflection_dict
        
    except Exception as e:
        logger.error(f"Error creating reflection log: {e}")
        raise HTTPException(status_code=500, detail="Failed to create reflection log")

@api_router.get("/reflection-logs")
async def get_reflection_logs(
    current_user: User = Depends(require_auth),
    limit: int = 30
):
    """Get user's reflection logs"""
    try:
        # Get reflections sorted by most recent first
        reflections_cursor = db.reflection_logs.find(
            {"userId": current_user.id}
        ).sort("loggedAt", -1).limit(limit)
        
        reflections = []
        async for reflection in reflections_cursor:
            reflection['_id'] = str(reflection['_id'])
            reflections.append(reflection)
        
        return reflections
        
    except Exception as e:
        logger.error(f"Error fetching reflection logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reflection logs")

@api_router.patch("/reflection-log/{log_id}")
async def update_reflection_log(
    log_id: str,
    updates: Dict,
    current_user: User = Depends(require_auth)
):
    """Update a reflection log entry (inline editing)"""
    try:
        # Update the reflection entry
        result = await db.reflection_logs.update_one(
            {"id": log_id, "userId": current_user.id},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Reflection log not found")
        
        # Return updated reflection
        updated_reflection = await db.reflection_logs.find_one({"id": log_id, "userId": current_user.id})
        updated_reflection['_id'] = str(updated_reflection['_id'])
        
        return updated_reflection
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating reflection log: {e}")
        raise HTTPException(status_code=500, detail="Failed to update reflection log")

@api_router.get("/health")
async def api_health_check():
    """Basic health check endpoint - lightweight for load balancers"""
    return {
        "ok": True,
        "version": APP_VERSION,
        "environment": config.NODE_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/ready")
async def readiness_check():
    """
    Comprehensive readiness check - verifies all dependencies.
    Use this for deployment validation and deep health monitoring.
    """
    checks = {}
    overall_ready = True
    
    # Database connectivity check
    try:
        if db is not None:
            start_time = time.time()
            # Try a simple operation with timeout
            result = db.command("ping")
            response_time = round((time.time() - start_time) * 1000, 2)
            checks["database"] = {"status": "ok", "response_time_ms": response_time}
        else:
            checks["database"] = {"status": "error", "error": "Database not configured"}
            overall_ready = False
    except Exception as e:
        checks["database"] = {"status": "error", "error": str(e)[:100]}
        overall_ready = False
    
    # MongoDB cache connectivity check
    try:
        if 'cache' in globals() and cache and cache.is_connected():
            start_time = time.time()
            # Test cache connectivity using is_connected method
            cache.is_connected()
            response_time = round((time.time() - start_time) * 1000, 2)
            checks["cache"] = {"status": "ok", "response_time_ms": response_time}
        else:
            checks["cache"] = {"status": "warning", "error": "MongoDB cache not available"}
            # Cache is not required in development
            if config.NODE_ENV == "production":
                overall_ready = False
    except Exception as e:
        checks["cache"] = {"status": "error", "error": str(e)[:100]}
        if config.NODE_ENV == "production":
            overall_ready = False
    
    # S3 connectivity check (if configured)
    try:
        if config.S3_BUCKET and s3_client:
            start_time = time.time()
            # Test with a lightweight operation
            test_key = f"healthcheck/{uuid.uuid4()}"
            test_data = b"health-check"
            
            s3_client.put_object(
                Bucket=config.S3_BUCKET,
                Key=test_key,
                Body=test_data,
                ServerSideEncryption="AES256"
            )
            
            # Clean up test object
            s3_client.delete_object(Bucket=config.S3_BUCKET, Key=test_key)
            
            response_time = round((time.time() - start_time) * 1000, 2)
            checks["s3"] = {"status": "ok", "response_time_ms": response_time}
        else:
            checks["s3"] = {"status": "not_configured"}
    except Exception as e:
        checks["s3"] = {"status": "error", "error": str(e)[:100]}
        # S3 is optional, don't fail overall readiness
    
    # Stripe API connectivity check
    try:
        if config.STRIPE_API_KEY:
            start_time = time.time()
            # Test with a lightweight Stripe operation
            stripe.Account.retrieve()
            response_time = round((time.time() - start_time) * 1000, 2)
            checks["stripe"] = {"status": "ok", "response_time_ms": response_time}
        else:
            checks["stripe"] = {"status": "not_configured"}
    except Exception as e:
        checks["stripe"] = {"status": "error", "error": str(e)[:100]}
        # Stripe errors don't fail overall readiness (payment optional)
    
    # OpenAI API connectivity check
    try:
        if config.OPENAI_API_KEY:
            # Note: We don't test OpenAI here to avoid costs and rate limits
            # Just verify the key format is valid
            if config.OPENAI_API_KEY.startswith('sk-'):
                checks["openai"] = {"status": "configured"}
            else:
                checks["openai"] = {"status": "error", "error": "Invalid API key format"}
        else:
            checks["openai"] = {"status": "not_configured"}
    except Exception as e:
        checks["openai"] = {"status": "error", "error": str(e)[:100]}
    
    return Response(
        content=json.dumps({
            "ready": overall_ready,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": APP_VERSION,
            "environment": config.NODE_ENV,
            "checks": checks
        }),
        status_code=200 if overall_ready else 503,
        media_type="application/json"
    )

# Include new AI Coach router
try:
    from app.routes.ai_coach import router as ai_coach_router
    api_router.include_router(ai_coach_router, prefix="/ai-coach-v2", tags=["ai_coach_v2"])
    logger.info("New AI Coach router mounted at /api/ai-coach-v2")
except ImportError as e:
    logger.warning(f"Could not import new AI Coach router: {e}")
except Exception as e:
    logger.error(f"Error mounting AI Coach router: {e}")

# Include secure plans router for Stripe webhooks
try:
    from app.routes.plans import router as plans_router
    api_router.include_router(plans_router, prefix="", tags=["plans"])
    logger.info("Secure plans router mounted for Stripe webhooks")
except ImportError as e:
    logger.error(f"Could not import plans router: {e}")
    if config.is_production():
        sys.exit(1)
except Exception as e:
    logger.error(f"Error mounting plans router: {e}")
    if config.is_production():
        sys.exit(1)

# Admin User Management Endpoints
class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    plan: PlanType
    password: str

class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    plan: str
    status: str
    role: Optional[str]
    created_at: str
    last_login: Optional[str]
    deals_count: int = 0
    stripe_customer_id: Optional[str] = None

@api_router.get("/admin/users")
async def admin_get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    plan_filter: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(require_master_admin)
):
    """Get all users with filtering and pagination (admin only)"""
    try:
        # Build query filters
        query = {}
        
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"full_name": {"$regex": search, "$options": "i"}},
                {"id": {"$regex": search, "$options": "i"}}
            ]
        
        if plan_filter and plan_filter != "all":
            query["plan"] = plan_filter
            
        if status_filter and status_filter != "all":
            query["status"] = status_filter
        
        # Sort direction
        sort_direction = -1 if sort_order == "desc" else 1
        
        # Get total count for pagination
        total_users = await db.users.count_documents(query)
        
        # Calculate pagination
        skip = (page - 1) * limit
        total_pages = math.ceil(total_users / limit)
        
        # Get users with pagination and sorting
        users_cursor = db.users.find(query).sort(sort_by, sort_direction).skip(skip).limit(limit)
        
        users = []
        async for user_data in users_cursor:
            try:
                # Convert datetime fields to strings for JSON serialization
                user_dict = dict(user_data)
                
                # Ensure 'id' field exists - skip user if missing
                if "id" not in user_dict or user_dict["id"] is None:
                    logger.warning(f"Skipping user {user_dict.get('email', 'UNKNOWN')} - missing 'id' field")
                    continue
                
                # Handle datetime fields
                for field in ["created_at", "updated_at", "last_login"]:
                    if field in user_dict and user_dict[field]:
                        if isinstance(user_dict[field], datetime):
                            user_dict[field] = user_dict[field].isoformat()
                        elif isinstance(user_dict[field], str):
                            # Already a string, keep as is
                            pass
                        else:
                            user_dict[field] = str(user_dict[field])
                
                # Get deals count for this user (with error handling)
                try:
                    deals_count = await db.pnl_deals.count_documents({"user_id": user_dict["id"]})
                except Exception as deals_error:
                    logger.warning(f"Could not fetch deals count for user {user_dict['id']}: {deals_error}")
                    deals_count = 0
                
                admin_user = AdminUserResponse(
                    id=user_dict["id"],
                    email=user_dict["email"],
                    full_name=user_dict.get("full_name"),
                    plan=user_dict.get("plan", "FREE"),
                    status=user_dict.get("status", "active"),
                    role=user_dict.get("role", "user"),
                    created_at=user_dict.get("created_at", ""),
                    last_login=user_dict.get("last_login"),
                    deals_count=deals_count,
                    stripe_customer_id=user_dict.get("stripe_customer_id")
                )
                users.append(admin_user)
            except Exception as user_error:
                logger.error(f"Error processing user {user_data.get('email', 'UNKNOWN')}: {user_error}")
                # Continue processing other users even if one fails
                continue
        
        return {
            "users": users,
            "total": total_users,
            "pages": total_pages,
            "current_page": page,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@api_router.post("/admin/users")
async def admin_create_user(
    user_data: CreateUserRequest,
    current_user: User = Depends(require_master_admin)
) -> AdminUserResponse:
    """Create a new user (admin only)"""
    try:
        # Check if user already exists
        existing_user = await get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="User with this email already exists"
            )
        
        # Hash the password
        hashed_password = hash_password(user_data.password)
        
        # Create new user
        new_user = User(
            id=str(uuid.uuid4()),
            email=user_data.email,
            full_name=user_data.full_name,
            plan=user_data.plan,
            hashed_password=hashed_password,
            status=UserStatus.ACTIVE,
            role=UserRole.USER,  # Default role for admin-created users
            created_at=datetime.now(timezone.utc).isoformat(),
            deals_count=0
        )
        
        # Save to database
        user_dict = new_user.dict()
        await db.users.insert_one(user_dict)
        
        logger.info(f"Admin {current_user.email} created new user: {user_data.email}")
        
        # Return the created user
        return AdminUserResponse(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            plan=new_user.plan,
            status=new_user.status,
            role=new_user.role,
            created_at=new_user.created_at,
            last_login=None,
            deals_count=0,
            stripe_customer_id=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    plan: Optional[PlanType] = None
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(
    user_id: str,
    update_data: UpdateUserRequest,
    current_user: User = Depends(require_master_admin)
) -> AdminUserResponse:
    """Update a user (admin only)"""
    try:
        # Find the user to update
        target_user = await db.users.find_one({"id": user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent admins from demoting themselves or other master admins
        if target_user["id"] == current_user.id:
            if update_data.role and update_data.role != UserRole.MASTER_ADMIN:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot change your own admin role"
                )
        
        # Build update fields
        update_fields = {}
        if update_data.full_name is not None:
            update_fields["full_name"] = update_data.full_name
        if update_data.plan is not None:
            update_fields["plan"] = update_data.plan
        if update_data.status is not None:
            update_fields["status"] = update_data.status
        if update_data.role is not None:
            update_fields["role"] = update_data.role
        
        if update_fields:
            update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": update_fields}
            )
        
        # Get updated user
        updated_user = await db.users.find_one({"id": user_id})
        
        # Convert datetime fields to strings
        user_dict = dict(updated_user)
        for field in ["created_at", "updated_at", "last_login"]:
            if field in user_dict and user_dict[field]:
                if isinstance(user_dict[field], datetime):
                    user_dict[field] = user_dict[field].isoformat()
        
        # Get deals count
        deals_count = await db.pnl_deals.count_documents({"user_id": user_id})
        
        logger.info(f"Admin {current_user.email} updated user: {target_user['email']}")
        
        return AdminUserResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            full_name=user_dict.get("full_name"),
            plan=user_dict["plan"],
            status=user_dict.get("status", "active"),
            role=user_dict.get("role"),
            created_at=user_dict.get("created_at", ""),
            last_login=user_dict.get("last_login"),
            deals_count=deals_count,
            stripe_customer_id=user_dict.get("stripe_customer_id")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    current_user: User = Depends(require_master_admin)
):
    """Delete a user (admin only)"""
    try:
        # Find the user to delete
        target_user = await db.users.find_one({"id": user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent self-deletion
        if target_user["id"] == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete your own account"
            )
        
        # Prevent deletion of other master admins (safety measure)
        if target_user.get("role") == UserRole.MASTER_ADMIN:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete master admin accounts"
            )
        
        # Delete user's related data
        await db.pnl_deals.delete_many({"user_id": user_id})
        await db.pnl_expenses.delete_many({"user_id": user_id})
        await db.goal_settings.delete_many({"userId": user_id})
        await db.activity_logs.delete_many({"userId": user_id})
        await db.reflection_logs.delete_many({"userId": user_id})
        await db.brand_profiles.delete_many({"user_id": user_id})
        
        # Delete the user
        result = await db.users.delete_one({"id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Admin {current_user.email} deleted user: {target_user['email']}")
        

        return {"success": True, "message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")


@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(
    user_id: str,
    reset_data: Dict[str, str],
    request: Request,
    current_user: User = Depends(require_master_admin)
):
    """
    Reset a user's password (admin only).
    Includes enhanced audit logging and notifications.
    """
    try:
        # Find the user
        target_user = await db.users.find_one({"id": user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get new password from request
        new_password = reset_data.get("new_password")
        if not new_password or len(new_password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters"
            )
        
        # Hash the new password
        password_hash = hash_password(new_password)
        
        # Update user password
        await db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "hashed_password": password_hash,
                    "password_changed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Enhanced audit logging - who did it, when, and to whom
        await db.audit_logs.insert_one({
            "user_id": user_id,
            "user_email": target_user['email'],
            "action": "admin_password_reset",
            "admin_user_id": current_user.id,
            "admin_user_email": current_user.email,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ip_address": request.client.host if request.client else None,
            "metadata": {
                "target_user_email": target_user['email'],
                "reset_by_admin": current_user.email,
                "reset_reason": reset_data.get("reason", "Admin password reset")
            }
        })
        
        logger.info(f"🔐 ADMIN ACTION: {current_user.email} reset password for user: {target_user['email']}")
        
        # TODO: In production, send email notification to user
        # notify_user_password_reset(target_user['email'], current_user.email)
        
        return {
            "success": True,
            "message": "Password reset successfully",
            "user_notified": False,  # Set to True when email is implemented
            "reset_by": current_user.email,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")



@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    page: int = 1,
    limit: int = 50,
    action_filter: str = None,
    user_email: str = None,
    current_user: User = Depends(require_master_admin)
):
    """Get audit logs (admin only)"""
    try:
        # Build query
        query = {}
        if action_filter:
            query["action"] = action_filter
        if user_email:
            query["user_email"] = {"$regex": user_email, "$options": "i"}
        
        # Get total count
        total = await db.audit_logs.count_documents(query)
        
        # Get logs with pagination
        skip = (page - 1) * limit
        logs_cursor = db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        logs = []
        
        async for log in logs_cursor:
            log_dict = dict(log)
            
            # Convert ObjectId to string if present
            if "_id" in log_dict:
                log_dict["_id"] = str(log_dict["_id"])
            
            # Convert datetime to ISO string
            if "timestamp" in log_dict and log_dict["timestamp"]:
                if isinstance(log_dict["timestamp"], datetime):
                    log_dict["timestamp"] = log_dict["timestamp"].isoformat()
            
            logs.append(log_dict)
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit logs")



        return {"message": "User deleted successfully", "deleted_user_id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

@api_router.patch("/admin/users/{user_id}/status")
async def admin_change_user_status(
    user_id: str,
    status: UserStatus,
    current_user: User = Depends(require_master_admin)
):
    """Change user status (admin only)"""
    try:
        # Find the user
        target_user = await db.users.find_one({"id": user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent status change of self or other master admins
        if target_user["id"] == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="Cannot change your own status"
            )
        
        if target_user.get("role") == UserRole.MASTER_ADMIN:
            raise HTTPException(
                status_code=400,
                detail="Cannot change status of master admin accounts"
            )
        
        # Update user status
        await db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "status": status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"Admin {current_user.email} changed status of {target_user['email']} to {status}")
        
        return {"message": f"User status changed to {status}", "user_id": user_id, "status": status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing user status: {e}")
        raise HTTPException(status_code=500, detail="Failed to change user status")

# TEMPORARY MIGRATION ENDPOINT - REMOVE AFTER USE
@api_router.post("/migrate/users")
async def migrate_users_to_atlas(request: Request):
    """
    ONE-TIME MIGRATION: Copy users from local MongoDB to Atlas
    Protected by admin key in header
    """
    # Security check - require admin migration key
    migration_key = request.headers.get("X-Migration-Key")
    expected_key = "MIGRATE_USERS_2024_SECURE_KEY"
    
    if migration_key != expected_key:
        raise HTTPException(
            status_code=403, 
            detail="Unauthorized: Invalid migration key"
        )
    
    try:
        # Import at the function level to avoid conflicts
        import pymongo
        
        logger.info("Starting user migration from local to Atlas")
        
        # Connect to local MongoDB (source)
        local_client = pymongo.MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=5000)
        local_db = local_client["test_database"]
        local_users = local_db.users
        
        # Count users in local
        local_count = local_users.count_documents({})
        logger.info(f"Found {local_count} users in local database")
        
        if local_count == 0:
            local_client.close()
            return {
                "success": False,
                "message": "No users found in local database",
                "local_users": 0,
                "atlas_users_before": 0,
                "migrated": 0
            }
        
        # Get all users from local
        users_to_migrate = list(local_users.find({}))
        
        # Count users in Atlas before migration
        atlas_count_before = await db.users.count_documents({})
        logger.info(f"Atlas users before migration: {atlas_count_before}")
        
        # Insert users into Atlas (using backend's db connection)
        migrated_count = 0
        migrated_emails = []
        
        for user in users_to_migrate:
            try:
                # Check if user already exists
                existing = await db.users.find_one({"email": user["email"]})
                if not existing:
                    await db.users.insert_one(user)
                    migrated_count += 1
                    migrated_emails.append(user["email"])
                    logger.info(f"Migrated user: {user['email']}")
                else:
                    logger.info(f"User already exists: {user['email']}")
            except Exception as user_error:
                logger.error(f"Failed to migrate user {user.get('email', 'unknown')}: {user_error}")
        
        # Verify migration
        atlas_count_after = await db.users.count_documents({})
        
        # Verify specific test user exists
        test_user = await db.users.find_one({"email": "bmccr@msn.com"})
        test_user_found = test_user is not None
        
        logger.info(f"Migration completed: {migrated_count} users migrated")
        logger.info(f"Atlas users after migration: {atlas_count_after}")
        
        # Close local connection
        local_client.close()
        
        return {
            "success": True,
            "message": "User migration completed successfully",
            "local_users": local_count,
            "atlas_users_before": atlas_count_before,
            "atlas_users_after": atlas_count_after,
            "migrated": migrated_count,
            "migrated_emails": migrated_emails,
            "test_user_bmccr_found": test_user_found
        }
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)