from app.api.routes import items, collections, documents,chat
from fastapi import APIRouter

router = APIRouter()


router.include_router(items.router, prefix="/items", tags=["items"])
router.include_router(collections.router, prefix="/collections", tags=["collections"])
router.include_router(documents.router, prefix="/documents", tags=["documents"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])

__all__ = ["router"]
