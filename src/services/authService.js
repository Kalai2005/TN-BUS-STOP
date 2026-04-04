const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const saveSession = (data) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (data?.token) {
    localStorage.setItem('authToken', data.token);
  }

  if (data?.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  if (data?.user) {
    localStorage.setItem('authUser', JSON.stringify(data.user));
  }

  window.dispatchEvent(new Event('auth:changed'));
};

const clearSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');

  window.dispatchEvent(new Event('auth:changed'));
};

const requestJson = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || `API Error: ${response.status}`);
  }

  return data;
};

const normalizeLoginPayload = (credentials = {}) => {
  const identifier = String(credentials.identifier || credentials.email || '').trim();
  const password = String(credentials.password || '').trim();
  const loginType = String(credentials.loginType || '').trim();

  if (loginType === 'mobile') {
    throw new Error('Mobile login is not supported yet. Use your email address.');
  }

  return {
    email: identifier,
    password,
  };
};

export const authService = {
  login: async (credentials) => {
    const payload = normalizeLoginPayload(credentials);
    const data = await requestJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    saveSession(data);
    return data;
  },

  googleLogin: async (idToken) => {
    const data = await requestJson('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });

    saveSession(data);
    return data;
  },

  register: async (userData) => {
    const data = await requestJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    saveSession(data);
    return data;
  },

  logout: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    try {
      if (token) {
        await requestJson('/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      clearSession();
    }
  },

  getProfile: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return requestJson('/auth/profile', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  getStoredUser: () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem('authUser');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isLoggedIn: () => {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean(localStorage.getItem('authToken'));
  },
};

export const bookingService = {
  getUserBookings: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return requestJson('/bookings/my-bookings', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};
