const API_BASE = '/api';

// Get session from localStorage
function getSessionId() {
  return localStorage.getItem('sessionId');
}

// Save session to localStorage
export function setSessionId(sessionId) {
  localStorage.setItem('sessionId', sessionId);
}

// Clear session
export function clearSession() {
  localStorage.removeItem('sessionId');
}

// Generic fetch wrapper
async function fetchApi(path, options = {}) {
  const sessionId = getSessionId();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth API
export const auth = {
  register: (data) => fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
  me: () => fetchApi('/auth/me'),
  updateProfile: (data) => fetchApi('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => fetchApi('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
};

// Inbox API
export const inbox = {
  getAll: () => fetchApi('/inbox'),
  create: (data) => fetchApi('/inbox', { method: 'POST', body: JSON.stringify(data) }),
  process: (id, data) => fetchApi(`/inbox/${id}/process`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Actions API
export const actions = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/actions${query ? `?${query}` : ''}`);
  },
  get: (id) => fetchApi(`/actions/${id}`),
  create: (data) => fetchApi('/actions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/actions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/actions/${id}`, { method: 'DELETE' }),
  complete: (id) => fetchApi(`/actions/${id}/complete`, { method: 'PUT' }),
  uncomplete: (id) => fetchApi(`/actions/${id}/uncomplete`, { method: 'PUT' }),
  flag: (id) => fetchApi(`/actions/${id}/flag`, { method: 'PUT' }),
  unflag: (id) => fetchApi(`/actions/${id}/unflag`, { method: 'PUT' }),
  reorder: (actionIds) => fetchApi('/actions/reorder', { method: 'PUT', body: JSON.stringify({ actionIds }) }),
};

// Projects API
export const projects = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/projects${query ? `?${query}` : ''}`);
  },
  get: (id) => fetchApi(`/projects/${id}`),
  create: (data) => fetchApi('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/projects/${id}`, { method: 'DELETE' }),
  updateStatus: (id, status) => fetchApi(`/projects/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  review: (id, notes) => fetchApi(`/projects/${id}/review`, { method: 'PUT', body: JSON.stringify({ notes }) }),
  getActions: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/projects/${id}/actions${query ? `?${query}` : ''}`);
  },
  reorder: (projectIds) => fetchApi('/projects/reorder', { method: 'PUT', body: JSON.stringify({ projectIds }) }),
};

// Tags API
export const tags = {
  getAll: () => fetchApi('/tags'),
  create: (data) => fetchApi('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/tags/${id}`, { method: 'DELETE' }),
  getActions: (id) => fetchApi(`/tags/${id}/actions`),
  reorder: (tagIds) => fetchApi('/tags/reorder', { method: 'PUT', body: JSON.stringify({ tagIds }) }),
};

// Folders API
export const folders = {
  getAll: () => fetchApi('/folders'),
  create: (data) => fetchApi('/folders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/folders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/folders/${id}`, { method: 'DELETE' }),
  reorder: (folderIds) => fetchApi('/folders/reorder', { method: 'PUT', body: JSON.stringify({ folderIds }) }),
};

// Review API
export const review = {
  getProjects: () => fetchApi('/review/projects'),
  getStats: () => fetchApi('/review/stats'),
};

// Search API
export const search = {
  query: (q) => fetchApi(`/search?q=${encodeURIComponent(q)}`),
  advanced: (params) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/search/advanced?${query}`);
  },
};

// Stats API
export const stats = {
  overview: () => fetchApi('/stats/overview'),
  completed: (days = 30) => fetchApi(`/stats/completed?days=${days}`),
  productivity: () => fetchApi('/stats/productivity'),
};
