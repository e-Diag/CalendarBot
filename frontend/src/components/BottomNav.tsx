import { Home, Calendar, FileText } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Главная' },
    { id: 'calendar', icon: Calendar, label: 'Календарь' },
    { id: 'notes', icon: FileText, label: 'Заметки' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-transparent to-black/10 dark:to-black/30">
      <div className="max-w-md mx-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800">
        <div className="flex justify-around items-center px-4 py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
