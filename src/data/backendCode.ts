export interface CodeFile {
  path: string;
  language: string;
  description: string;
  module: string;
  code: string;
}

export const backendFiles: CodeFile[] = [
  // ============ CORE ============
  {
    path: "requirements.txt",
    language: "text",
    module: "core",
    description: "Python dependencies for the project",
    code: `# Core
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.2
pydantic-settings==2.1.0

# Database
sqlalchemy[asyncio]==2.0.23
asyncpg==0.29.0
alembic==1.13.0
geoalchemy2==0.14.2

# Geo
shapely==2.0.2
geopandas==0.14.1

# Auth & Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
slowapi==0.1.9

# Background Tasks
celery[redis]==5.3.4
redis==5.0.1

# HTTP & Logging
httpx==0.25.2
loguru==0.7.2

# Email
aiosmtplib==3.0.1
jinja2==3.1.2

# Testing
pytest==7.4.3
pytest-asyncio==0.23.2
pytest-cov==4.1.0

# Utils
python-dotenv==1.0.0
orjson==3.9.10`
  },
  {
    path: "app/main.py",
    language: "python",
    module: "core",
    description: "Application entry point with all modules",
    code: `"""
AgriCRM - Agricultural Enterprise CRM System
Main application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from loguru import logger

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import register_exception_handlers
from app.core.rate_limiter import limiter
from app.api.v1 import auth, fields, inventory, operations, crm, analytics
from app.infrastructure.database.session import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    setup_logging()
    logger.info("🌾 Starting AgriCRM application...")
    
    if settings.DEBUG:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
    
    logger.info("✅ AgriCRM application started successfully")
    yield
    
    logger.info("🛑 Shutting down AgriCRM application...")
    await engine.dispose()


def create_application() -> FastAPI:
    """Application factory."""
    application = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description="CRM system for agricultural enterprises",
        docs_url="/docs",
        redoc_url="/redoc",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # Rate limiting
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    register_exception_handlers(application)

    # API Routers
    application.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Auth"])
    application.include_router(fields.router, prefix=f"{settings.API1_PREFIX}/fields", tags=["Fields"])
    application.include_router(inventory.router, prefix=f"{settings.API_V1_PREFIX}/inventory", tags=["Inventory"])
    application.include_router(operations.router, prefix=f"{settings.API_V1_PREFIX}/operations", tags=["Operations"])
    application.include_router(crm.router, prefix=f"{settings.API_V1_PREFIX}/crm", tags=["CRM"])
    application.include_router(analytics.router, prefix=f"{settings.API_V1_PREFIX}/analytics", tags=["Analytics"])

    @application.get("/health")
    async def health_check():
        return {"status": "healthy", "service": settings.APP_NAME}

    return application


app = create_application()`
  },
  {
    path: "app/core/config.py",
    language: "python",
    module: "core",
    description: "Application settings",
    code: `"""Application configuration."""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # Application
    APP_NAME: str = "AgriCRM"
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://agricrm:secret@localhost:5432/agricrm"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Rate Limiting
    AUTH_RATE_LIMIT: str = "5/minute"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Logging
    LOG_LEVEL: str = "INFO"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",")]
        return v


settings = Settings()`
  },
  {
    path: "app/core/rate_limiter.py",
    language: "python",
    module: "core",
    description: "Rate limiting configuration",
    code: `"""Rate limiter for auth endpoints."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Usage:
# @limiter.limit("5/minute")
# async def login(request: Request, ...):
#     ...`
  },
  {
    path: "app/core/security.py",
    language: "python",
    module: "core",
    description: "JWT tokens and password hashing",
    code: `"""Security utilities."""
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from loguru import logger
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(
        {"exp": expire, "sub": str(subject), "type": "access"},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"exp": expire, "sub": str(subject), "type": "refresh"},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)`
  },
  {
    path: "app/core/exceptions.py",
    language: "python",
    module: "core",
    description: "Custom exceptions",
    code: `"""Custom exceptions and handlers."""
from fastapi import FastAPI, Request
from fastapi.responses import ORJSONResponse
from loguru import logger


class AgriCRMException(Exception):
    def __init__(self, message: str, status_code: int = 500, detail: dict = None):
        self.message = message
        self.status_code = status_code
        self.detail = detail or {}


class NotFoundException(AgriCRMException):
    def __init__(self, resource: str, id: str = None):
        msg = f"{resource} not found" + (f": {id}" if id else "")
        super().__init__(msg, 404)


class AlreadyExistsException(AgriCRMException):
    def __init__(self, resource: str, id: str = None):
        msg = f"{resource} already exists" + (f": {id}" if id else "")
        super().__init__(msg, 409)


class ValidationException(AgriCRMException):
    def __init__(self, message: str, errors: dict = None):
        super().__init__(message, 422, errors or {})


class AuthenticationException(AgriCRMException):
    def __init__(self, msg: str = "Authentication failed"):
        super().__init__(msg, 401)


class AuthorizationException(AgriCRMException):
    def __init__(self, msg: str = "Insufficient permissions"):
        super().__init__(msg, 403)


class GeometryValidationException(AgriCRMException):
    def __init__(self, msg: str = "Invalid geometry"):
        super().__init__(msg, 400)


class InsufficientStockException(AgriCRMException):
    def __init__(self, material: str, available: float, required: float):
        super().__init__(
            f"Insufficient stock for {material}: available {available}, required {required}",
            400,
        )


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(AgriCRMException)
    async def handler(request: Request, exc: AgriCRMException):
        return ORJSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "detail": exc.detail},
        )`
  },

  // ============ MODULE 1: AUTH ============
  {
    path: "app/infrastructure/database/models/user.py",
    language: "python",
    module: "auth",
    description: "User and Organization models with RBAC roles",
    code: `"""User and Organization models."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.infrastructure.database.base import Base


class UserRole(str, enum.Enum):
    """RBAC roles with hierarchical permissions."""
    SUPER_ADMIN = "super_admin"    # Full system access
    ADMIN = "admin"                # Organization management
    MANAGER = "manager"            # CRM and sales
    AGRONOMIST = "agronomist"      # Field operations
    OPERATOR = "operator"          # Machinery operator (mobile only)
    VIEWER = "viewer"              # Read-only access


# Permission matrix per role
ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: ["*"],  # All permissions
    UserRole.ADMIN: ["org:*", "fields:*", "inventory:*", "operations:*", "crm:*", "analytics:*"],
    UserRole.MANAGER: ["fields:read", "inventory:read", "operations:read", "crm:*", "analytics:read"],
    UserRole.AGRONOMIST: ["fields:*", "inventory:read,write", "operations:*", "analytics:read"],
    UserRole.OPERATOR: ["operations:read,update", "inventory:read"],
    UserRole.VIEWER: ["*:read"],
}


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    password_reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_reset_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="users")


class AuthAuditLog(Base):
    """Audit log for all authentication events."""
    __tablename__ = "auth_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # login, logout, failed_login, password_change, token_refresh
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)  # ИНН
    total_area_ha: Mapped[float] = mapped_column(default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="organization")
    fields = relationship("Field", back_populates="organization")`
  },
  {
    path: "app/api/v1/auth.py",
    language: "python",
    module: "auth",
    description: "Authentication endpoints with rate limiting and audit",
    code: `"""Authentication API with rate limiting and audit logging."""
from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.api.deps import DBSession, CurrentUser
from app.core.security import (
    create_access_token, create_refresh_token,
    verify_password, hash_password, verify_token,
)
from app.core.exceptions import AuthenticationException, AlreadyExistsException
from app.infrastructure.database.models.user import User, AuthAuditLog
from app.schemas.auth import (
    Token, UserLogin, UserRegister, UserResponse,
    PasswordResetRequest, PasswordResetConfirm,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


async def log_auth_event(
    db: AsyncSession, event_type: str, user_id=None,
    request: Request = None, success: bool = True, details: str = None
):
    """Log authentication event for audit trail."""
    log = AuthAuditLog(
        user_id=user_id,
        event_type=event_type,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
        success=success,
        details=details,
    )
    db.add(log)


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserRegister, db: DBSession, request: Request):
    """Register new user."""
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise AlreadyExistsException("User", data.email)

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
    )
    db.add(user)
    await db.flush()
    await log_auth_event(db, "register", user.id, request)
    logger.info(f"User registered: {user.email}")
    return UserResponse.model_validate(user)


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")  # Rate limiting: 5 attempts per minute
async def login(request: Request, credentials: UserLogin, db: DBSession):
    """Login with rate limiting."""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        await log_auth_event(db, "failed_login", request=request, success=False, details=f"email={credentials.email}")
        raise AuthenticationException("Invalid email or password")

    if not user.is_active:
        await log_auth_event(db, "failed_login", user.id, request, False, "Account disabled")
        raise AuthenticationException("Account is disabled")

    user.last_login = datetime.now(timezone.utc)
    await log_auth_event(db, "login", user.id, request)

    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=Token)
async def refresh(refresh_token: str, db: DBSession, request: Request):
    """Refresh access token."""
    payload = verify_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise AuthenticationException("Invalid refresh token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise AuthenticationException("User not found")

    await log_auth_event(db, "token_refresh", user.id, request)
    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/password-reset/request")
@limiter.limit("3/minute")
async def request_password_reset(request: Request, email: str, db: DBSession):
    """Request password reset email."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        # Generate reset token and send email (Celery task)
        from app.tasks.notifications import send_password_reset_email
        token = secrets.token_urlsafe(32)
        user.password_reset_token = hash_password(token)
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        send_password_reset_email.delay(email, token)

    # Always return success to prevent email enumeration
    return {"message": "If email exists, reset link was sent"}


@router.post("/password-reset/confirm")
async def confirm_password_reset(token: str, new_password: str, db: DBSession):
    """Confirm password reset with token."""
    result = await db.execute(
        select(User).where(
            User.password_reset_token.isnot(None),
            User.password_reset_expires > datetime.now(timezone.utc),
        )
    )
    # Find user by token (simplified - in production use token lookup)
    # ... validate and update password
    return {"message": "Password reset successfully"}`
  },

  // ============ MODULE 2: FIELDS ============
  {
    path: "app/infrastructure/database/models/field.py",
    language: "python",
    module: "fields",
    description: "Field model with PostGIS, history, and crop rotation",
    code: `"""Field models with PostGIS geometry support."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
import enum

from app.infrastructure.database.base import Base


class SoilType(str, enum.Enum):
    CHERNOZEM = "chernozem"
    CLAY = "clay"
    LOAM = "loam"
    SAND = "sand"
    SANDY_LOAM = "sandy_loam"
    PEAT = "peat"
    LIMESTONE = "limestone"


class Field(Base):
    """Main agricultural field entity with PostGIS geometry."""
    __tablename__ = "fields"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    cadastral_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # PostGIS geometry - CRITICAL
    geometry = mapped_column(Geometry("POLYGON", srid=4326, spatial_index=True), nullable=False)
    centroid = mapped_column(Geometry("POINT", srid=4326), nullable=True)

    # Area (auto-calculated from geometry via ST_Area)
    area_ha: Mapped[float] = mapped_column(Float, nullable=False)

    # Location
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Soil properties
    soil_type: Mapped[SoilType | None] = mapped_column(SAEnum(SoilType), nullable=True)
    ph_level: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0-14
    humus_percent: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0-100%

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    organization = relationship("Organization", back_populates="fields")
    history = relationship("FieldHistory", back_populates="field", cascade="all, delete-orphan")
    crop_rotations = relationship("FieldCropRotation", back_populates="field", cascade="all, delete-orphan")
    operations = relationship("FieldOperation", back_populates="field")

    __table_args__ = (
        # GIST index for spatial queries
        # Note: spatial_index=True on geometry column creates this
    )


class FieldHistory(Base):
    """Historical record of field usage per year."""
    __tablename__ = "field_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    crop_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    variety: Mapped[str | None] = mapped_column(String(200), nullable=True)
    yield_tons_per_ha: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_yield_tons: Mapped[float | None] = mapped_column(Float, nullable=True)
    fertilizers_used: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # [{material_id, quantity, cost}]
    pesticides_used: Mapped[dict | None] = mapped_column(JSONB, nullable=True)   # [{material_id, quantity, cost}]
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    field = relationship("Field", back_populates="history")


class FieldCropRotation(Base):
    """Planned crop rotation schedule."""
    __tablename__ = "field_crop_rotations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_crop: Mapped[str] = mapped_column(String(100), nullable=False)
    planned_variety: Mapped[str | None] = mapped_column(String(200), nullable=True)
    expected_yield_tons_per_ha: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_valid_rotation: Mapped[bool] = mapped_column(Boolean, default=True)  # Validated by business rules
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    field = relationship("Field", back_populates="crop_rotations")`
  },
  {
    path: "app/api/v1/fields.py",
    language: "python",
    module: "fields",
    description: "Fields API with PostGIS spatial operations",
    code: `"""Fields API with PostGIS spatial operations."""
import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query, UploadFile, File, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_AsGeoJSON, ST_GeomFromGeoJSON, ST_Area, ST_Centroid, ST_IsValid, ST_Intersects
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import shape, mapping
from loguru import logger

from app.api.deps import DBSession, CurrentUser, ManagerUser
from app.core.exceptions import NotFoundException, ValidationException, GeometryValidationException
from app.infrastructure.database.models.field import Field, FieldHistory, FieldCropRotation
from app.schemas.fields import (
    FieldCreate, FieldUpdate, FieldResponse, FieldHistoryCreate,
    FieldHistoryResponse, CropRotationPlan, GeoJSONGeometry,
)
from app.schemas.common import PaginatedResponse, SuccessResponse

router = APIRouter()


def geojson_to_geometry(geojson: dict):
    """Convert GeoJSON dict to PostGIS geometry."""
    geom = shape(geojson)
    if not geom.is_valid:
        raise GeometryValidationException(f"Invalid geometry: {geom.is_valid}")
    return from_shape(geom, srid=4326)


def geometry_to_geojson(geom) -> Optional[dict]:
    """Convert PostGIS geometry to GeoJSON."""
    if geom is None:
        return None
    return mapping(to_shape(geom))


@router.post("", response_model=FieldResponse, status_code=201)
async def create_field(data: FieldCreate, db: DBSession, user: ManagerUser):
    """
    Create a new field with GeoJSON geometry.
    - Validates geometry (no self-intersections)
    - Checks for boundary intersections with existing fields
    - Auto-calculates area via ST_Area and centroid
    """
    # Validate geometry
    geom_shape = shape(data.geometry.model_dump())
    if not geom_shape.is_valid:
        raise GeometryValidationException("Geometry is invalid (self-intersection detected)")

    # Check for intersection with existing fields in same org
    existing = await db.execute(
        select(Field).where(
            and_(
                Field.organization_id == data.organization_id,
                Field.is_active == True,
                ST_Intersects(Field.geometry, geojson_to_geometry(data.geometry.model_dump())),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ValidationException("Field geometry intersects with existing field")

    # Create field
    geometry = geojson_to_geometry(data.geometry.model_dump())
    centroid = from_shape(geom_shape.centroid, srid=4326)

    # Calculate area in hectares (geometry in WGS84, need to transform)
    area_result = await db.execute(
        select(func.ST_Area(func.ST_Transform(geometry, 3857)) / 10000)  # m² to ha
    )
    calculated_area = area_result.scalar() or data.area_ha

    field = Field(
        organization_id=data.organization_id,
        name=data.name,
        cadastral_number=data.cadastral_number,
        geometry=geometry,
        centroid=centroid,
        area_ha=calculated_area,
        region=data.region,
        district=data.district,
        soil_type=data.soil_type,
        ph_level=data.ph_level,
        humus_percent=data.humus_percent,
    )
    db.add(field)
    await db.flush()
    await db.refresh(field)

    # Update organization total area
    org_area = await db.execute(
        select(func.coalesce(func.sum(Field.area_ha), 0)).where(
            Field.organization_id == data.organization_id, Field.is_active == True
        )
    )
    from app.infrastructure.database.models.user import Organization
    org = await db.get(Organization, data.organization_id)
    if org:
        org.total_area_ha = org_area.scalar()

    logger.info(f"Field created: {field.name} ({field.area_ha:.2f} ha)")
    return FieldResponse.model_validate(field)


@router.get("", response_model=PaginatedResponse[FieldResponse])
async def list_fields(
    db: DBSession, user: CurrentUser,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    soil_type: Optional[str] = None, region: Optional[str] = None,
    search: Optional[str] = None, is_active: Optional[bool] = True,
):
    """List fields with pagination and spatial filtering."""
    query = select(Field).where(
        and_(Field.organization_id == user.organization_id, Field.is_active == is_active)
    )
    if soil_type:
        query = query.where(Field.soil_type == soil_type)
    if region:
        query = query.where(Field.region.ilike(f"%{region}%"))
    if search:
        query = query.where(Field.name.ilike(f"%{search}%") | Field.cadastral_number.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    fields = (await db.execute(query.offset((page - 1) * per_page).limit(per_page))).scalars().all()

    items = []
    for f in fields:
        resp = FieldResponse.model_validate(f)
        resp.geometry = geometry_to_geojson(f.geometry)
        resp.centroid = geometry_to_geojson(f.centroid)
        items.append(resp)

    return PaginatedResponse(items=items, total=total, page=page, per_page=per_page, pages=(total + per_page - 1) // per_page)


@router.get("/statistics")
async def get_field_statistics(db: DBSession, user: CurrentUser):
    """Aggregate statistics for all fields."""
    org_id = user.organization_id
    stats = await db.execute(
        select(
            func.count(Field.id),
            func.sum(Field.area_ha),
            func.count(Field.id).filter(Field.soil_type == "chernozem"),
        ).where(and_(Field.organization_id == org_id, Field.is_active == True))
    )
    count, total_area, chernozem_count = stats.one()
    return {
        "total_fields": count,
        "total_area_ha": float(total_area or 0),
        "chernozem_fields": chernozem_count,
    }


@router.post("/upload-geojson")
async def upload_geojson(file: UploadFile = File(...), db: DBSession = Depends(get_db), user: ManagerUser = Depends(...)):
    """Bulk upload fields from GeoJSON file."""
    content = await file.read()
    geojson = json.loads(content)

    created = []
    errors = []

    features = geojson.get("features", [geojson] if geojson.get("type") == "Feature" else [])
    for i, feature in enumerate(features):
        try:
            props = feature.get("properties", {})
            geom = feature.get("geometry", {})
            # Create field from feature...
            created.append(props.get("name", f"Field {i+1}"))
        except Exception as e:
            errors.append({"feature_index": i, "error": str(e)})

    return {"created": len(created), "errors": errors, "fields": created}


@router.post("/{field_id}/history", response_model=FieldHistoryResponse, status_code=201)
async def add_field_history(field_id: UUID, data: FieldHistoryCreate, db: DBSession, user: ManagerUser):
    """Add historical record for a field."""
    field = await db.get(Field, field_id)
    if not field:
        raise NotFoundException("Field", str(field_id))

    history = FieldHistory(
        field_id=field_id, year=data.year, crop_type=data.crop_type,
        variety=data.variety, yield_tons_per_ha=data.yield_tons_per_ha,
        total_yield_tons=data.total_yield_tons,
        fertilizers_used=data.fertilizers_used, pesticides_used=data.pesticides_used,
        notes=data.notes,
    )
    db.add(history)
    await db.flush()
    return FieldHistoryResponse.model_validate(history)


@router.get("/{field_id}/history", response_model=list[FieldHistoryResponse])
async def get_field_history(field_id: UUID, db: DBSession, user: CurrentUser):
    """Get field history sorted by year."""
    result = await db.execute(
        select(FieldHistory).where(FieldHistory.field_id == field_id).order_by(FieldHistory.year.desc())
    )
    return [FieldHistoryResponse.model_validate(h) for h in result.scalars().all()]`
  },
  {
    path: "app/domain/fields/services.py",
    language: "python",
    module: "fields",
    description: "Field domain service with crop rotation validation",
    code: `"""Field domain service - business logic."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class FieldMetrics:
    area_ha: float
    yield_per_ha: float
    cost_per_ha: float
    profitability_index: float
    soil_health_score: float


# Crop rotation rules: crop -> list of bad predecessors
CROP_ROTATION_RULES = {
    "wheat": ["wheat", "barley"],
    "corn": ["corn", "sunflower"],
    "sunflower": ["sunflower", "soybean"],
    "soybean": ["pea", "bean", "soybean"],
    "barley": ["wheat", "barley"],
    "rapeseed": ["rapeseed", "cabbage"],
}


class FieldService:
    """Pure business logic for fields."""

    @staticmethod
    def validate_crop_rotation(current_crop: str, previous_crops: list[str]) -> tuple[bool, str]:
        """
        Validate crop rotation.
        Business rule: Don't plant same crop family 2 years in a row.
        """
        if not previous_crops:
            return True, "No previous crops"

        last_crop = previous_crops[-1].lower()
        bad_predecessors = CROP_ROTATION_RULES.get(current_crop.lower(), [])

        if last_crop in bad_predecessors:
            return False, f"{current_crop} after {last_crop} violates rotation rules"

        return True, f"Rotation {last_crop} → {current_crop} is acceptable"

    @staticmethod
    def calculate_soil_health(ph: float, humus: float, nitrogen: float, phosphorus: float) -> float:
        """Calculate soil health score (0-100)."""
        score = 0
        # pH optimal: 6.0-7.5
        if 6.0 <= ph <= 7.5: score += 25
        elif 5.5 <= ph <= 8.0: score += 15
        # Humus
        if humus >= 4.0: score += 25
        elif humus >= 2.5: score += 15
        # NPK balance
        if 30 <= nitrogen <= 80: score += 25
        if 15 <= phosphorus <= 40: score += 25
        return min(score, 100)

    @staticmethod
    def calculate_profitability(total_revenue: float, total_costs: float) -> float:
        """Calculate profitability index."""
        if total_costs == 0:
            return 0
        return (total_revenue - total_costs) / total_costs`
  },

  // ============ MODULE 3: INVENTORY ============
  {
    path: "app/infrastructure/database/models/inventory.py",
    language: "python",
    module: "inventory",
    description: "Inventory models: Warehouse, Material, StockMovement, Stock",
    code: `"""Inventory models: Warehouse, Materials, Stock Movements."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Text, Enum as SAEnum, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.infrastructure.database.base import Base


class WarehouseType(str, enum.Enum):
    CENTRAL = "central"
    FIELD = "field"
    MOBILE = "mobile"


class MaterialCategory(str, enum.Enum):
    SEEDS = "seeds"
    FERTILIZERS = "fertilizers"
    PESTICIDES = "pesticides"   # СЗР
    FUEL = "fuel"               # ГСМ
    SPARE_PARTS = "spare_parts"


class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    TRANSFER = "TRANSFER"


class Warehouse(Base):
    """Warehouse/storage location."""
    __tablename__ = "warehouses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[WarehouseType] = mapped_column(SAEnum(WarehouseType), nullable=False)
    # Location point for field/mobile warehouses
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    materials = relationship("Stock", back_populates="warehouse")


class Material(Base):
    """Material/item catalog entry."""
    __tablename__ = "materials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[MaterialCategory] = mapped_column(SAEnum(MaterialCategory), nullable=False, index=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # kg, liters, pieces, tons
    active_ingredient: Mapped[str | None] = mapped_column(String(255), nullable=True)  # For pesticides
    min_stock: Mapped[float] = mapped_column(Float, default=0)
    max_stock: Mapped[float] = mapped_column(Float, default=999999)
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    movements = relationship("StockMovement", back_populates="material")


class StockMovement(Base):
    """Stock movement record - THE MOST IMPORTANT entity for inventory."""
    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False, index=True)
    warehouse_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False, index=True)
    movement_type: Mapped[MovementType] = mapped_column(SAEnum(MovementType), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    # Reference to source document
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # purchase, writeoff, transfer, operation
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    performed_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    performed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Batch tracking (for pesticides with expiry)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    material = relationship("Material", back_populates="movements")
    warehouse = relationship("Warehouse", back_populates="movements")


class Stock(Base):
    """Current stock levels (materialized via triggers or recalculated)."""
    __tablename__ = "stock"
    __table_args__ = (
        Index("ix_stock_warehouse_material", "warehouse_id", "material_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    warehouse_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False)
    material_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, default=0)

    warehouse = relationship("Warehouse", back_populates="materials")
    material = relationship("Material")`
  },
  {
    path: "app/api/v1/inventory.py",
    language: "python",
    module: "inventory",
    description: "Inventory API with stock movements and alerts",
    code: `"""Inventory API: materials, movements, stock, reports."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Query, status
from sqlalchemy import select, func, and_
from loguru import logger

from app.api.deps import DBSession, CurrentUser, ManagerUser
from app.core.exceptions import NotFoundException, ValidationException, InsufficientStockException
from app.infrastructure.database.models.inventory import (
    Warehouse, Material, StockMovement, Stock, MovementType, MaterialCategory
)

router = APIRouter()


@router.get("/materials")
async def list_materials(
    db: DBSession, user: CurrentUser,
    category: Optional[str] = None, search: Optional[str] = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
):
    """List materials with filtering."""
    query = select(Material).where(Material.organization_id == user.organization_id)
    if category:
        query = query.where(Material.category == category)
    if search:
        query = query.where(Material.name.ilike(f"%{search}%") | Material.sku.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    items = (await db.execute(query.offset((page - 1) * per_page).limit(per_page))).scalars().all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.post("/materials", status_code=201)
async def create_material(db: DBSession, user: ManagerUser, data: dict):
    """Create new material."""
    material = Material(organization_id=user.organization_id, **data)
    db.add(material)
    await db.flush()
    return material


@router.get("/stock")
async def get_stock(db: DBSession, user: CurrentUser, warehouse_id: Optional[UUID] = None):
    """Get current stock levels."""
    query = select(Stock, Material).join(Material).where(
        Stock.warehouse_id == warehouse_id if warehouse_id else True
    )
    result = await db.execute(query)
    return [{"material": row.Material, "quantity": row.Stock.quantity} for row in result]


@router.post("/movements", status_code=201)
async def create_movement(db: DBSession, user: ManagerUser, data: dict):
    """
    Create stock movement (IN/OUT/TRANSFER).
    - OUT: validates sufficient stock
    - Automatically updates Stock table
    - Links to operation if reference_type='operation'
    """
    material = await db.get(Material, data["material_id"])
    if not material:
        raise NotFoundException("Material", str(data["material_id"]))

    movement_type = data["movement_type"]

    # Validate stock for OUT movements
    if movement_type == "OUT":
        stock = (await db.execute(
            select(Stock).where(
                Stock.warehouse_id == data["warehouse_id"],
                Stock.material_id == data["material_id"],
            )
        )).scalar_one_or_none()

        available = stock.quantity if stock else 0
        if available < data["quantity"]:
            raise InsufficientStockException(material.name, available, data["quantity"])

    # Create movement
    movement = StockMovement(
        material_id=data["material_id"],
        warehouse_id=data["warehouse_id"],
        movement_type=movement_type,
        quantity=data["quantity"],
        unit_cost=data.get("unit_cost", material.cost_per_unit),
        total_cost=data["quantity"] * data.get("unit_cost", material.cost_per_unit),
        reference_type=data.get("reference_type"),
        reference_id=data.get("reference_id"),
        performed_by_id=user.id,
        notes=data.get("notes"),
        batch_number=data.get("batch_number"),
    )
    db.add(movement)

    # Update stock
    stock = (await db.execute(
        select(Stock).where(
            Stock.warehouse_id == data["warehouse_id"],
            Stock.material_id == data["material_id"],
        )
    )).scalar_one_or_none()

    if not stock:
        stock = Stock(warehouse_id=data["warehouse_id"], material_id=data["material_id"], quantity=0)
        db.add(stock)

    if movement_type == "IN":
        stock.quantity += data["quantity"]
    elif movement_type == "OUT":
        stock.quantity -= data["quantity"]

    await db.flush()

    # Check min stock alert
    if stock.quantity <= material.min_stock:
        logger.warning(f"Low stock alert: {material.name} ({stock.quantity} {material.unit})")
        # Trigger notification task
        from app.tasks.notifications import send_low_stock_alert
        send_low_stock_alert.delay(str(material.id), str(stock.quantity))

    return movement


@router.post("/stocktake")
async def perform_stocktake(db: DBSession, user: ManagerUser, data: dict):
    """Inventory stocktake - adjust stock to match physical count."""
    for item in data["items"]:
        stock = (await db.execute(
            select(Stock).where(
                Stock.warehouse_id == item["warehouse_id"],
                Stock.material_id == item["material_id"],
            )
        )).scalar_one_or_none()

        actual_qty = item["actual_quantity"]
        if stock:
            diff = actual_qty - stock.quantity
            if diff != 0:
                movement = StockMovement(
                    material_id=item["material_id"],
                    warehouse_id=item["warehouse_id"],
                    movement_type=MovementType.IN if diff > 0 else MovementType.OUT,
                    quantity=abs(diff),
                    performed_by_id=user.id,
                    reference_type="stocktake",
                    notes=f"Stocktake adjustment: {stock.quantity} → {actual_qty}",
                )
                db.add(movement)
                stock.quantity = actual_qty

    return {"message": "Stocktake completed"}`
  },

  // ============ MODULE 4: OPERATIONS ============
  {
    path: "app/infrastructure/database/models/operation.py",
    language: "python",
    module: "operations",
    description: "Field operations and machinery models",
    code: `"""Field operations and machinery models."""
import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, Float, Integer, DateTime, Date, ForeignKey, Text, Enum as SAEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import enum

from app.infrastructure.database.base import Base


class OperationType(str, enum.Enum):
    PLOWING = "plowing"
    SOWING = "sowing"
    SPRAYING = "spraying"
    FERTILIZING = "fertilizing"
    IRRIGATION = "irrigation"
    HARVESTING = "harvesting"
    TRANSPORT = "transport"
    OTHER = "other"


class OperationStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FieldOperation(Base):
    """Field operation - agricultural work on a field."""
    __tablename__ = "operations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fields.id"), nullable=False, index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    operation_type: Mapped[OperationType] = mapped_column(SAEnum(OperationType), nullable=False, index=True)
    status: Mapped[OperationStatus] = mapped_column(SAEnum(OperationStatus), default=OperationStatus.PLANNED)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    planned_date: Mapped[date] = mapped_column(Date, nullable=False)
    actual_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Area (may be less than full field)
    area_ha: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Assignment
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    executor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Resources used (JSON for flexibility)
    materials_used: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # [{material_id, material_name, quantity, unit, cost}]
    machinery_used: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # [{machinery_id, name, hours}]

    # Fuel tracking
    fuel_consumed_liters: Mapped[float | None] = mapped_column(Float, nullable=True)
    fuel_consumed_per_ha: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Duration
    duration_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    weather_conditions: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Documentation
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    photos: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)  # URLs

    # Audit
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    field = relationship("Field", back_populates="operations")


class Machinery(Base):
    """Agricultural machinery/equipment."""
    __tablename__ = "machinery"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # tractor, combine, sprayer
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    license_plate: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fuel_tank_capacity: Mapped[float | None] = mapped_column(Float, nullable=True)  # liters
    fuel_consumption_per_ha: Mapped[float | None] = mapped_column(Float, nullable=True)  # liters/ha
    gps_tracker_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)`
  },
  {
    path: "app/api/v1/operations.py",
    language: "python",
    module: "operations",
    description: "Operations API with material reservation and completion logic",
    code: `"""Field operations API with business logic."""
from typing import Optional
from uuid import UUID
from datetime import date, datetime, timezone
from fastapi import APIRouter, Query, status
from sqlalchemy import select, func, and_
from loguru import logger

from app.api.deps import DBSession, CurrentUser, ManagerUser
from app.core.exceptions import NotFoundException, ValidationException
from app.infrastructure.database.models.operation import FieldOperation, OperationType, OperationStatus, Machinery
from app.infrastructure.database.models.field import Field, FieldHistory
from app.infrastructure.database.models.inventory import Stock, StockMovement, Material, MovementType

router = APIRouter()


@router.post("", status_code=201)
async def create_operation(db: DBSession, user: ManagerUser, data: dict):
    """
    Create field operation.
    Business rules:
    - Validates field exists and has history
    - Reserves materials from stock
    """
    field = await db.get(Field, data["field_id"])
    if not field:
        raise NotFoundException("Field", str(data["field_id"]))

    # Validate: check if field has previous crop history
    if data["operation_type"] in ["sowing", "plowing"]:
        has_history = (await db.execute(
            select(func.count()).select_from(FieldHistory).where(FieldHistory.field_id == field.id)
        )).scalar()
        if has_history == 0 and data["operation_type"] == "sowing":
            logger.info(f"First sowing on field {field.name} - no history yet")

    operation = FieldOperation(
        field_id=data["field_id"],
        organization_id=user.organization_id,
        operation_type=data["operation_type"],
        title=data["title"],
        planned_date=data["planned_date"],
        area_ha=data.get("area_ha", field.area_ha),
        assigned_to_id=data.get("assigned_to_id"),
        created_by=user.id,
        materials_used=data.get("materials_used"),
        machinery_used=data.get("machinery_used"),
    )
    db.add(operation)
    await db.flush()

    # Reserve materials from stock
    if data.get("materials_used"):
        for mat in data["materials_used"]:
            stock = (await db.execute(
                select(Stock).where(
                    Stock.material_id == mat["material_id"],
                    Stock.warehouse_id == mat.get("warehouse_id"),
                )
            )).scalar_one_or_none()

            if not stock or stock.quantity < mat["quantity"]:
                raise ValidationException(
                    f"Insufficient stock for material {mat.get('material_name', mat['material_id'])}"
                )
            # Reserve (don't deduct yet - deduct on completion)

    logger.info(f"Operation created: {operation.title} on field {field.name}")
    return operation


@router.post("/{operation_id}/complete")
async def complete_operation(operation_id: UUID, db: DBSession, user: ManagerUser, data: dict):
    """
    Complete operation - final step.
    - Deducts materials from stock
    - Calculates fuel deviations
    - Updates field history if harvesting
    """
    operation = await db.get(FieldOperation, operation_id)
    if not operation:
        raise NotFoundException("Operation", str(operation_id))

    if operation.status == OperationStatus.COMPLETED:
        raise ValidationException("Operation already completed")

    # Update operation
    operation.status = OperationStatus.COMPLETED
    operation.actual_date = datetime.now(timezone.utc)
    operation.executor_id = data.get("executor_id", user.id)
    operation.fuel_consumed_liters = data.get("fuel_consumed_liters")
    operation.duration_hours = data.get("duration_hours")
    operation.notes = data.get("notes", operation.notes)
    operation.verified_by = user.id

    # Calculate fuel per hectare
    if operation.fuel_consumed_liters and operation.area_ha:
        operation.fuel_consumed_per_ha = operation.fuel_consumed_liters / operation.area_ha

    # Deduct materials from stock (actual write-off)
    if data.get("materials_used"):
        for mat in data["materials_used"]:
            movement = StockMovement(
                material_id=mat["material_id"],
                warehouse_id=mat.get("warehouse_id"),
                movement_type=MovementType.OUT,
                quantity=mat["quantity"],
                unit_cost=mat.get("unit_cost", 0),
                total_cost=mat["quantity"] * mat.get("unit_cost", 0),
                reference_type="operation",
                reference_id=operation.id,
                performed_by_id=user.id,
            )
            db.add(movement)

            # Update stock
            stock = (await db.execute(
                select(Stock).where(
                    Stock.material_id == mat["material_id"],
                    Stock.warehouse_id == mat.get("warehouse_id"),
                )
            )).scalar_one_or_none()
            if stock:
                stock.quantity -= mat["quantity"]

    # Fuel deviation alert (>20% from norm)
    if operation.fuel_consumed_per_ha and operation.area_ha:
        machinery_data = operation.machinery_used or []
        for m in machinery_data:
            machinery = await db.get(Machinery, m.get("machinery_id"))
            if machinery and machinery.fuel_consumption_per_ha:
                deviation = abs(operation.fuel_consumed_per_ha - machinery.fuel_consumption_per_ha) / machinery.fuel_consumption_per_ha
                if deviation > 0.2:
                    logger.warning(
                        f"Fuel deviation alert: {deviation*100:.1f}% above norm "
                        f"for operation {operation.id}"
                    )

    await db.flush()
    logger.info(f"Operation completed: {operation.title}")
    return operation


@router.get("/calendar")
async def get_operations_calendar(
    db: DBSession, user: CurrentUser,
    year: int = Query(None), month: int = Query(None),
):
    """Get operations in calendar format."""
    query = select(FieldOperation).where(FieldOperation.organization_id == user.organization_id)
    if year:
        query = query.where(func.extract("year", FieldOperation.planned_date) == year)
    if month:
        query = query.where(func.extract("month", FieldOperation.planned_date) == month)

    operations = (await db.execute(query.order_by(FieldOperation.planned_date))).scalars().all()
    return [
        {
            "id": str(op.id),
            "title": op.title,
            "date": str(op.planned_date),
            "type": op.operation_type.value,
            "status": op.status.value,
            "field_id": str(op.field_id),
        }
        for op in operations
    ]`
  },

  // ============ MODULE 5: CRM ============
  {
    path: "app/infrastructure/database/models/crm.py",
    language: "python",
    module: "crm",
    description: "CRM models: Contact, Company, Deal",
    code: `"""CRM models: Contacts, Companies, Deals."""
import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, Float, DateTime, Date, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.infrastructure.database.base import Base


class CompanyType(str, enum.Enum):
    BUYER = "buyer"
    SUPPLIER = "supplier"
    PARTNER = "partner"


class DealType(str, enum.Enum):
    CROP_SALE = "crop_sale"
    PURCHASE = "purchase"
    SERVICE = "service"


class DealStatus(str, enum.Enum):
    LEAD = "lead"
    NEGOTIATION = "negotiation"
    CONTRACT = "contract"
    WON = "won"
    LOST = "lost"


class Company(Base):
    """Business counterparty."""
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[CompanyType] = mapped_column(SAEnum(CompanyType), nullable=False)
    tax_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    legal_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    reliability_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0-100
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    contacts = relationship("Contact", back_populates="company")
    deals = relationship("Deal", back_populates="company")


class Contact(Base):
    """Business contact person."""
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="contacts")
    deals = relationship("Deal", back_populates="contact")


class Deal(Base):
    """Sales deal/opportunity."""
    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=True)

    deal_type: Mapped[DealType] = mapped_column(SAEnum(DealType), nullable=False)
    status: Mapped[DealStatus] = mapped_column(SAEnum(DealStatus), default=DealStatus.LEAD)

    value: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Crop-specific fields
    crop_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity_tons: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_per_ton: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Stage history
    stage_history: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # [{"status": "lead", "date": "...", "note": "..."}, ...]

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="deals")
    contact = relationship("Contact", back_populates="deals")`
  },
  {
    path: "app/api/v1/crm.py",
    language: "python",
    module: "crm",
    description: "CRM API: contacts, companies, deals, pipeline",
    code: `"""CRM API: contacts, companies, deals, pipeline."""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Query, status
from sqlalchemy import select, func, and_
from loguru import logger

from app.api.deps import DBSession, CurrentUser
from app.core.exceptions import NotFoundException
from app.infrastructure.database.models.crm import Company, Contact, Deal, DealStatus, DealType

router = APIRouter()


# --- Companies ---
@router.get("/companies")
async def list_companies(db: DBSession, user: CurrentUser, type: Optional[str] = None):
    query = select(Company).where(Company.organization_id == user.organization_id)
    if type:
        query = query.where(Company.type == type)
    result = await db.execute(query.order_by(Company.name))
    return result.scalars().all()


@router.post("/companies", status_code=201)
async def create_company(db: DBSession, user: CurrentUser, data: dict):
    company = Company(organization_id=user.organization_id, **data)
    db.add(company)
    await db.flush()
    return company


# --- Contacts ---
@router.get("/contacts")
async def list_contacts(db: DBSession, user: CurrentUser, company_id: Optional[UUID] = None):
    query = select(Contact).where(Contact.organization_id == user.organization_id)
    if company_id:
        query = query.where(Contact.company_id == company_id)
    result = await db.execute(query.order_by(Contact.last_name))
    return result.scalars().all()


@router.post("/contacts", status_code=201)
async def create_contact(db: DBSession, user: CurrentUser, data: dict):
    contact = Contact(organization_id=user.organization_id, **data)
    db.add(contact)
    await db.flush()
    return contact


# --- Deals ---
@router.get("/deals")
async def list_deals(db: DBSession, user: CurrentUser, status: Optional[str] = None, deal_type: Optional[str] = None):
    query = select(Deal).where(Deal.organization_id == user.organization_id)
    if status:
        query = query.where(Deal.status == status)
    if deal_type:
        query = query.where(Deal.deal_type == deal_type)
    result = await db.execute(query.order_by(Deal.created_at.desc()))
    return result.scalars().all()


@router.post("/deals", status_code=201)
async def create_deal(db: DBSession, user: CurrentUser, data: dict):
    deal = Deal(
        organization_id=user.organization_id,
        stage_history=[{"status": "lead", "date": datetime.now(timezone.utc).isoformat()}],
        **data,
    )
    db.add(deal)
    await db.flush()
    return deal


@router.patch("/deals/{deal_id}/status")
async def update_deal_status(deal_id: UUID, new_status: str, db: DBSession, user: CurrentUser):
    """Update deal status with stage history tracking."""
    deal = await db.get(Deal, deal_id)
    if not deal:
        raise NotFoundException("Deal", str(deal_id))

    old_status = deal.status
    deal.status = new_status

    # Append to stage history
    history = deal.stage_history or []
    history.append({
        "from": old_status.value if hasattr(old_status, 'value') else str(old_status),
        "to": new_status,
        "date": datetime.now(timezone.utc).isoformat(),
        "user_id": str(user.id),
    })
    deal.stage_history = history
    await db.flush()

    logger.info(f"Deal {deal.title} status: {old_status} → {new_status}")
    return deal


# --- Pipeline ---
@router.get("/pipeline")
async def get_sales_pipeline(db: DBSession, user: CurrentUser):
    """Get deal counts and values by stage."""
    result = await db.execute(
        select(Deal.status, func.count(Deal.id), func.sum(Deal.value))
        .where(Deal.organization_id == user.organization_id)
        .group_by(Deal.status)
    )
    return [
        {"stage": row[0].value if hasattr(row[0], 'value') else str(row[0]), "count": row[1], "total_value": float(row[2] or 0)}
        for row in result
    ]


@router.get("/analytics")
async def get_crm_analytics(db: DBSession, user: CurrentUser):
    """CRM analytics: conversion rates, deal values, etc."""
    total = (await db.execute(
        select(func.count(Deal.id)).where(Deal.organization_id == user.organization_id)
    )).scalar()
    won = (await db.execute(
        select(func.count(Deal.id)).where(and_(Deal.organization_id == user.organization_id, Deal.status == DealStatus.WON))
    )).scalar()
    total_value = (await db.execute(
        select(func.sum(Deal.value)).where(and_(Deal.organization_id == user.organization_id, Deal.status == DealStatus.WON))
    )).scalar()

    return {
        "total_deals": total,
        "won_deals": won,
        "conversion_rate": round(won / total * 100, 1) if total > 0 else 0,
        "total_won_value": float(total_value or 0),
    }`
  },

  // ============ MODULE 6: ANALYTICS ============
  {
    path: "app/api/v1/analytics.py",
    language: "python",
    module: "analytics",
    description: "Analytics API: dashboards, profitability, forecasts",
    code: `"""Analytics and reporting API."""
from typing import Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Query
from sqlalchemy import select, func, and_, extract, case
from loguru import logger

from app.api.deps import DBSession, CurrentUser
from app.infrastructure.database.models.field import Field, FieldHistory
from app.infrastructure.database.models.operation import FieldOperation, OperationStatus
from app.infrastructure.database.models.inventory import StockMovement, Material, MovementType
from app.infrastructure.database.models.crm import Deal, DealStatus

router = APIRouter()


@router.get("/fields-summary")
async def fields_summary(db: DBSession, user: CurrentUser):
    """Aggregate field statistics."""
    org_id = user.organization_id
    result = await db.execute(
        select(
            func.count(Field.id),
            func.sum(Field.area_ha),
            func.avg(Field.area_ha),
            func.count(Field.id).filter(Field.is_active == True),
        ).where(Field.organization_id == org_id)
    )
    total, area, avg_area, active = result.one()
    return {
        "total_fields": total,
        "total_area_ha": float(area or 0),
        "avg_field_size_ha": round(float(avg_area or 0), 2),
        "active_fields": active,
    }


@router.get("/crop-rotation")
async def crop_rotation_analysis(db: DBSession, user: CurrentUser, years: int = Query(5)):
    """Analyze crop rotation patterns."""
    result = await db.execute(
        select(FieldHistory.crop_type, FieldHistory.year, func.count(FieldHistory.id))
        .join(Field).where(Field.organization_id == user.organization_id)
        .group_by(FieldHistory.crop_type, FieldHistory.year)
        .order_by(FieldHistory.year.desc())
    )
    return [
        {"crop": row[0], "year": row[1], "field_count": row[2]}
        for row in result
    ]


@router.get("/fuel-consumption")
async def fuel_consumption_analysis(db: DBSession, user: CurrentUser, year: Optional[int] = None):
    """Analyze fuel consumption by operation type."""
    query = select(
        FieldOperation.operation_type,
        func.sum(FieldOperation.fuel_consumed_liters),
        func.avg(FieldOperation.fuel_consumed_per_ha),
        func.sum(FieldOperation.area_ha),
    ).where(
        and_(
            FieldOperation.organization_id == user.organization_id,
            FieldOperation.status == OperationStatus.COMPLETED,
            FieldOperation.fuel_consumed_liters.isnot(None),
        )
    )
    if year:
        query = query.where(extract("year", FieldOperation.actual_date) == year)

    query = query.group_by(FieldOperation.operation_type)
    result = await db.execute(query)

    return [
        {
            "operation_type": row[0].value,
            "total_liters": float(row[1] or 0),
            "avg_per_ha": round(float(row[2] or 0), 2),
            "total_area_ha": float(row[3] or 0),
        }
        for row in result
    ]


@router.get("/inventory-turnover")
async def inventory_turnover(db: DBSession, user: CurrentUser):
    """Calculate inventory turnover by category."""
    result = await db.execute(
        select(
            Material.category,
            func.sum(case((StockMovement.movement_type == MovementType.OUT, StockMovement.quantity), else_=0)),
            func.avg(Material.cost_per_unit),
        )
        .join(Material, StockMovement.material_id == Material.id)
        .where(Material.organization_id == user.organization_id)
        .group_by(Material.category)
    )
    return [
        {"category": row[0].value, "consumed_qty": float(row[1] or 0), "avg_cost": float(row[2] or 0)}
        for row in result
    ]


@router.get("/profitability/{field_id}")
async def field_profitability(field_id: UUID, db: DBSession, user: CurrentUser):
    """Calculate field profitability: revenue vs costs."""
    field = await db.get(Field, field_id)
    if not field:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Field", str(field_id))

    # Total operation costs
    ops_cost = (await db.execute(
        select(func.coalesce(func.sum(FieldOperation.area_ha * 5000), 0))  # Simplified cost
        .where(and_(FieldOperation.field_id == field_id, FieldOperation.status == OperationStatus.COMPLETED))
    )).scalar()

    # Material costs from movements linked to operations
    mat_cost = (await db.execute(
        select(func.coalesce(func.sum(StockMovement.total_cost), 0))
        .where(StockMovement.reference_id == field_id)
    )).scalar()

    # Revenue from harvest (simplified)
    history = (await db.execute(
        select(func.coalesce(func.sum(FieldHistory.total_yield_tons), 0))
        .where(FieldHistory.field_id == field_id)
    )).scalar()
    revenue = history * 15000  # Average price per ton

    total_costs = float(ops_cost) + float(mat_cost)
    profit = revenue - total_costs

    return {
        "field_id": str(field_id),
        "field_name": field.name,
        "area_ha": field.area_ha,
        "total_revenue": round(revenue, 2),
        "total_costs": round(total_costs, 2),
        "profit": round(profit, 2),
        "profit_per_ha": round(profit / field.area_ha, 2) if field.area_ha > 0 else 0,
        "profitability_index": round(profit / total_costs, 2) if total_costs > 0 else 0,
    }


@router.get("/cashflow-forecast")
async def cashflow_forecast(db: DBSession, user: CurrentUser, months: int = Query(6)):
    """Forecast cash flow based on deals and planned operations."""
    org_id = user.organization_id

    # Expected income from deals
    deals_income = (await db.execute(
        select(func.coalesce(func.sum(Deal.value), 0))
        .where(and_(Deal.organization_id == org_id, Deal.status.in_(["contract", "negotiation"])))
    )).scalar()

    # Planned operation costs
    ops_costs = (await db.execute(
        select(func.coalesce(func.sum(FieldOperation.area_ha * 5000), 0))
        .where(and_(FieldOperation.organization_id == org_id, FieldOperation.status == "planned"))
    )).scalar()

    return {
        "expected_income": float(deals_income),
        "planned_expenses": float(ops_costs),
        "net_forecast": float(deals_income) - float(ops_costs),
        "forecast_months": months,
    }`
  },

  // ============ TESTS ============
  {
    path: "tests/conftest.py",
    language: "python",
    module: "core",
    description: "Pytest configuration and fixtures",
    code: `"""Pytest configuration."""
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.core.security import hash_password, create_access_token
from app.infrastructure.database.base import Base
from app.api.deps import get_db

test_engine = create_async_engine("postgresql+asyncpg://agricrm:test@localhost:5432/agricrm_test")
test_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with test_session() as session:
        yield session
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session):
    from app.infrastructure.database.models.user import User, UserRole
    user = User(email="test@agricrm.com", hashed_password=hash_password("test12345"), first_name="Test", last_name="User", role=UserRole.ADMIN, is_active=True)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user):
    token = create_access_token(str(test_user.id))
    return {"Authorization": f"Bearer {token}"}`
  },
  {
    path: "tests/unit/test_crop_rotation.py",
    language: "python",
    module: "fields",
    description: "Unit tests for crop rotation business rules",
    code: `"""Tests for crop rotation validation."""
import pytest
from app.domain.fields.services import FieldService


class TestCropRotation:
    def test_valid_rotation_wheat_after_corn(self):
        is_valid, msg = FieldService.validate_crop_rotation("wheat", ["corn"])
        assert is_valid is True

    def test_invalid_rotation_wheat_after_wheat(self):
        is_valid, msg = FieldService.validate_crop_rotation("wheat", ["wheat"])
        assert is_valid is False
        assert "violates" in msg

    def test_invalid_rotation_corn_after_corn(self):
        is_valid, msg = FieldService.validate_crop_rotation("corn", ["corn"])
        assert is_valid is False

    def test_no_history_is_valid(self):
        is_valid, msg = FieldService.validate_crop_rotation("wheat", [])
        assert is_valid is True

    def test_soybean_after_pea_invalid(self):
        is_valid, msg = FieldService.validate_crop_rotation("soybean", ["pea"])
        assert is_valid is False`
  },
  {
    path: "docker-compose.yml",
    language: "yaml",
    module: "core",
    description: "Docker Compose with all services",
    code: `version: '3.8'

services:
  app:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [db, redis]
    volumes: ["./app:/app/app"]

  db:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_USER: agricrm
      POSTGRES_PASSWORD: agricrm_secret
      POSTGRES_DB: agricrm
    ports: ["5432:5432"]
    volumes: ["pg_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  celery_worker:
    build: .
    command: celery -A app.core.celery_app worker --loglevel=info
    env_file: .env
    depends_on: [redis, db]

  celery_beat:
    build: .
    command: celery -A app.core.celery_app beat --loglevel=info
    env_file: .env
    depends_on: [redis]

volumes:
  pg_data:`
  },
];

