const API_BASE_URL = 'http://10.186.95.32:4000/api'; // keep your current working IP

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body: unknown, operationId?: string): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: operationId ? { 'X-Operation-Id': operationId } : {},
    });
  }

  put<T>(path: string, body: unknown, operationId?: string): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: operationId ? { 'X-Operation-Id': operationId } : {},
    });
  }

  delete<T>(path: string, body: unknown, operationId?: string): Promise<T> {
    return this.request<T>(path, {
      method: 'DELETE',
      body: JSON.stringify(body),
      headers: operationId ? { 'X-Operation-Id': operationId } : {},
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);