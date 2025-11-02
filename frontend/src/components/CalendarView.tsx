import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useItems } from '../hooks/useItems';
import { ScheduleItem } from '../api/client';

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { items, loading } = useItems();

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  // Группируем события по дням месяца
  const eventsByDay = useMemo(() => {
    const events: { [key: number]: ScheduleItem[] } = {};
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    items
      .filter(item => item.type === 'event')
      .forEach(item => {
        if (item.target_time_utc) {
          const eventDate = new Date(item.target_time_utc);
          if (eventDate.getFullYear() === year && eventDate.getMonth() === month) {
            const day = eventDate.getDate();
            if (!events[day]) {
              events[day] = [];
            }
            events[day].push(item);
          }
        }
      });
    
    return events;
  }, [items, currentMonth]);

  // Получаем предстоящие события для отображения внизу
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return items
      .filter(item => {
        if (item.type !== 'event' || !item.target_time_utc) return false;
        const eventDate = new Date(item.target_time_utc);
        return eventDate >= now;
      })
      .sort((a, b) => {
        const dateA = new Date(a.target_time_utc).getTime();
        const dateB = new Date(b.target_time_utc).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [items]);

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  const isCurrentMonth = currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="pb-32 px-6 pt-8"
    >
      <div className="max-w-md mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900 dark:text-white">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Ваше расписание</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
            >
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const isToday = isCurrentMonth && day === today.getDate();
              const dayEvents = day ? eventsByDay[day] : null;
              const hasEvents = dayEvents && dayEvents.length > 0;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg relative ${
                    day
                      ? isToday
                        ? 'bg-gradient-to-br from-blue-800 to-blue-500 text-white'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white cursor-pointer'
                      : ''
                  }`}
                >
                  {day && (
                    <>
                      <span className="text-sm">{day}</span>
                      {hasEvents && (
                        <div className="flex gap-1 mt-1 flex-wrap justify-center max-w-full">
                          {dayEvents!.slice(0, 3).map((event, i) => (
                            <div
                              key={event.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isToday ? 'bg-white' : 'bg-blue-500'
                              }`}
                              title={event.title}
                            />
                          ))}
                          {dayEvents!.length > 3 && (
                            <div className={`text-[8px] ${isToday ? 'text-white' : 'text-gray-400'}`}>
                              +{dayEvents!.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-gray-900 dark:text-white mb-4">Предстоящие события</h3>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Загрузка событий...
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Нет предстоящих событий
            </div>
          ) : (
            upcomingEvents.map((event, index) => {
              const eventDate = new Date(event.target_time_utc);
              const day = eventDate.getDate();
              const month = eventDate.getMonth();
              const hours = eventDate.getHours().toString().padStart(2, '0');
              const minutes = eventDate.getMinutes().toString().padStart(2, '0');
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-800 to-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">{day}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white mb-1">{event.title || 'Без названия'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {hours}:{minutes} - {eventDate.toLocaleDateString('ru-RU', { month: 'short' })}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
