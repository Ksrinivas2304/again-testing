import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type TodoCreate = {
  title: string;
};

type TodoUpdate = {
  completed: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = 'Something went wrong.';
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        message = data.detail;
      }
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function TodoSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white/70"
        />
      ))}
    </div>
  );
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((todo) => todo.completed).length;
    return { total, completed, remaining: total - completed };
  }, [todos]);

  const loadTodos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await request<Todo[]>('/api/todos', { method: 'GET' });
      setTodos(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load todos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTodos();
  }, []);

  const handleCreateTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Please enter a todo title.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const body: TodoCreate = { title: trimmedTitle };
      const createdTodo = await request<Todo>('/api/todos', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setTodos((current) => [...current, createdTodo]);
      setTitle('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create todo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    setActiveTodoId(todo.id);
    setError(null);

    try {
      const body: TodoUpdate = { completed: !todo.completed };
      const updatedTodo = await request<Todo>(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setTodos((current) =>
        current.map((item) => (item.id === updatedTodo.id ? updatedTodo : item)),
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update todo.');
    } finally {
      setActiveTodoId(null);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    setActiveTodoId(todoId);
    setError(null);

    try {
      await request<void>(`/api/todos/${todoId}`, { method: 'DELETE' });
      setTodos((current) => current.filter((todo) => todo.id !== todoId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete todo.');
    } finally {
      setActiveTodoId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-4 py-10 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur xl:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
                <CheckCircle2 className="h-4 w-4" />
                Todo dashboard
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Stay on top of every task.
                </h1>
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                  Create, complete, and clear todos with a responsive workflow powered by your
                  existing backend API.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadTodos();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-300/50 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              aria-label="Refresh todos"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total', value: counts.total },
              { label: 'Completed', value: counts.completed },
              { label: 'Remaining', value: counts.remaining },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-lg shadow-slate-950/20"
              >
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Add a new todo</h2>
                <p className="text-sm text-slate-300">Capture tasks the moment they appear.</p>
              </div>
            </div>

            <form onSubmit={handleCreateTodo} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="todo-title" className="text-sm font-medium text-slate-200">
                  Todo title
                </label>
                <input
                  id="todo-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Write your next task"
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  aria-required="true"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-cyan-500/70"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isSubmitting ? 'Creating todo...' : 'Create todo'}
              </button>
            </form>

            {error ? (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Your todos</h2>
                <p className="text-sm text-slate-300">Synced live from GET /api/todos.</p>
              </div>
            </div>

            {isLoading ? <TodoSkeleton /> : null}

            {!isLoading && todos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/30 px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-cyan-200">
                  <Circle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">No todos yet</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Create your first task to get started and see it appear here instantly.
                </p>
              </div>
            ) : null}

            {!isLoading && todos.length > 0 ? (
              <ul className="space-y-3">
                {todos.map((todo) => {
                  const isBusy = activeTodoId === todo.id;

                  return (
                    <li
                      key={todo.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 transition hover:border-cyan-300/30 hover:bg-slate-950/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            void handleToggleTodo(todo);
                          }}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-xl"
                          disabled={isBusy}
                          aria-label={todo.completed ? `Mark ${todo.title} as incomplete` : `Mark ${todo.title} as complete`}
                        >
                          <span className="mt-0.5 text-cyan-200">
                            {isBusy ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : todo.completed ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block text-base font-medium ${
                                todo.completed ? 'text-slate-400 line-through' : 'text-white'
                              }`}
                            >
                              {todo.title}
                            </span>
                            <span className="mt-1 block text-xs text-slate-400">
                              Updated {formatTimestamp(todo.updated_at)}
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteTodo(todo.id);
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isBusy}
                          aria-label={`Delete ${todo.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
