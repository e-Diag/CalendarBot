import { motion, PanInfo } from 'motion/react';
import { FileText, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { ScheduleItem } from '../api/client';
import { useItems } from '../hooks/useItems';

interface NotesProps {
  onEditNote: (note: ScheduleItem) => void;
  items: ScheduleItem[];
}

export default function Notes({ onEditNote, items }: NotesProps) {
  const { deleteItem } = useItems();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredNotes = items.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, noteId: string) => {
    if (Math.abs(info.offset.x) > 100) {
      setDeletingId(noteId);
      const success = await deleteItem(noteId);
      if (success) {
        setTimeout(() => {
          setDeletingId(null);
        }, 300);
      } else {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} час назад`;
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дня назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-800 to-blue-500';
      case 'purple':
        return 'from-purple-800 to-purple-500';
      case 'cyan':
        return 'from-cyan-800 to-cyan-500';
      default:
        return 'from-blue-800 to-blue-500';
    }
  };

  if (filteredNotes.length === 0 && items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="pb-32 px-6 pt-8 flex items-center justify-center min-h-[80vh]"
      >
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-800 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center opacity-20">
            <FileText size={48} className="text-white" />
          </div>
          <h3 className="text-gray-900 dark:text-white mb-2">Пока нет заметок</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Нажмите кнопку +, чтобы создать первую заметку
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="pb-32 px-6 pt-8"
    >
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h2 className="text-gray-900 dark:text-white mb-4">Заметки</h2>
          
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск заметок..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 rounded-xl pl-12 pr-4 py-3 shadow-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredNotes.length === 0 && items.length > 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Ничего не найдено
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: deletingId === note.id ? 0 : 1,
                  y: 0,
                  x: deletingId === note.id ? 100 : 0,
                }}
                transition={{ delay: index * 0.05 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => handleDragEnd(e, info, note.id)}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden"
                onClick={() => onEditNote(note)}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-800 to-purple-500`} />
                
                <div className="pl-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-gray-900 dark:text-white flex-1">{note.title || 'Без названия'}</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{formatDate(note.last_edited)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{note.content || ''}</p>
                </div>

                <motion.div
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0"
                  animate={{ opacity: 0 }}
                >
                  <Trash2 size={20} className="text-red-500" />
                </motion.div>
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Проведите влево, чтобы удалить заметку
        </div>
      </div>
    </motion.div>
  );
}
