import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const events: { [key: number]: string[] } = {
    5: ['blue'],
    12: ['blue', 'purple'],
    18: ['cyan'],
    22: ['purple'],
    25: ['blue', 'cyan'],
  };

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
              const hasEvents = day && events[day];

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
                        <div className="flex gap-1 mt-1">
                          {hasEvents.map((color, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                color === 'blue'
                                  ? 'bg-blue-500'
                                  : color === 'purple'
                                  ? 'bg-purple-500'
                                  : 'bg-cyan-500'
                              } ${isToday ? 'bg-white' : ''}`}
                            />
                          ))}
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
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-800 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white">12</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-900 dark:text-white mb-1">Командная встреча</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">14:00 - 15:00</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-800 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white">22</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-900 dark:text-white mb-1">Обзор проекта</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">10:00 - 11:30</div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
