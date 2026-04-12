const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const fetchAPI = async (endpoint: string, method: string = 'GET', body: any = null) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (response.status === 401) {
       // Token expired or invalid
       if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          window.location.href = '/login?expired=1';
       }
       throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
