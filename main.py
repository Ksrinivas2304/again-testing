# API CONTRACT
# GET  /api/todos
#   response: [{"id": int, "title": str, "completed": bool, "created_at": str, "updated_at": str}, ...]
# POST /api/todos
#   request:  {"title": str}
#   response: {"id": int, "title": str, "completed": bool, "created_at": str, "updated_at": str}
# PATCH /api/todos/{id}
#   request:  {"completed": bool}
#   response: {"id": int, "title": str, "completed": bool, "created_at": str, "updated_at": str}
# DELETE /api/todos/{id}
#   response: 204 No Content

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import todos_router


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
app.include_router(todos_router)
