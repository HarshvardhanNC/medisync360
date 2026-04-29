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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login?expired=1';
      }
      throw new Error('Session expired. Please log in again.');
    }

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data.error || data.message || 'API request failed';

      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the backend at ${API_URL}. Make sure the API server is running.`,
      );
    }

    throw error;
  }
};

/**
 * Sends a multipart/form-data request (required for Multer file uploads).
 * Do NOT set Content-Type manually — the browser sets it with the correct boundary.
 */
export const fetchAPIForm = async (endpoint: string, formData: FormData) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login?expired=1';
      }
      throw new Error('Session expired. Please log in again.');
    }

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data.error || data.message || 'Upload failed';

      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error('API Form Error:', error);

    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the backend at ${API_URL}. Make sure the API server is running.`,
      );
    }

    throw error;
  }
};