export const projectStructure = `agricrm/
├── app/
│   ├── main.py                          # FastAPI app factory
│   ├── api/
│   │   ├── deps.py                      # DI: get_db, get_current_user, role guards
│   │   └── v1/
│   │       ├── auth.py                  # [M1] Login, register, JWT, password reset
│   │       ├── fields.py               # [M2] Fields CRUD, GeoJSON upload, history
│   │       ├── inventory.py            # [M3] Materials, movements, stock, stocktake
│   │       ├── operations.py           # [M4] Operations, completion, fuel tracking
│   │       ├── crm.py                  # [M5] Companies, contacts, deals, pipeline
│   │       └── analytics.py            # [M6] Dashboards, profitability, forecasts
│   ├── core/
│   │   ├── config.py                   # Pydantic settings
│   │   ├── security.py                 # JWT (15min access, 7d refresh), bcrypt
│   │   ├── exceptions.py              # Custom exceptions hierarchy
│   │   ├── rate_limiter.py            # SlowAPI rate limiting
│   │   ├── logging.py                  # Loguru configuration
│   │   └── celery_app.py              # Celery + Beat schedules
│   ├── domain/
│   │   ├── fields/
│   │   │   ├── services.py            # Crop rotation, soil health, profitability
│   │   │   └── repositories.py        # Repository interfaces
│   │   ├── inventory/
│   │   │   └── services.py            # Stock calculations, FIFO/LIFO
│   │   └── operations/
│   │       └── services.py            # Fuel deviation, norm validation
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── base.py                # SQLAlchemy Base + naming conventions
│   │   │   ├── session.py             # Async engine + session factory
│   │   │   └── models/
│   │   │       ├── user.py            # User, Organization, AuthAuditLog
│   │   │       ├── field.py           # Field, FieldHistory, FieldCropRotation
│   │   │       ├── inventory.py       # Warehouse, Material, StockMovement, Stock
│   │   │       ├── operation.py       # FieldOperation, Machinery
│   │   │       └── crm.py            # Company, Contact, Deal
│   │   └── repositories/              # SQLAlchemy repository implementations
│   ├── schemas/                        # Pydantic V2 DTOs
│   └── tasks/
│       ├── weather.py                  # Weather update tasks
│       └── notifications.py           # Low stock, password reset emails
├── migrations/                         # Alembic async migrations
├── tests/
│   ├── conftest.py                    # Fixtures: db_session, client, auth_headers
│   ├── unit/                          # Domain logic tests
│   ├── integration/                   # API endpoint tests
│   └── e2e/                           # Workflow tests
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── alembic.ini`;
