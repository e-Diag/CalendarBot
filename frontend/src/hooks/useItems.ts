import { useState, useEffect } from 'react';
import { apiClient, ScheduleItem, CreateItemRequest } from '../api/client';

export function useItems() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching items...');
      const data = await apiClient.getItems();
      console.log('Items fetched:', data);
      setItems(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки данных';
      setError(errorMessage);
      console.error('Error fetching items:', err);
      // Устанавливаем пустой массив при ошибке, чтобы не ломать UI
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const createItem = async (item: CreateItemRequest): Promise<ScheduleItem | null> => {
    try {
      setError(null);
      console.log('Creating item:', item);
      const newItem = await apiClient.createItem(item);
      console.log('Item created:', newItem);
      setItems((prev) => [...prev, newItem]);
      return newItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка создания заметки';
      setError(errorMessage);
      console.error('Error creating item:', err);
      // Показываем alert для пользователя
      if ((window as any).Telegram?.WebApp) {
        (window as any).Telegram.WebApp.showAlert(errorMessage);
      } else {
        alert(errorMessage);
      }
      return null;
    }
  };

  const updateItem = async (id: string, item: Partial<CreateItemRequest>): Promise<ScheduleItem | null> => {
    try {
      setError(null);
      const updatedItem = await apiClient.updateItem(id, item);
      setItems((prev) => prev.map((i) => (i.id === id ? updatedItem : i)));
      return updatedItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления заметки');
      console.error('Error updating item:', err);
      return null;
    }
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      await apiClient.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления заметки');
      console.error('Error deleting item:', err);
      return false;
    }
  };

  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}

