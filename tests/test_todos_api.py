import os
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault('DATABASE_URL', 'sqlite:///./test.db')

import main


@pytest.fixture()
def client_and_db(tmp_path, monkeypatch):
    db_path = tmp_path / 'todos.db'
    engine = create_engine(f'sqlite:///{db_path}', connect_args={'check_same_thread': False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    main.Base.metadata.drop_all(bind=engine)
    main.Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    main.app.dependency_overrides[main.get_db] = override_get_db
    with TestClient(main.app) as client:
        yield client, engine
    main.app.dependency_overrides.clear()


def _assert_todo_shape(todo):
    assert set(todo) == {'id', 'title', 'completed', 'created_at', 'updated_at'}
    assert isinstance(todo['id'], int)
    assert isinstance(todo['title'], str)
    assert isinstance(todo['completed'], bool)
    assert isinstance(datetime.fromisoformat(todo['created_at'].replace('Z', '+00:00')), datetime)
    assert isinstance(datetime.fromisoformat(todo['updated_at'].replace('Z', '+00:00')), datetime)


# AC-5: Backend CRUD behavior and validation for todos

def test_get_todos_returns_bare_array_of_todo_objects(client_and_db):
    client, engine = client_and_db
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        db.add(main.Todo(title='Existing todo', completed=True))
        db.commit()

    response = client.get('/api/todos')

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    _assert_todo_shape(data[0])
    assert data[0]['title'] == 'Existing todo'
    assert data[0]['completed'] is True


def test_post_todos_creates_todo_and_returns_expected_shape(client_and_db):
    client, _ = client_and_db

    response = client.post('/api/todos', json={'title': 'New todo'})

    assert response.status_code == 201
    data = response.json()
    _assert_todo_shape(data)
    assert data['title'] == 'New todo'
    assert data['completed'] is False


def test_post_todos_rejects_missing_or_blank_title(client_and_db):
    client, _ = client_and_db

    missing = client.post('/api/todos', json={})
    blank = client.post('/api/todos', json={'title': '   '})

    assert missing.status_code == 422
    assert blank.status_code == 422


def test_patch_todos_updates_completion_and_returns_expected_shape(client_and_db):
    client, engine = client_and_db
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        todo = main.Todo(title='Toggle me', completed=False)
        db.add(todo)
        db.commit()
        db.refresh(todo)
        todo_id = todo.id

    response = client.patch(f'/api/todos/{todo_id}', json={'completed': True})

    assert response.status_code == 200
    data = response.json()
    _assert_todo_shape(data)
    assert data['id'] == todo_id
    assert data['completed'] is True


def test_patch_todos_rejects_invalid_ids_or_wrong_types(client_and_db):
    client, _ = client_and_db

    invalid_id = client.patch('/api/todos/0', json={'completed': True})
    wrong_type = client.patch('/api/todos/1', json={'completed': 'yes'})

    assert invalid_id.status_code == 422
    assert wrong_type.status_code == 404


def test_delete_todos_returns_204_and_removes_item(client_and_db):
    client, engine = client_and_db
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        todo = main.Todo(title='Delete me', completed=False)
        db.add(todo)
        db.commit()
        db.refresh(todo)
        todo_id = todo.id

    response = client.delete(f'/api/todos/{todo_id}')

    assert response.status_code == 204
    assert response.content == b''
    follow_up = client.get('/api/todos')
    assert follow_up.json() == []


def test_delete_todos_rejects_invalid_ids(client_and_db):
    client, _ = client_and_db

    response = client.delete('/api/todos/0')

    assert response.status_code == 422
