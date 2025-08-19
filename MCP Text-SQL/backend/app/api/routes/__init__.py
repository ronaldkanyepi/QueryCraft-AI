from fastapi import APIRouter

from app.api.routes import chat, collections, documents, health, items

router = APIRouter()


router.include_router(items.router, prefix="/items", tags=["items"])
router.include_router(collections.router, prefix="/collections", tags=["collections"])
router.include_router(documents.router, prefix="/documents", tags=["documents"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])
router.include_router(health.router, prefix="/health", tags=["health"])

__all__ = ["router"]
