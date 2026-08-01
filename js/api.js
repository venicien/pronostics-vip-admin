export const API_BASE_URL = window.__API_BASE_URL__ || 'https://ton-backend.onrender.com';

export function getAdminKey() {
  return localStorage.getItem('admin_api_key') || '';
}
export function setAdminKey(key) {
  localStorage.setItem('admin_api_key', key);
}
export function clearAdminKey() {
  localStorage.removeItem('admin_api_key');
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': getAdminKey() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearAdminKey();
    window.location.reload();
    throw new Error('Session admin invalide');
  }
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

export const api = {
  listContent: () => request('/api/admin/content'),
  createContent: (payload) => request('/api/admin/content', { method: 'POST', body: payload }),
  updateContent: (id, payload) => request(`/api/admin/content/${id}`, { method: 'PATCH', body: payload }),
  publishContent: (id) => request(`/api/admin/content/${id}/publish`, { method: 'POST' }),

  listBanners: () => request('/api/admin/banners'),
  createBanner: (payload) => request('/api/admin/banners', { method: 'POST', body: payload }),
  updateBanner: (id, payload) => request(`/api/admin/banners/${id}`, { method: 'PATCH', body: payload }),

  listBookmakers: () => request('/api/admin/bookmakers'),
  createBookmaker: (payload) => request('/api/admin/bookmakers', { method: 'POST', body: payload }),
  updateBookmaker: (id, payload) => request(`/api/admin/bookmakers/${id}`, { method: 'PATCH', body: payload }),

  broadcastWinBack: (message) => request('/api/admin/broadcast/win-back', { method: 'POST', body: { message } }),

  getSettings: () => request('/api/admin/settings'),
  updateSetting: (key, value) => request(`/api/admin/settings/${key}`, { method: 'PATCH', body: { value } }),

  listFaq: () => request('/api/admin/faq'),
  createFaq: (payload) => request('/api/admin/faq', { method: 'POST', body: payload }),
  updateFaq: (id, payload) => request(`/api/admin/faq/${id}`, { method: 'PATCH', body: payload }),
  deleteFaq: (id) => request(`/api/admin/faq/${id}`, { method: 'DELETE' }),

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/api/admin/upload`, {
      method: 'POST',
      headers: { 'X-Admin-Key': getAdminKey() },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  },
};
