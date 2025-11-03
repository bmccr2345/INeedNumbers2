from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
import magic  # python-magic
from app.deps import get_settings
import boto3
import uuid
import logging
from botocore.config import Config
from app.clerk_auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/asset")
async def upload_asset(
    request: Request,
    f: UploadFile = File(...), 
    settings=Depends(get_settings)
):
    """Secure asset upload with MIME validation and size limits"""
    # Require authentication
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentication required")
    
    blob = await f.read()
    logger.info(f"File upload attempt by user {user.id}: {f.filename}, size: {len(blob)} bytes")
    
    # Enforce 5MB size limit as per security requirements
    if len(blob) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(413, "File size exceeds 5MB limit")
    
    # Check for double extensions (security risk)
    filename = f.filename or ""
    if filename.count('.') > 1:
        raise HTTPException(400, "Files with double extensions are not allowed")
    
    # Validate MIME type from actual file content using python-magic
    mime_from_bytes = magic.from_buffer(blob, mime=True)
    
    # Security: Only allow specific safe MIME types
    allowed_mimes = {
        "application/pdf",
        "image/png", 
        "image/jpeg"
    }
    
    if mime_from_bytes not in allowed_mimes:
        raise HTTPException(415, f"Unsupported media type: {mime_from_bytes}. Allowed: PDF, PNG, JPEG only")

    # Check if S3 is configured for production uploads
    s3_configured = (
        hasattr(settings, 'S3_ACCESS_KEY_ID') and settings.S3_ACCESS_KEY_ID and
        hasattr(settings, 'S3_SECRET_ACCESS_KEY') and settings.S3_SECRET_ACCESS_KEY and
        hasattr(settings, 'S3_BUCKET') and settings.S3_BUCKET
    )
    
    try:
        if s3_configured:
            # Production: S3 upload
            s3 = boto3.client("s3",
                aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                region_name=getattr(settings, 'S3_REGION', 'us-east-1'),
                config=Config(s3={"addressing_style": "virtual"})
            )
            
            key = f"assets/{uuid.uuid4().hex}"
            s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=key,
                Body=blob,
                ContentType=mime_from_bytes,
                ACL="private",  # Secure: no public access
                ServerSideEncryption="AES256",  # Security requirement
                ContentDisposition="attachment"  # Security: force download, prevent execution
            )
            
            logger.info(f"File uploaded to S3: {key}")
            return {"key": key}
        else:
            # Development: Local file storage
            import os
            
            # Create uploads directory if it doesn't exist
            upload_dir = "/tmp/uploads"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = ""
            if mime_from_bytes == "image/jpeg":
                file_extension = ".jpg"
            elif mime_from_bytes == "image/png":
                file_extension = ".png"
            elif mime_from_bytes == "application/pdf":
                file_extension = ".pdf"
            
            filename = f"{uuid.uuid4().hex}{file_extension}"
            file_path = os.path.join(upload_dir, filename)
            
            # Save file locally
            with open(file_path, "wb") as f:
                f.write(blob)
            
            # Return local file reference
            key = f"local/{filename}"
            logger.info(f"File uploaded locally: {key}")
            return {"key": key}
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(500, f"Upload failed: {str(e)}")