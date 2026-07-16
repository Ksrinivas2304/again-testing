import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  toggleTodo,
} from './api-client/todos';
import './App.css';

function TodoSkeleton() {
  return (
    <ul className="todo-list" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <li key={index} className="todo-item skeleton-item">
          <div className="skeleton skeleton-toggle" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-action" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="state-card empty-state">
      <ClipboardList className="state-icon" aria-hidden="true" />
      <h2>No todos yet</h2>
      <p>Create your first task to get started.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card error-state" role="alert">
      <h2>Unable to load todos</h2>
      <p>{message}</p>
      <button type="button" className="secondary-button" onClick={onRetry}>
        <RefreshCw size={16} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState(null);

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.completed).length,
    [todos],
  );

  const loadTodos = async () => {
    setIsLoading(true);
    setError('');

    try {
      const items = await fetchTodos();
      setTodos(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Please enter a todo title.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const createdTodo = await createTodo({ title: trimmedTitle });
      setTodos((current) => [createdTodo, ...current]);
      setTitle('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create todo.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (todoId, nextCompleted) => {
    setActiveTodoId(todoId);
    setError('');

    try {
      const updatedTodo = await toggleTodo(todoId, { completed: nextCompleted });
      setTodos((current) =>
        current.map((todo) => (todo.id === todoId ? updatedTodo : todo)),
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update todo.');
    } finally {
      setActiveTodoId(null);
    }
  };

  const handleDelete = async (todoId) => {
    setActiveTodoId(todoId);
    setError('');

    try {
      await deleteTodo(todoId);
      setTodos((current) => current.filter((todo) => todo.id !== todoId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete todo.');
    } finally {
      setActiveTodoId(null);
    }
  };

  return (
    <main className="app-shell">
      <section className="todo-panel" aria-labelledby="todo-heading">
        <header className="hero-card">
          <div>
            <p className="eyebrow">Task manager</p>
            <h1 id="todo-heading">Stay on top of your todos</h1>
            <p className="hero-copy">
              Capture tasks, mark them complete, and keep everything in sync with the backend.
            </p>
          </div>
          <div className="hero-stats" aria-label="Todo summary">
            <div>
              <span>Total</span>
              <strong>{todos.length}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{completedCount}</strong>
            </div>
          </div>
        </header>

        <form className="todo-form" onSubmit={handleSubmit}>
          <label htmlFor="todo-title" className="input-label">
            Add a new todo
          </label>
          <div className="form-row">
            <input
              id="todo-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
              className="todo-input"
              aria-required="true"
              disabled={isCreating}
            />
            <button type="submit" className="primary-button" disabled={isCreating} aria-disabled={isCreating}>
              {isCreating ? (
                <>
                  <LoaderCircle size={18} className="spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus size={18} aria-hidden="true" />
                  Add todo
                </>
              )}
            </button>
          </div>
        </form>

        {error ? (
          <div className="inline-error" role="alert">
            {error}
          </div>
        ) : null}

        <section className="list-section" aria-live="polite">
          <div className="section-heading">
            <h2>Your tasks</h2>
            <button type="button" className="secondary-button" onClick={loadTodos} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'spin' : ''} aria-hidden="true" />
              Refresh
            </button>
          </div>

          {isLoading ? <TodoSkeleton /> : null}
          {!isLoading && error && todos.length === 0 ? <ErrorState message={error} onRetry={loadTodos} /> : null}
          {!isLoading && !error && todos.length === 0 ? <EmptyState /> : null}

          {!isLoading && todos.length > 0 ? (
            <ul className="todo-list">
              {todos.map((todo) => {
                const isBusy = activeTodoId === todo.id;

                return (
                  <li key={todo.id} className="todo-item">
                    <button
                      type="button"
                      className="icon-toggle"
                      onClick={() => handleToggle(todo.id, !todo.completed)}
                      disabled={isBusy}
                      aria-label={todo.completed ? `Mark ${todo.title} as incomplete` : `Mark ${todo.title} as complete`}
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="completed-icon" aria-hidden="true" />
                      ) : (
                        <Circle aria-hidden="true" />
                      )}
                    </button>

                    <div className="todo-copy">
                      <p className={todo.completed ? 'todo-title completed' : 'todo-title'}>{todo.title}</p>
                      <p className="todo-meta">
                        Updated {new Date(todo.updated_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(todo.id)}
                      disabled={isBusy}
                      aria-label={`Delete ${todo.title}`}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default App;
