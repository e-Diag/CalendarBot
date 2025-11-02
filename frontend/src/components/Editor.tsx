import { motion } from 'motion/react';
import { ArrowLeft, Save, Palette } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ScheduleItem } from '../api/client';

interface EditorProps {
  note?: ScheduleItem;
  onBack: () => void;
  onSave: (note: { title: string; content: string; color?: string }) => void;
}

export default function Editor({ note, onBack, onSave }: EditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [selectedColor, setSelectedColor] = useState('blue');

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [note]);

  const colors = [
    { name: 'blue', class: 'bg-blue-500' },
    { name: 'purple', class: 'bg-purple-500' },
    { name: 'cyan', class: 'bg-cyan-500' },
    { name: 'pink', class: 'bg-pink-500' },
    { name: 'green', class: 'bg-green-500' },
  ];

  const handleSave = () => {
    if (title.trim() || content.trim()) {
      onSave({
        title: title.trim() || 'Без названия',
        content: content.trim(),
        color: selectedColor,
      });
    } else {
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="pb-32 px-6 pt-8 min-h-screen"
    >
      <div className="max-w-md mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          
          <h2 className="text-gray-900 dark:text-white">{note ? 'Редактировать заметку' : 'Новая заметка'}</h2>
          
          <button
            onClick={handleSave}
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-800 to-blue-500 flex items-center justify-center shadow-sm"
          >
            <Save size={20} className="text-white" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="Название заметки"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-2xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <Palette size={20} className="text-gray-400" />
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-8 h-8 rounded-full ${color.class} ${
                    selectedColor === color.name
                      ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-gray-900 dark:ring-white'
                      : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm min-h-[400px]">
            <textarea
              placeholder="Начните печатать..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none resize-none"
              rows={15}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
