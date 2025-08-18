from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

# Import the same central Base
from app.models.base import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
