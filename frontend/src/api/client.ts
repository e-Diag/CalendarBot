const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface ScheduleItem {
  id: string;
  owner_id: string;
  type: string;
  title: string;
  content: string;
  target_time_utc: string;
  is_editable: boolean;
  last_edited: string;
}

export interface CreateItemRequest {
  type: string;
  title: string;
  content: string;
  target_time_utc?: string;
  is_editable?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Получаем initData из Telegram WebApp если доступен
    const telegramWebApp = (window as any).Telegram?.WebApp;
    let initData = '';
    
    if (telegramWebApp) {
      // Инициализируем Telegram WebApp если еще не инициализирован
      if (!telegramWebApp.readyState) {
        telegramWebApp.ready();
      }
      initData = telegramWebApp.initData || '';
      
      // Расширяем приложение на весь экран
      telegramWebApp.expand();
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(initData && { Authorization: initData }),
      ...options?.headers,
    };

    console.log('API Request:', { url, method: options?.method || 'GET', hasInitData: !!initData });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', error, 'Status:', response.status);
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async getItems(): Promise<ScheduleItem[]> {
    return this.request<ScheduleItem[]>('/api/items');
  }

  async createItem(item: CreateItemRequest): Promise<ScheduleItem> {
    return this.request<ScheduleItem>('/api/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateItem(id: string, item: Partial<CreateItemRequest>): Promise<ScheduleItem> {
    return this.request<ScheduleItem>(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async deleteItem(id: string): Promise<void> {
    return this.request<void>(`/api/items/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

