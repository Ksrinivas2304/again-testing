import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import main


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "todos.db"
    db_url = f"sqlite:///{db_path}"
    monkeypatch.setattr(main, "DATABASE_URL", db_url)
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    main.engine = engine
    main.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    main.Base.metadata.drop_all(bind=engine)
    main.Base.metadata.create_all(bind=engine)
    return TestClient(main.app)


def _todo_shape(todo):
    assert set(todo.keys()) == {"id", "title", "completed", "created_at", "updated_at"}
    assert isinstance(todo["id"], int)
    assert isinstance(todo["title"], str)
    assert isinstance(todo["completed"], bool)
    assert isinstance(todo["created_at"], str)
    assert isinstance(todo["updated_at"], str)


# AC-4: Core todo API supports load/create/toggle/delete against the exact contract.
def test_get_todos_returns_bare_json_array_with_exact_todo_shape(client):
    response = client.get("/api/todos")

    assert response.status_code == 200
    assert response.json() == []


# AC-4: Core todo API supports load/create/toggle/delete against the exact contract.
def test_post_patch_delete_todo_persists_across_requests(client):
    create_response = client.post("/api/todos", json={"title": "Buy milk"})

    assert create_response.status_code == 201
    created = create_response.json()
    _todo_shape(created)
    assert created["title"] == "Buy milk"
    assert created["completed"] is False

    todo_id = created["id"]

    patch_response = client.patch(f"/api/todos/{todo_id}", json={"completed": True})
    assert patch_response.status_code == 200
    updated = patch_response.json()
    _todo_shape(updated)
    assert updated["id"] == todo_id
    assert updated["completed"] is True

    list_response = client.get("/api/todos")
    assert list_response.status_code == 200
    items = list_response.json()
    assert len(items) == 1
    assert items[0]["id"] == todo_id
    assert items[0]["completed"] is True

    delete_response = client.delete(f"/api/todos/{todo_id}")
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    final_list = client.get("/api/todos")
    assert final_list.status_code == 200
    assert final_list.json() == []


# AC-5: Invalid todo input is rejected with a non-2xx response.
def test_post_todo_rejects_invalid_input(client):
    response = client.post("/api/todos", json={"title": "   "})

    assert response.status_code == 422
