const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const TOKEN_STORAGE_KEY = 'collabscore_jwt';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function consumeTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (hash.startsWith('#token=')) {
    const token = decodeURIComponent(hash.slice('#token='.length));
    setStoredToken(token);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return token;
  }
  return null;
}

export function getGoogleOAuthStartUrl() {
  return `${API_BASE}/api/auth/google`;
}

async function apiFetch(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Unexpected response format' };
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

export const api = {
  getAuthConfig: () => apiFetch('/api/auth/config'),
  loginDemo: async () => {
    const res = await apiFetch('/api/auth/demo', { method: 'POST' });
    if (res.token) setStoredToken(res.token);
    return res;
  },
  getMe: () => apiFetch('/api/auth/me'),
  switchRole: async (role) => {
    const res = await apiFetch('/api/auth/role', {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },
  getGooglePickerToken: () => apiFetch('/api/auth/google-token'),
  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },
  getClassroomCourses: () => apiFetch('/api/classroom/courses'),
  getClassroomRoster: (courseId) =>
    apiFetch(`/api/classroom/courses/${encodeURIComponent(courseId)}/roster`),
  listProjects: () => apiFetch('/api/projects'),
  createProject: (payload) =>
    apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getProject: (id) => apiFetch(`/api/projects/${id}`),
  addMember: (id, payload) =>
    apiFetch(`/api/projects/${id}/members`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  removeMember: (id, memberId) =>
    apiFetch(`/api/projects/${id}/members/${memberId}`, { method: 'DELETE' }),
  attachFiles: (id, files) =>
    apiFetch(`/api/projects/${id}/files`, {
      method: 'POST',
      body: JSON.stringify({ files })
    }),
  syncFile: (id, fileId) =>
    apiFetch(`/api/projects/${id}/files/${fileId}/sync`, { method: 'POST' }),
  syncAllFiles: (id) => apiFetch(`/api/projects/${id}/sync-all`, { method: 'POST' }),
  removeFile: (id, fileId) =>
    apiFetch(`/api/projects/${id}/files/${fileId}`, { method: 'DELETE' }),
  submitPeerReview: (id, payload) =>
    apiFetch(`/api/projects/${id}/peer-reviews`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  analyzeProject: (id, forceRefresh = false) =>
    apiFetch(`/api/projects/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ forceRefresh })
    }),
  updateBaseGrade: (id, group_base_grade) =>
    apiFetch(`/api/projects/${id}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ group_base_grade })
    })
};
