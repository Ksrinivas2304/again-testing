const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Something went wrong.';
    try {
      const data = await response.json();
      if (typeof data?.detail === 'string' && data.detail) {
        message = data.detail;
      }
    } catch {
      message = response.status === 204 ? '' : message;
    }
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function fetchTodos() {
  return request('/api/todos');
}

export function createTodo(title) {
  return request('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function updateTodo(id, completed) {
  return request(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

export function deleteTodo(id) {
  return request(`/api/todos/${id}`, {
    method: 'DELETE',
  });
}
