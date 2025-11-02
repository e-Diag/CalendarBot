import { motion } from 'motion/react';
import { Calendar as CalendarIcon, FileText, Clock, TrendingUp } from 'lucide-react';

import { ScheduleItem } from '../api/client';

interface HomeProps {
  onNavigate: (screen: string) => void;
  items: ScheduleItem[];
}

export default function Home({ onNavigate, items }: HomeProps) {
  const notes = items.filter(i => i.type === 'note');
  const events = items.filter(i => i.type === 'event');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayItems = items.filter(item => {
    const itemDate = new Date(item.target_time_utc);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate.getTime() === today.getTime();
  });

  const stats = [
    { label: 'События', value: events.length.toString(), icon: CalendarIcon, color: 'from-blue-800 to-blue-500' },
    { label: 'Заметки', value: notes.length.toString(), icon: FileText, color: 'from-purple-800 to-purple-500' },
    { label: 'Сегодня', value: todayItems.length.toString(), icon: Clock, color: 'from-cyan-800 to-cyan-500' },
  ];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} час назад`;
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дня назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const recentItems = items
    .slice()
    .sort((a, b) => new Date(b.last_edited).getTime() - new Date(a.last_edited).getTime())
    .slice(0, 3)
    .map(item => ({
      id: item.id,
      title: item.title || 'Без названия',
      time: formatTime(item.last_edited),
      type: item.type === 'event' ? 'событие' : 'заметка',
      color: item.type === 'event' ? 'bg-blue-500' : 'bg-purple-500',
    }));

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
          <h1 className="text-gray-900 dark:text-white mb-2">С возвращением!</h1>
          <p className="text-gray-600 dark:text-gray-400">Вот что происходит сегодня</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="text-2xl mb-1 text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-gray-900 dark:text-white">Недавняя активность</h3>
          <TrendingUp size={20} className="text-gray-400" />
        </div>

        <div className="space-y-3">
          {recentItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate(item.type === 'событие' ? 'calendar' : 'notes')}
            >
              <div className={`w-2 h-2 ${item.color} rounded-full`} />
              <div className="flex-1">
                <div className="text-gray-900 dark:text-white mb-1">{item.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{item.time}</div>
              </div>
              <div className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                {item.type}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
