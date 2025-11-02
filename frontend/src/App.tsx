// @ts-ignore - Types will be available after npm install
import { useState, useEffect } from 'react';
// @ts-ignore - Types will be available after npm install
import { AnimatePresence } from 'motion/react';
import BottomNav from './components/BottomNav';
import FloatingAddButton from './components/FloatingAddButton';
import Home from './components/Home';
import CalendarView from './components/CalendarView';
import Notes from './components/Notes';
import Editor from './components/Editor';
import Settings from './components/Settings';
import { useItems } from './hooks/useItems';
import { ScheduleItem } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [editingNote, setEditingNote] = useState<ScheduleItem | undefined>(undefined);
  const { items, createItem, updateItem, fetchItems } = useItems();

  useEffect(() => {
    // Check for Telegram theme or system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentScreen(tab);
    setEditingNote(undefined);
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
    setActiveTab(screen);
  };

  const handleAddClick = () => {
    setEditingNote(undefined);
    setCurrentScreen('editor');
  };

  const handleEditNote = (note: ScheduleItem) => {
    setEditingNote(note);
    setCurrentScreen('editor');
  };

  const handleSaveNote = async (note: { title: string; content: string; color?: string }) => {
    if (editingNote) {
      // Обновление существующей заметки
      await updateItem(editingNote.id, {
        title: note.title,
        content: note.content,
        type: 'note',
      });
    } else {
      // Создание новой заметки
      await createItem({
        type: 'note',
        title: note.title,
        content: note.content,
        is_editable: true,
      });
    }
    await fetchItems();
    setCurrentScreen(activeTab);
  };

  const handleBackFromEditor = () => {
    setCurrentScreen(activeTab);
  };

  return (
    // @ts-ignore - JSX types will be available after npm install
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="min-h-screen bg-white/95 dark:bg-gray-900/95">
        <AnimatePresence mode="wait">
          {currentScreen === 'home' && (
            // @ts-ignore - key is a valid React prop
            <Home key="home" onNavigate={handleNavigate} items={items} />
          )}
          
          {currentScreen === 'calendar' && (
            // @ts-ignore - key is a valid React prop
            <CalendarView key="calendar" />
          )}
          
          {currentScreen === 'notes' && (
            // @ts-ignore - key is a valid React prop
            <Notes key="notes" onEditNote={handleEditNote} items={items.filter((i: ScheduleItem) => i.type === 'note')} />
          )}
          
          {currentScreen === 'editor' && (
            <Editor
              key="editor"
              note={editingNote}
              onBack={handleBackFromEditor}
              onSave={handleSaveNote}
            />
          )}
          
          {currentScreen === 'settings' && (
            // @ts-ignore - key is a valid React prop
            <Settings key="settings" />
          )}
        </AnimatePresence>

        {currentScreen !== 'editor' && (
          <>
            <FloatingAddButton onClick={handleAddClick} />
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </>
        )}
      </div>
    </div>
  );
}
