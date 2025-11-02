import React, { useState } from 'react';
import { Calendar, NotebookText, Zap } from 'lucide-react';
import { useItems } from './hooks/useItems'; // Создай ниже

export default function App() {
  const [page, setPage] = useState<'calendar' | 'notes'>('notes');
  const { items, addItem } = useItems(); // Хук для API

  const createNote = () => {
    addItem({ type: 'Note', title: 'Новая заметка', content: 'Текст...' });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Мой Планировщик</h1>
      {page === 'notes' && <div>{items.map(item => <div key={item.id}>{item.title}</div>)}</div>}
      <nav className="fixed bottom-4 left-0 right-0 flex justify-around">
        <button onClick={() => setPage('calendar')}><Calendar size={24} /></button>
        <button onClick={() => setPage('notes')}><NotebookText size={24} /></button>
        <button onClick={createNote}><Zap size={24} /></button>
      </nav>
    </div>
  );
}