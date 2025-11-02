import { motion } from 'motion/react';
import { Moon, Sun, Bell, Globe, Info, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function Settings() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const settingsSections = [
    {
      title: 'Внешний вид',
      items: [
        {
          icon: darkMode ? Moon : Sun,
          label: 'Темная тема',
          type: 'toggle',
          value: darkMode,
          onChange: setDarkMode,
        },
      ],
    },
    {
      title: 'Настройки',
      items: [
        {
          icon: Bell,
          label: 'Уведомления',
          type: 'toggle',
          value: notifications,
          onChange: setNotifications,
        },
        {
          icon: Globe,
          label: 'Язык',
          type: 'navigate',
          value: 'Русский',
        },
      ],
    },
    {
      title: 'О приложении',
      items: [
        {
          icon: Info,
          label: 'Версия',
          type: 'info',
          value: '1.0.0',
        },
      ],
    },
  ];

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
          <h2 className="text-gray-900 dark:text-white mb-2">Настройки</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Настройте приложение под себя</p>
        </div>

        <div className="space-y-6">
          {settingsSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-3 px-1">{section.title}</h4>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between px-4 py-4 ${
                        itemIndex !== section.items.length - 1
                          ? 'border-b border-gray-100 dark:border-gray-700'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-800 to-blue-500 rounded-lg flex items-center justify-center">
                          <Icon size={20} className="text-white" />
                        </div>
                        <span className="text-gray-900 dark:text-white">{item.label}</span>
                      </div>

                      {item.type === 'toggle' && (
                        <button
                          onClick={() => item.onChange?.(!item.value)}
                          className={`w-12 h-7 rounded-full transition-colors ${
                            item.value
                              ? 'bg-gradient-to-r from-blue-800 to-blue-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                              item.value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}

                      {item.type === 'navigate' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{item.value}</span>
                          <ChevronRight size={20} className="text-gray-400" />
                        </div>
                      )}

                      {item.type === 'info' && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">{item.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Сделано с ❤️ для Telegram Mini Apps
          </p>
        </div>
      </div>
    </motion.div>
  );
}
