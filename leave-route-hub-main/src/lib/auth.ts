// Browser-compatible auth utilities
// JWT verification is handled by the backend

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'advisor' | 'hod';
  department?: string;
}

// Token generation and verification is handled by the backend
// These functions are not needed in the browser

export const getAuthUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('auth_user');
  
  if (!token || !userData) return null;
  
  try {
    // Just parse the user data - token validation is done by the backend
    return JSON.parse(userData);
  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    return null;
  }
};

export const setAuthUser = (user: AuthUser, token: string): void => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
};

export const clearAuth = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};
