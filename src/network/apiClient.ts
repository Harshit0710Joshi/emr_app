// Change this to your machine's LAN IP when testing on a physical device,
// or your deployed backend URL in production. localhost won't work from
// a physical device or most emulators except Android Studio's default AVD.
const API_BASE_URL = 'http://10.109.210.32:4000/api'; // 10.0.2.2 = Android emulator's alias for host machine's localhost

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

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', body: JSON.stringify(body) });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);