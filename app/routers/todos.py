from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.todo import Todo
from app.schemas.todo import TodoCreate, TodoOut, TodoUpdate

router = APIRouter(prefix="/api", tags=["todos"])


@router.get("/todos", response_model=list[TodoOut])
async def list_todos(db: Session = Depends(get_db)) -> list[TodoOut]:
    return db.query(Todo).order_by(Todo.id.asc()).all()


@router.post("/todos", response_model=TodoOut, status_code=status.HTTP_201_CREATED)
async def create_todo(body: TodoCreate, db: Session = Depends(get_db)) -> TodoOut:
    todo = Todo(title=body.title, completed=False)
    db.add(todo)
    db.flush()
    db.refresh(todo)
    return todo


@router.patch("/todos/{todo_id}", response_model=TodoOut)
async def update_todo(todo_id: int = Path(..., ge=1), body: TodoUpdate = ..., db: Session = Depends(get_db)) -> TodoOut:
    todo = db.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="todo not found")
    todo.completed = body.completed
    db.add(todo)
    db.flush()
    db.refresh(todo)
    return todo


@router.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(todo_id: int = Path(..., ge=1), db: Session = Depends(get_db)) -> None:
    todo = db.get(Todo, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="todo not found")
    db.delete(todo)
