import { auth } from './firebase';

export async function fetchApi(endpoint: string, options: RequestInit = {}, requireAuth: boolean = true) {
  const user = auth.currentUser;
  if (!user && requireAuth) throw new Error("Not authenticated");
  
  const headers = new Headers(options.headers);
  if (user) {
    try {
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
      const sessionToken = localStorage.getItem('kasrology_session');
      if (sessionToken) {
        headers.set('x-session-token', sessionToken);
      }
    } catch (e) {
      console.warn('Error acquiring ID token:', e);
    }
  }
  
  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (data.error === 'SESSION_INVALIDATED') {
      alert(data.message);
      // Auto logout
      localStorage.removeItem('kasrology_session');
      window.location.href = '/login';
    }
    throw new Error(data.error || 'API Error');
  }
  
  return data;
}
