"""
Blog API Routes
Handles view tracking, email subscriptions, and popular posts
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from typing import Optional
import re

# Create router
blog_router = APIRouter(prefix="/blog", tags=["blog"])

# Rate limiting storage (in-memory, resets on restart)
subscribe_rate_limit = {}

# Common bot user agents to filter
BOT_PATTERNS = [
    r'bot', r'crawl', r'spider', r'slurp', r'search',
    r'Googlebot', r'Bingbot', r'Yahoo', r'Baidu',
    r'facebookexternalhit', r'Twitterbot', r'LinkedInBot',
    r'WhatsApp', r'Slack', r'Discordbot', r'TelegramBot',
    r'curl', r'wget', r'python-requests', r'axios', r'node-fetch'
]

BOT_REGEX = re.compile('|'.join(BOT_PATTERNS), re.IGNORECASE)


def is_bot(user_agent: str) -> bool:
    """Check if user agent appears to be a bot"""
    if not user_agent:
        return True
    return bool(BOT_REGEX.search(user_agent))


class SubscribeRequest(BaseModel):
    email: EmailStr
    source: Optional[str] = "blog"


@blog_router.post("/view/{slug}")
async def track_view(slug: str, request: Request):
    """
    Track a blog post view.
    Filters out common bots.
    """
    from server import db
    
    # Get user agent
    user_agent = request.headers.get('user-agent', '')
    
    # Skip bot views
    if is_bot(user_agent):
        return {"success": True, "tracked": False, "reason": "bot"}
    
    try:
        # Upsert view count
        result = await db.blog_views.update_one(
            {"slug": slug},
            {
                "$inc": {"views": 1},
                "$set": {"lastViewed": datetime.now(timezone.utc)}
            },
            upsert=True
        )
        
        return {"success": True, "tracked": True}
    except Exception as e:
        # Don't fail the request - view tracking is non-critical
        print(f"View tracking error for {slug}: {e}")
        return {"success": False, "error": str(e)}


@blog_router.get("/views/{slug}")
async def get_views(slug: str):
    """Get view count for a specific post"""
    from server import db
    
    try:
        doc = await db.blog_views.find_one({"slug": slug}, {"_id": 0})
        if doc:
            return {"slug": slug, "views": doc.get("views", 0)}
        return {"slug": slug, "views": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@blog_router.get("/popular")
async def get_popular_posts():
    """
    Get top 5 most viewed posts.
    Results are returned without caching - implement Redis if needed.
    """
    from server import db
    
    try:
        cursor = db.blog_views.find(
            {},
            {"_id": 0, "slug": 1, "views": 1}
        ).sort("views", -1).limit(5)
        
        posts = await cursor.to_list(length=5)
        return {"posts": posts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@blog_router.post("/subscribe")
async def subscribe(data: SubscribeRequest, request: Request):
    """
    Subscribe to blog newsletter.
    Rate limited to 5 requests per IP per hour.
    """
    from server import db
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    
    # Simple rate limiting
    now = datetime.now(timezone.utc)
    rate_key = f"{client_ip}"
    
    if rate_key in subscribe_rate_limit:
        last_time, count = subscribe_rate_limit[rate_key]
        # Reset after 1 hour
        if (now - last_time).seconds > 3600:
            subscribe_rate_limit[rate_key] = (now, 1)
        elif count >= 5:
            raise HTTPException(
                status_code=429,
                detail="Too many subscription attempts. Please try again later."
            )
        else:
            subscribe_rate_limit[rate_key] = (last_time, count + 1)
    else:
        subscribe_rate_limit[rate_key] = (now, 1)
    
    try:
        # Check if already subscribed
        existing = await db.blog_subscribers.find_one({"email": data.email.lower()})
        if existing:
            return {"success": True, "message": "Already subscribed"}
        
        # Save subscription
        await db.blog_subscribers.insert_one({
            "email": data.email.lower(),
            "subscribedAt": now,
            "source": data.source,
            "ip": client_ip
        })
        
        return {"success": True, "message": "Successfully subscribed"}
    except Exception as e:
        print(f"Subscription error: {e}")
        raise HTTPException(status_code=500, detail="Failed to subscribe. Please try again.")


@blog_router.get("/sitemap-data")
async def get_sitemap_data():
    """
    Return published post slugs and update dates for sitemap generation.
    This endpoint is called by the build script.
    """
    from server import db
    
    try:
        cursor = db.blog_views.find(
            {},
            {"_id": 0, "slug": 1}
        )
        
        posts = await cursor.to_list(length=1000)
        slugs = [p["slug"] for p in posts]
        
        return {"slugs": slugs}
    except Exception as e:
        # Return empty if no posts tracked yet
        return {"slugs": []}
