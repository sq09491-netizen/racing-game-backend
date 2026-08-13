/**
 * Thin wrapper around fetch() so every page talks to the API the same way.
 * The JWT is kept in localStorage and attached automatically.
 */
const API = (() => {
  const BASE_URL = 'http://10.149.192.169:3000';
  const TOKEN_KEY = 'crg_token';
  const USER_KEY = 'crg_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try {
      data = await res.json();
    } catch { /* empty body */ }

    if (!res.ok) {
      if (res.status === 401) clearSession();
      throw new Error(data.message || 'Request failed. Try again.');
    }
    return data;
  }

  /** Send the player to the login page if there is no session. */
  function requireLogin() {
    if (!getToken()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  return {
    getToken,
    getUser,
    setSession,
    clearSession,
    requireLogin,
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
    me: () => request('/auth/me'),
    saveScore: (payload) => request('/game/score', { method: 'POST', body: payload }),
    leaderboard: () => request('/game/leaderboard'),
    history: () => request('/game/history'),
  };
})();