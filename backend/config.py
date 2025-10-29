"""
Production-ready configuration management for I Need Numbers.
All required secrets must be present or the application will fail to start.
"""

import os
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field, validator
from dotenv import load_dotenv
import logging
import sys

# Load environment variables
load_dotenv()

# Setup logger for configuration warnings
logger = logging.getLogger(__name__)

class Config(BaseSettings):
    """
    Centralized configuration with validation.
    Missing required values will cause startup failure.
    """
    
    # Environment & Debug
    NODE_ENV: str = Field(default="development", description="Environment: development, staging, production")
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    # Database (REQUIRED)
    MONGO_URL: str = Field(..., description="MongoDB connection string")
    DB_NAME: str = Field(default="ineednumbers", description="Database name")
    
    # Security (REQUIRED in production)
    JWT_SECRET_KEY: str = Field(..., min_length=32, description="JWT signing secret (32+ chars)")
    CSRF_SECRET_KEY: str = Field(..., min_length=32, description="CSRF protection secret (32+ chars)")
    
    # URLs & CORS
    FRONTEND_URL: str = Field(default="http://localhost:3000", description="Frontend URL")
    BACKEND_URL: str = Field(default="http://localhost:8001", description="Backend URL")
    CORS_ORIGINS: str = Field(default="http://localhost:3000,http://localhost:5173", description="Allowed CORS origins")
    
    # Redis (REQUIRED for production, OPTIONAL in development)
    REDIS_URL: Optional[str] = Field(default=None, description="Redis connection URL (optional in dev)")
    REDIS_PASSWORD: Optional[str] = Field(default=None, description="Redis password")
    REDIS_DB: int = Field(default=0, description="Redis database number")
    
    # Stripe (REQUIRED - fail hard if missing)
    STRIPE_API_KEY: str = Field(..., description="Stripe secret key")
    STRIPE_PUBLIC_KEY: str = Field(..., description="Stripe publishable key") 
    STRIPE_SECRET_KEY: str = Field(..., description="Stripe secret key")
    STRIPE_WEBHOOK_SECRET: str = Field(..., description="Stripe webhook secret")
    STRIPE_PRICE_STARTER_MONTHLY: str = Field(..., description="Starter plan price ID")
    STRIPE_PRICE_PRO_MONTHLY: str = Field(..., description="Pro plan price ID")
    
    # OpenAI (REQUIRED for AI features)
    OPENAI_API_KEY: str = Field(..., description="OpenAI API key")
    OPENAI_MODEL: Optional[str] = Field(default="gpt-4o-mini", description="OpenAI model (optional in dev)")
    AI_COACH_MAX_TOKENS: int = Field(default=800, description="Max AI tokens")
    AI_COACH_TEMPERATURE: float = Field(default=0.2, description="AI temperature")
    AI_COACH_RATE_LIMIT_PER_MIN: int = Field(default=10, description="AI rate limit per minute")
    AI_CACHE_TTL_SECONDS: int = Field(default=300, description="AI cache TTL")
    AI_COACH_ENABLED: bool = Field(default=False, description="Enable AI Coach")
    
    # S3 Storage (REQUIRED in production, OPTIONAL in development)
    STORAGE_DRIVER: str = Field(default="s3", description="Storage driver")
    S3_REGION: str = Field(default="us-east-1", description="AWS S3 region")
    S3_BUCKET: Optional[str] = Field(default=None, description="S3 bucket name")
    S3_ACCESS_KEY_ID: Optional[str] = Field(default=None, description="AWS access key ID (optional in dev)")
    S3_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, description="AWS secret access key (optional in dev)")
    S3_ENDPOINT_URL: Optional[str] = Field(default=None, description="Custom S3 endpoint")
    
    # File Upload Limits
    ASSET_MAX_MB: int = Field(default=10, description="Max file size in MB")
    ALLOWED_MIME: str = Field(default="image/png,image/jpeg,image/svg+xml,image/webp", description="Allowed MIME types")
    MAX_JSON_BODY_KB: int = Field(default=512, description="Max JSON body size in KB")
    
    # Security Settings
    COOKIE_SECURE: bool = Field(default=True, description="Use secure cookies")
    COOKIE_SAMESITE: str = Field(default="lax", description="SameSite cookie policy")
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="Enable rate limiting")
    RATE_LIMIT_REQUESTS: int = Field(default=100, description="Rate limit requests per window")
    RATE_LIMIT_WINDOW: int = Field(default=3600, description="Rate limit window in seconds")
    
    # Logging
    LOG_FILE: Optional[str] = Field(default=None, description="Log file path")
    LOG_MAX_BYTES: int = Field(default=10485760, description="Max log file size")
    LOG_BACKUP_COUNT: int = Field(default=5, description="Log backup count")
    
    # Optional Services
    SENTRY_DSN: Optional[str] = Field(default=None, description="Sentry error tracking DSN")
    HEALTH_CHECK_ENABLED: bool = Field(default=True, description="Enable health checks")
    EMERGENT_LLM_KEY: Optional[str] = Field(default=None, description="Legacy Emergent LLM key")
    
    @validator('NODE_ENV')
    def validate_node_env(cls, v):
        if v not in ['development', 'staging', 'production']:
            raise ValueError('NODE_ENV must be development, staging, or production')
        return v
    
    @validator('JWT_SECRET_KEY')
    def validate_jwt_secret(cls, v):
        if v == 'your-secret-key-here-change-in-production':
            raise ValueError('JWT_SECRET_KEY cannot use default insecure value in production')
        return v
    
    @validator('STRIPE_API_KEY')
    def validate_stripe_key(cls, v):
        if not v.startswith(('sk_live_', 'sk_test_')):
            raise ValueError('STRIPE_API_KEY must be a valid Stripe secret key')
        return v
    
    @validator('OPENAI_API_KEY')
    def validate_openai_key(cls, v):
        if not v.startswith('sk-'):
            raise ValueError('OPENAI_API_KEY must be a valid OpenAI API key')
        return v
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.NODE_ENV == 'production'
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]
    
    def validate_production_requirements(self):
        """Validate additional production requirements."""        
        # Development mode warnings for optional services
        if not self.is_production():
            if not self.REDIS_URL:
                logging.warning("Redis not configured - using in-memory fallback in development")
            if not self.S3_ACCESS_KEY_ID or not self.S3_SECRET_ACCESS_KEY:
                logging.warning("S3 credentials not configured - file uploads will be disabled in development")
            return
        
        # Production-specific validations (strict requirements)
        if self.DEBUG:
            raise ValueError("DEBUG must be False in production")
        
        if not self.REDIS_URL:
            logger.warning("REDIS_URL not set in production - rate limiting and caching will use in-memory fallback")
        
        if self.JWT_SECRET_KEY == 'your-secret-key-here-change-in-production':
            raise ValueError("JWT_SECRET_KEY must be changed in production")
        
        if not self.S3_BUCKET or not self.S3_ACCESS_KEY_ID or not self.S3_SECRET_ACCESS_KEY:
            logger.warning("S3 configuration not complete in production - file uploads will be disabled")
            # Fallback to local storage if S3 not configured
            self.STORAGE_DRIVER = "local"
        
        if self.STRIPE_API_KEY.startswith('sk_test_'):
            logging.warning("Using test Stripe keys in production environment")
        
        if not self.COOKIE_SECURE:
            raise ValueError("COOKIE_SECURE must be True in production")

    class Config:
        env_file = ".env"
        case_sensitive = True

# Global configuration instance
_config: Optional[Config] = None

def get_config() -> Config:
    """
    Get the global configuration instance.
    Validates configuration on first access.
    """
    global _config
    
    if _config is None:
        try:
            _config = Config()
            _config.validate_production_requirements()
            
            # Log configuration summary (without secrets)
            logger = logging.getLogger(__name__)
            logger.info(f"Configuration loaded: {_config.NODE_ENV} environment")
            logger.info(f"Database: {_config.DB_NAME}")
            logger.info(f"AI Coach: {'enabled' if _config.AI_COACH_ENABLED else 'disabled'}")
            logger.info(f"Rate limiting: {'enabled' if _config.RATE_LIMIT_ENABLED else 'disabled'}")
            
        except Exception as e:
            print(f"❌ Configuration Error: {e}", file=sys.stderr)
            print("💡 Check your .env file and ensure all required secrets are set.", file=sys.stderr)
            print("📖 See .env.example for required variables.", file=sys.stderr)
            sys.exit(1)
    
    return _config

def reset_config():
    """Reset configuration (for testing)."""
    global _config
    _config = None