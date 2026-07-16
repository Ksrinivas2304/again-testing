import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { createTodo, deleteTodo, fetchTodos, updateTodo } from './api-client/todos';

function LoadingSkeleton() {
  return (
    <div className="todo-list" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div className="todo-card skeleton" key={item}>
          <div className="skeleton-line skeleton-line-lg" />
          <div className="skeleton-line" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="state-card empty-state">
      <ClipboardList size={40} />
      <h2>No todos yet</h2>
      <p>Create your first task to start tracking what matters today.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card error-state" role="alert">
      <AlertCircle size={40} />
      <h2>Unable to load todos</h2>
      <p>{message}</p>
      <button className="secondary-button" onClick={onRetry} type="button">
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const completedCount = useMemo(() => todos.filter((todo) => todo.completed).length, [todos]);

  async function loadTodos() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTodos();
      setTodos(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch todos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTodos();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setActionError('Please enter a todo title.');
      return;
    }

    setSubmitting(true);
    setActionError('');
    try {
      const created = await createTodo(trimmed);
      setTodos((current) => [...current, created]);
      setTitle('');
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Unable to create todo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(todo) {
    setActionError('');
    try {
      const updated = await updateTodo(todo.id, !todo.completed);
      setTodos((current) => current.map((item) => (item.id === todo.id ? updated : item)));
    } catch (toggleError) {
      setActionError(toggleError instanceof Error ? toggleError.message : 'Unable to update todo.');
    }
  }

  async function handleDelete(todoId) {
    setActionError('');
    try {
      await deleteTodo(todoId);
      setTodos((current) => current.filter((item) => item.id !== todoId));
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Unable to delete todo.');
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Preview-ready Todo App</p>
          <h1>Keep your tasks in sync with the backend.</h1>
          <p className="hero-copy">
            Add, complete, and remove todos with a React + Vite interface powered by the existing
            <code> /api/todos </code> contract.
          </p>
        </div>
        <div className="hero-stats" aria-label="Todo summary">
          <div>
            <span>Total</span>
            <strong>{todos.length}</strong>
          </div>
          <div>
            <span>Done</span>
            <strong>{completedCount}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <form className="todo-form" onSubmit={handleSubmit}>
          <label className="input-group" htmlFor="todo-title">
            <span className="input-label">New todo</span>
            <input
              id="todo-title"
              name="title"
              type="text"
              placeholder="Write a task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={submitting}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            <Plus size={16} />
            {submitting ? 'Adding…' : 'Add todo'}
          </button>
        </form>

        {actionError ? <p className="inline-error" role="alert">{actionError}</p> : null}

        <div className="toolbar">
          <h2>Tasks</h2>
          <button className="secondary-button" onClick={loadTodos} type="button">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading ? <LoadingSkeleton /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={loadTodos} /> : null}
        {!loading && !error && todos.length === 0 ? <EmptyState /> : null}

        {!loading && !error && todos.length > 0 ? (
          <div className="todo-list">
            {todos.map((todo) => (
              <article className="todo-card" key={todo.id}>
                <button
                  aria-label={todo.completed ? `Mark ${todo.title} as incomplete` : `Mark ${todo.title} as complete`}
                  className={`toggle-button ${todo.completed ? 'is-complete' : ''}`}
                  onClick={() => handleToggle(todo)}
                  type="button"
                >
                  <CheckCircle2 size={20} />
                </button>

                <div className="todo-content">
                  <h3 className={todo.completed ? 'completed' : ''}>{todo.title}</h3>
                  <p>
                    Created {new Date(todo.created_at).toLocaleString()} • Updated{' '}
                    {new Date(todo.updated_at).toLocaleString()}
                  </p>
                </div>

                <button
                  aria-label={`Delete ${todo.title}`}
                  className="icon-button danger"
                  onClick={() => handleDelete(todo.id)}
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
