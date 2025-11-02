import { useState, useEffect } from 'react';
import axios from 'axios';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function useItems() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/items`, { headers: { Authorization: WebApp.initData } })
      .then(res => setItems(res.data));
  }, []);

  const addItem = (item: any) => {
    axios.post(`${API_URL}/api/items`, item, { headers: { Authorization: WebApp.initData } })
      .then(res => setItems(prev => [...prev, res.data]));
  };

  return { items, addItem };
}