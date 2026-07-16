# API CONTRACT
# GET  /api/todos
#   response: [
#     {"id": int, "title": str, "completed": bool, "created_at": str, "updated_at": str}, ...
#   ]
# POST /api/todos
#   request:  {"title": str}
#   response: {"id": int, "title": str, "completed": bool, "created_at": str, "updated_at": str}
# PATCH /api/todos/{id}
#   request:  {"completed": bool}
#   response: {"id": int, "title": str, "completed": bool, "created_at": str, "updated_at": str}
# DELETE /api/todos/{id}
#   response: 204 No Content

from contextlib import asynccontextmanager
from datetime import datetime
import os
from pathlib import Path
from typing import Generator

ROOT = Path(__file__).resolve().parent

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import Boolean, DateTime, Integer, String, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class TodoOut(BaseModel):
    id: int
    title: str
    completed: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("title must not be blank")
        return value.strip()


class TodoUpdate(BaseModel):
    completed: bool


class ErrorResponse(BaseModel):
    detail: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api", tags=["todos"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@router.get("/todos", response_model=list[TodoOut], responses={500: {"model": ErrorResponse}})
async def list_todos(db: Session = Depends(get_db)) -> list[TodoOut]:
    return db.query(Todo).order_by(Todo.id.asc()).all()


@router.post("/todos", response_model=TodoOut, status_code=status.HTTP_201_CREATED, responses={422: {"model": ErrorResponse}})
async def create_todo(body: TodoCreate, db: Session = Depends(get_db)) -> TodoOut:
    todo = Todo(title=body.title, completed=False)
    db.add(todo)
    db.flush()
    db.refresh(todo)
    return todo


@router.patch("/todos/{todo_id}", response_model=TodoOut, responses={404: {"model": ErrorResponse}, 422: {"model": ErrorResponse}})
async def update_todo(todo_id: int = Path(..., ge=1), body: TodoUpdate = ..., db: Session = Depends(get_db)) -> TodoOut:
    todo = db.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="todo not found")
    todo.completed = body.completed
    db.add(todo)
    db.flush()
    db.refresh(todo)
    return todo


@router.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {"model": ErrorResponse}})
async def delete_todo(todo_id: int = Path(..., ge=1), db: Session = Depends(get_db)) -> None:
    todo = db.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="todo not found")
    db.delete(todo)


app.include_router(router)
