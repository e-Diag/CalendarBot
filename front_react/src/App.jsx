import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Settings, Clock, Calendar, CheckCircle, Trash2, Home, List, ChevronDown, Loader, Zap, Bold, Italic, ListChecks, Palette, NotebookText, Users, MessageSquare } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// --- CONSTANTS ---
const REMINDER_OPTIONS = [
    { label: '5 минут', value: 5, unit: 'minutes' },
    { label: '15 минут', value: 15, unit: 'minutes' },
    { label: '30 минут', value: 30, unit: 'minutes' },
    { label: '1 час', value: 1, unit: 'hour' },
    { label: '2 часа', value: 2, unit: 'hour' },
    { label: '1 день', value: 1, unit: 'day' },
    { label: '2 дня', value: 2, unit: 'day' },
];
const GeminiIcon = ({ size = 20, className = "" }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1.6 15.6H10.4v-4.8H8.8V11.2h1.6V7.6h3.2v3.6h1.6v2.4h-1.6v4.8z" fill="currentColor"/>
    </svg>
);


// --- FIREBASE SETUP AND HOOKS ---

// Глобальные переменные среды (обязательно для Canvas)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app, db, auth;

// Хук для инициализации Firebase и аутентификации
const useFirebaseInit = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        try {
            // 1. Инициализация Firebase
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            
            // Устанавливаем постоянное хранение, чтобы избежать повторной анонимной аутентификации
            setPersistence(auth, browserLocalPersistence);

            // 2. Обработка Аутентификации
            const authenticateUser = async () => {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            };
            
            // 3. Установка слушателя изменений состояния аутентификации
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // Если user null, это означает, что аутентификация еще не произошла
                    // или пользователь вышел. В нашем случае, мы обеспечиваем вход выше.
                    setUserId(crypto.randomUUID()); // Использование временного ID для анонимных
                }
                setIsAuthReady(true);
            });

            authenticateUser();
            return () => unsubscribe();

        } catch (error) {
            console.error("Ошибка инициализации Firebase или Аутентификации:", error);
            setIsAuthReady(true); // Разрешаем UI продолжить, но без данных
        }
    }, []);

    return { isAuthReady, db, auth, userId };
};

// Хук для получения данных из Firestore в реальном времени
const useFirestore = (isAuthReady, userId) => {
    const [items, setItems] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);

    useEffect(() => {
        if (!isAuthReady || !db || !userId) {
            // Ждем, пока аутентификация не будет готова и userId не будет установлен
            return;
        }

        // Путь к коллекции: artifacts/{appId}/users/{userId}/planner_items
        const collectionPath = `artifacts/${appId}/users/${userId}/planner_items`;
        const itemsCollectionRef = collection(db, collectionPath);
        
        // Получаем все записи и сортируем их локально
        const unsubscribe = onSnapshot(itemsCollectionRef, (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Сортировка по lastEdited (самые новые заметки сверху)
            const sortedItems = fetchedItems.sort((a, b) => {
                const dateA = a.lastEdited ? new Date(a.lastEdited).getTime() : 0;
                const dateB = b.lastEdited ? new Date(b.lastEdited).getTime() : 0;
                return dateB - dateA; // Сортировка по убыванию
            });

            setItems(sortedItems);
            setIsDataLoading(false);
            
        }, (error) => {
            console.error("Ошибка подписки Firestore:", error);
            setIsDataLoading(false);
        });

        return () => unsubscribe();
    }, [isAuthReady, userId]);

    return { items, isDataLoading };
};


// --- Вспомогательные функции ---

const generateUniqueId = () => `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const useUrlParams = () => {
  const [params, setParams] = useState({});
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const newParams = {};
    for (const [key, value] of searchParams.entries()) {
      newParams[key] = value;
    }
    setParams(newParams);
  }, []);
  return params;
};

// --- TMA HOOKS ---
const useTma = (mainButtonText, isMainButtonVisible, isMainButtonActive, onMainButtonClick) => {
  const [isTmaReady, setIsTmaReady] = useState(false);
  const tma = window.Telegram?.WebApp;

  useEffect(() => {
    if (tma) {
      tma.ready();
      setIsTmaReady(true);
      if (!tma.isExpanded) { tma.expand(); }

      tma.MainButton.setText(mainButtonText);
      tma.MainButton.setParams({ color: tma.themeParams.button_color });

      if (isMainButtonVisible) { tma.MainButton.show(); } else { tma.MainButton.hide(); }
      if (isMainButtonActive) { tma.MainButton.enable(); } else { tma.MainButton.disable(); }

      tma.onEvent('mainButtonClicked', onMainButtonClick);
      
      return () => { tma.offEvent('mainButtonClicked', onMainButtonClick); };
    } else {
      console.warn("Telegram WebApp SDK не найден. Запуск в режиме разработки.");
      setIsTmaReady(true);
    }
  }, [tma, mainButtonText, isMainButtonVisible, isMainButtonActive, onMainButtonClick]);

  return { isTmaReady, tma };
};

// --- API Gemini (симуляция) ---
const simulateAIChat = (tma, item) => {
    const title = item.title || "Новая заметка";
    tma?.showAlert(`Симуляция: Запущен чат с Gemini.\n\nТема: "${title}".\n\nЗдесь можно попросить ИИ помочь с контентом для заметки, а затем вставить результат в редактор.`, () => {});
};


// --- Компонент "Настройки" ---
const SettingsView = ({ tma, textColor, backgroundColor, hintColor, setCurrentPage, setAccentColor }) => {
    
    if (tma) tma.setHeaderColor('secondary_bg_color');
    const geminiBlue = '#4285F4'; 
    
    const currentAccentColor = window.Telegram?.WebApp?.themeParams?.button_color || '#007aff';


    return (
        <div className="p-4 space-y-6 min-h-screen">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Настройки</h1>
                <button 
                    onClick={() => setCurrentPage('calendar')} 
                    className="p-2 rounded-full transition-colors duration-200" 
                    style={{ backgroundColor: currentAccentColor, color: backgroundColor }}
                >
                    <Home size={20} />
                </button>
            </header>

            {/* Секция Тема */}
            <div className="p-4 rounded-2xl shadow-xl space-y-3" style={{ backgroundColor: hintColor + '08' }}>
                <div className="flex items-center space-x-2" style={{ color: textColor }}>
                    <Palette size={20} />
                    <h2 className="text-lg font-medium">Тема и Цвета</h2>
                </div>
                
                <p className="text-sm" style={{ color: hintColor }}>
                    Приложение использует цвета вашей темы Telegram (TMA) для минимализма.
                </p>

                <div className="pt-3">
                    <label className="text-sm uppercase tracking-wider block mb-2" style={{ color: hintColor }}>Выбрать Акцент</label>
                    <div className="flex space-x-3">
                        {['#007aff', '#34c759', '#ff9500', '#eb5757', geminiBlue].map(color => (
                            <button
                                key={color}
                                onClick={() => setAccentColor(color)}
                                className="w-10 h-10 rounded-full border-2 transition-transform duration-100 transform hover:scale-110"
                                style={{ 
                                    backgroundColor: color, 
                                    borderColor: currentAccentColor === color ? textColor : 'transparent' 
                                }}
                                title={color}
                            />
                        ))}
                    </div>
                </div>
            </div>
            
        </div>
    );
};


// --- Компонент "Редактор" ---
const EditorView = ({ 
    itemData, 
    setItemData, 
    handleDelete, 
    tma, 
    backgroundColor, 
    textColor, 
    accentColor, 
    hintColor, 
    destructiveColor,
    simulateAIChat,
    navigateToSettings
}) => {
    
    const contentRef = useRef(null); 
    const geminiBlue = '#4285F4';
    
    if (tma) tma.setHeaderColor('secondary_bg_color');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setItemData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // Хук для авто-изменения размера textarea
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.style.height = 'auto'; 
            contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
        }
    }, [itemData.content, itemData.type]); 

    
    const handleTypeChange = (newType) => {
        setItemData(prev => {
            let newData = { ...prev, type: newType };
            
            // Логика по управлению датой/временем при смене типа
            if (newType === 'Note') {
                newData.time = '';
                newData.date = ''; 
                newData.hasReminder = false;
                newData.reminderValue = 15;
                newData.reminderUnit = 'minutes';
            } 
            else if (newType === 'Reminder' || newType === 'Event') {
                newData.time = prev.time || '09:00';
                newData.date = prev.date || new Date().toISOString().split('T')[0];
                newData.hasReminder = prev.hasReminder !== undefined ? prev.hasReminder : (newType === 'Reminder'); 
            } 
            
            return newData;
        });
    };
    
    const handleReminderChange = (e) => {
        const [value, unit] = e.target.value.split('_');
        setItemData(prev => ({
            ...prev,
            reminderValue: parseInt(value, 10),
            reminderUnit: unit,
        }));
    };
    
    // Функция для вставки Markdown синтаксиса (симуляция)
    const insertMarkdown = (syntax) => {
        setItemData(prev => {
            const currentContent = prev.content || '';
            const newContent = currentContent + syntax;
            return {
                ...prev,
                content: newContent,
            };
        });
    };


    const TypeButton = ({ type, icon: Icon, label }) => (
        <button
          onClick={() => handleTypeChange(type)}
          className={`flex items-center justify-center p-3 rounded-xl transition-all duration-200 w-1/3 text-sm font-semibold 
            ${itemData.type === type 
              ? 'bg-opacity-90' : 'bg-opacity-10 backdrop-blur-sm hover:bg-opacity-20'}
          `}
          style={{
            backgroundColor: itemData.type === type ? accentColor : 'transparent',
            color: itemData.type === type ? backgroundColor : textColor,
            border: itemData.type !== type ? `1px solid ${hintColor}33` : 'none', 
          }}
        >
          <Icon size={20} className="mr-2" />
          {label}
        </button>
    );
    
    const needsDateTimeSection = itemData.type === 'Event' || itemData.type === 'Reminder';
    const showReminderCheckbox = itemData.type === 'Event';
    const isNoteType = itemData.type === 'Note';
    const isExistingItem = itemData.id && itemData.id !== 'new_item';


    // Стилизация выпадающего списка
    const selectStyle = {
        backgroundColor: hintColor + '15', 
        color: textColor,
        border: 'none',
        padding: '12px',
        borderRadius: '12px',
        appearance: 'none',
        cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23${textColor.slice(1)}'%3E%3Cpath d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' fill-rule='evenodd'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.7rem center',
        backgroundSize: '1.5em 1.5em',
    };
    
    // Функция для симуляции открытия модала совместного доступа
    const handleShare = () => {
        tma?.showAlert('Симуляция: Открытие модала совместного доступа.\n\nЗдесь можно выбрать "Ограниченный доступ" или "Доступ для редактирования".');
    }

    return (
        <div className="p-4 space-y-4">
            
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">
                    {itemData.id && itemData.id !== 'new_item' ? 'Редактировать' : 'Создать'} {isNoteType ? 'Заметку' : itemData.type === 'Event' ? 'Событие' : 'Напоминание'}
                </h1>
                <div className="flex space-x-3">
                    
                    {/* Кнопка Настроек (возвращена в верхний правый угол) */}
                    <button 
                        onClick={navigateToSettings}
                        className="p-2 rounded-full transition-colors duration-200" 
                        style={{ backgroundColor: accentColor, color: backgroundColor }}
                    >
                        <Settings size={20} />
                    </button>
                    
                    {/* Кнопка Поделиться (только для существующих Заметок) */}
                    {isNoteType && isExistingItem && (
                        <button 
                            onClick={handleShare}
                            className="p-2 rounded-full transition-colors duration-200" 
                            style={{ backgroundColor: accentColor, color: backgroundColor }}
                            title="Поделиться заметкой"
                        >
                            <Users size={20} />
                        </button>
                    )}
                    
                    {/* Кнопка Удалить */}
                    {isExistingItem && (
                        <button 
                            onClick={handleDelete}
                            className="p-2 rounded-full transition-colors duration-200" 
                            style={{ backgroundColor: destructiveColor, color: backgroundColor }}
                            title="Удалить запись"
                        >
                          <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </header>
            
            {/* Тип записи */}
            <div className="p-4 rounded-2xl shadow-xl" style={{ backgroundColor: hintColor + '08' }}>
              <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: hintColor }}>Тип записи</label>
              <div className="flex space-x-2">
                <TypeButton type="Event" icon={Calendar} label="Событие" />
                <TypeButton type="Reminder" icon={Clock} label="Напоминание" />
                <TypeButton type="Note" icon={CheckCircle} label="Заметка" />
              </div>
            </div>
            
            {/* Поле Заголовок */}
            <div className="p-4 rounded-2xl shadow-xl" style={{ backgroundColor: hintColor + '08' }}>
              <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: hintColor }} htmlFor="title">Заголовок</label>
              <input
                id="title"
                name="title"
                type="text"
                value={itemData.title}
                onChange={handleChange}
                className="w-full text-lg bg-transparent border-none focus:outline-none placeholder-gray-500"
                style={{ color: textColor }}
                placeholder="Краткое название"
              />
            </div>

            {/* Поле Описание */}
            <div className="p-4 rounded-2xl shadow-xl" style={{ backgroundColor: hintColor + '08' }}>
              <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: hintColor }} htmlFor="content">Описание / Контент</label>
              
              {/* Markdown Controls (для Заметок) */}
              {isNoteType && (
                  <div className="flex space-x-2 mb-2 p-1 rounded-lg" style={{ backgroundColor: hintColor + '11' }}>
                      <button 
                          onClick={() => insertMarkdown('**Жирный текст**')}
                          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                          style={{ color: textColor }}
                          title="Жирный шрифт"
                      >
                          <Bold size={18} />
                      </button>
                      <button 
                          onClick={() => insertMarkdown('*Курсив*')}
                          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                          style={{ color: textColor }}
                          title="Курсив"
                      >
                          <Italic size={18} />
                      </button>
                      <button 
                          onClick={() => insertMarkdown('\n- [ ] Задача')}
                          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                          style={{ color: textColor }}
                          title="Список задач"
                      >
                          <ListChecks size={18} />
                      </button>
                  </div>
              )}
              
              <textarea
                ref={contentRef}
                id="content"
                name="content"
                value={itemData.content}
                onChange={handleChange}
                rows="1" 
                className="w-full text-base bg-transparent border-none focus:outline-none placeholder-gray-500 resize-none overflow-hidden"
                style={{ color: textColor }}
                placeholder="Подробности, место, участники..."
              />
            </div>

            
            {/* КНОТКА AI CHAT (ТОЛЬКО для Заметок) */}
            {isNoteType && (
                <button
                    onClick={() => simulateAIChat(tma, itemData)}
                    className="w-full flex items-center justify-center p-3 rounded-xl text-sm font-bold transition-opacity duration-200 hover:opacity-90"
                    style={{ backgroundColor: geminiBlue, color: 'white' }}
                >
                    <MessageSquare size={20} className="mr-2" style={{ color: 'white' }}/>
                    Открыть чат с Gemini
                </button>
            )}

            
            {/* Дата и Время (ТОЛЬКО для Event/Reminder) */}
            {needsDateTimeSection && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl shadow-xl" style={{ backgroundColor: hintColor + '08' }}>
                  <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: hintColor }} htmlFor="date">Дата</label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={itemData.date}
                    onChange={handleChange}
                    className="w-full text-lg bg-transparent border-none focus:outline-none"
                    style={{ color: textColor }}
                  />
                </div>
                
                <div className="p-4 rounded-2xl shadow-xl" style={{ backgroundColor: hintColor + '08' }}>
                    <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: hintColor }} htmlFor="time">Время</label>
                    <input
                        id="time"
                        name="time"
                        type="time"
                        value={itemData.time}
                        onChange={handleChange}
                        className="w-full text-lg bg-transparent border-none focus:outline-none"
                        style={{ color: textColor }}
                    />
                </div>
              </div>
            )}


            {/* Дата редактирования (ТОЛЬКО для Заметок) */}
            {isNoteType && isExistingItem && (
                 <div className="p-4 rounded-2xl shadow-xl" style={{ backgroundColor: hintColor + '08' }}>
                    <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: hintColor }}>Дата последнего редактирования</label>
                    <p className="text-base" style={{ color: textColor }}>
                        {new Date(itemData.lastEdited).toLocaleString('ru-RU')}
                    </p>
                </div>
            )}

            {/* Секция Напоминания (ТОЛЬКО для Event/Reminder) */}
            {needsDateTimeSection && (
                <div className="p-4 rounded-2xl shadow-xl space-y-4" style={{ backgroundColor: hintColor + '08' }}>
                    
                    {showReminderCheckbox ? (
                        <div className="flex items-center justify-between">
                            <label className="text-lg" style={{ color: textColor }}>Напомнить</label>
                            <div 
                                className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer`}
                                style={{ 
                                    backgroundColor: itemData.hasReminder ? accentColor : hintColor + '33',
                                    border: itemData.hasReminder ? 'none' : `1px solid ${hintColor}`,
                                }}
                                onClick={() => setItemData(prev => ({ ...prev, hasReminder: !prev.hasReminder }))}
                            >
                                {itemData.hasReminder && <CheckCircle size={16} style={{ color: backgroundColor }} />}
                            </div>
                        </div>
                    ) : (
                        <h3 className="text-lg font-medium" style={{ color: textColor }}>Настройки Напоминания</h3>
                    )}
                    
                    {(itemData.hasReminder || itemData.type === 'Reminder') && (
                        <div>
                            <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: hintColor }} htmlFor="reminderSelect">Напомнить за...</label>
                            <select
                                id="reminderSelect"
                                value={`${itemData.reminderValue}_${itemData.reminderUnit}`}
                                onChange={handleReminderChange}
                                style={selectStyle} 
                            >
                                {REMINDER_OPTIONS.map(opt => (
                                    <option key={`${opt.value}_${opt.unit}`} value={`${opt.value}_${opt.unit}`} style={{ backgroundColor: backgroundColor, color: textColor }}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}
            
            
            <div className="h-20">
                {/* Пустое место для кнопки Telegram MainButton */}
            </div>

        </div>
    );
};


// --- Компонент "Календарь" ---
const CalendarView = ({ tma, items, textColor, accentColor, hintColor, navigateToEditor, navigateToSettings }) => {
    
    if (tma) tma.setHeaderColor('secondary_bg_color');

    // Фильтруем все, что не является Note, и группируем по дате
    const scheduledItems = items.filter(item => item.type === 'Event' || item.type === 'Reminder');
    const groupedItems = scheduledItems.reduce((acc, item) => {
        const date = item.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedItems).sort((a, b) => new Date(a) - new Date(b));

    const getIcon = (type) => {
        switch (type) {
            case 'Event': return <Calendar size={18} style={{ color: accentColor }} />;
            case 'Reminder': return <Clock size={18} style={{ color: accentColor }} />;
            default: return null;
        }
    };

    return (
        <div className="p-4 space-y-6 min-h-screen">
            <header className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>Календарь</h2>
                <button 
                    onClick={navigateToSettings}
                    className="p-2 rounded-full transition-colors duration-200" 
                    style={{ backgroundColor: accentColor, color: 'white' }}
                >
                    <Settings size={20} />
                </button>
            </header>
            
            {sortedDates.length === 0 && (
                <p style={{ color: hintColor }}>У вас пока нет запланированных событий или напоминаний.</p>
            )}

            {sortedDates.map(date => (
                <div key={date}>
                    <h3 className="text-sm uppercase font-semibold mb-2" style={{ color: hintColor }}>
                        {new Date(date).toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <div className="space-y-2">
                        {groupedItems[date].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00')).map(item => (
                            <div 
                                key={item.id}
                                className="flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-80"
                                style={{ backgroundColor: hintColor + '08' }}
                                onClick={() => navigateToEditor(item.id)}
                            >
                                <div className="flex items-center space-x-3">
                                    {getIcon(item.type)}
                                    <div>
                                        <p className="font-medium" style={{ color: textColor }}>{item.title}</p>
                                        {(item.type === 'Event' || item.type === 'Reminder') && item.time && (
                                            <p className="text-xs" style={{ color: hintColor }}>{item.time}</p>
                                        )}
                                        {item.hasReminder && (
                                             <p className="text-xs font-semibold" style={{ color: accentColor }}>
                                                Напомнить за {item.reminderValue} {item.reminderUnit === 'minutes' ? 'мин.' : item.reminderUnit === 'hour' ? 'ч.' : 'д.'}
                                             </p>
                                        )}
                                    </div>
                                </div>
                                <ChevronDown size={16} style={{ color: hintColor }} className="rotate-[-90deg]"/>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Компонент "Мои Заметки" ---
const NotesView = ({ items, textColor, accentColor, hintColor, navigateToEditor, tma, navigateToSettings }) => {
    if (tma) tma.setHeaderColor('secondary_bg_color');

    // Фильтруем и сортируем заметки по дате редактирования (сортировка уже сделана в useFirestore)
    const notes = items.filter(item => item.type === 'Note');

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'Нет данных';
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error("Invalid date string:", dateTimeString, e);
            return 'Неверная дата';
        }
    };

    return (
        <div className="p-4 space-y-6 min-h-screen">
            <header className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>Мои Заметки</h2>
                <button 
                    onClick={navigateToSettings}
                    className="p-2 rounded-full transition-colors duration-200" 
                    style={{ backgroundColor: accentColor, color: 'white' }}
                >
                    <Settings size={20} />
                </button>
            </header>
            
            {notes.length === 0 && (
                <p style={{ color: hintColor }}>У вас пока нет сохраненных заметок.</p>
            )}

            <div className="space-y-3">
                {notes.map(item => (
                    <div 
                        key={item.id}
                        className="p-4 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-80"
                        style={{ backgroundColor: hintColor + '08' }}
                        onClick={() => navigateToEditor(item.id)}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-medium text-lg" style={{ color: textColor }}>{item.title}</p>
                            <span className="text-xs font-semibold" style={{ color: hintColor }}>
                                {formatDateTime(item.lastEdited)}
                            </span>
                        </div>
                        <p className="text-sm line-clamp-2" style={{ color: hintColor }}>
                            {item.content.split('\n')[0].substring(0, 150)}...
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};


/**
 * Основной компонент Telegram Mini App
 */
const App = () => {
  const params = useUrlParams();
  
  // Инициализация Firebase и Аутентификация
  const { isAuthReady, db, auth, userId } = useFirebaseInit();
  // Подписка на данные Firestore
  const { items, isDataLoading } = useFirestore(isAuthReady, userId);

  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('calendar');
  
  // Имитация смены акцентного цвета через TMA
  const initialAccent = window.Telegram?.WebApp?.themeParams?.button_color || '#007aff';
  const [manualAccentColor, setManualAccentColor] = useState(initialAccent);

  // Создание новой пустой записи
  const createNewItem = (editId, type = 'Event') => {
    return {
        id: editId || 'new_item',
        type: type, 
        title: '',
        content: '',
        date: type === 'Note' ? '' : new Date().toISOString().split('T')[0], 
        time: type === 'Note' ? '' : '09:00',
        hasReminder: type === 'Reminder', 
        reminderValue: 15,
        reminderUnit: 'minutes',
        lastEdited: new Date().toISOString(), 
    }
  };

  const [itemData, setItemData] = useState(createNewItem(params.edit_id));
  
  // Эффект для загрузки данных при переходе в режим редактирования
  useEffect(() => {
    const editId = params.edit_id;
    if (editId && items.length > 0) {
        const item = items.find(i => i.id === editId);
        if (item) {
            setItemData(item);
        } else {
            // Если item не найден (удален или ошибка), сбрасываем на новую запись
            setItemData(createNewItem('new_item'));
        }
    } else if (editId && isDataLoading) {
         // Ждем загрузки данных, ничего не делаем
    } else {
        // Если нет ID в параметрах, или данные загружены, но ID не был найден (сброс)
        setItemData(createNewItem());
    }
  }, [params.edit_id, items, isDataLoading]);
  
  // Логика кнопки "Сохранить/Добавить"
  const isFormValid = itemData.title.trim().length > 0;
  
  const mainButtonText = useMemo(() => {
    const isNewItem = itemData.id === 'new_item';
    
    if (isNewItem) { return itemData.type === 'Note' ? 'СОХРАНИТЬ' : 'ДОБАВИТЬ'; } 
    else { return 'СОХРАНИТЬ'; } 
  }, [itemData.id, itemData.type]);


  // --- ФУНКЦИЯ СОХРАНЕНИЯ В FIRESTORE ---
  const handleMainButtonClick = useMemo(() => () => {
      if (!isFormValid || !db || !userId) {
          tma?.showAlert('Ошибка: Пожалуйста, введите заголовок или дождитесь подключения к базе данных.', () => tma?.MainButton.enable());
          return;
      }
      
      const isNew = itemData.id === 'new_item';
      
      // Данные, готовые к сохранению (исключаем внутренний id)
      const { id, ...dataToSave } = { 
          ...itemData, 
          lastEdited: new Date().toISOString(), // Всегда обновляем дату редактирования
      };
      
      const collectionPath = `artifacts/${appId}/users/${userId}/planner_items`;
      const itemsCollectionRef = collection(db, collectionPath);


      const saveOperation = isNew
          ? addDoc(itemsCollectionRef, dataToSave) // Добавить новый документ
          : setDoc(doc(db, collectionPath, itemData.id), dataToSave); // Обновить существующий (по id)
          
      saveOperation
        .then(() => {
            tma?.showAlert(`Запись успешно ${isNew ? 'создана' : 'обновлена'}!`, () => {
                // Возвращаемся на соответствующую вкладку
                setCurrentPage(itemData.type === 'Note' ? 'notes' : 'calendar');
                setItemData(createNewItem()); // Сброс редактора для новой записи
            });
        })
        .catch((error) => {
            console.error("Ошибка сохранения в Firestore:", error);
            tma?.showAlert(`Ошибка сохранения: ${error.message}`);
        });
      
  }, [itemData, isFormValid, db, userId]);

  const { isTmaReady, tma } = useTma(mainButtonText, currentPage === 'editor', isFormValid && !isGeminiLoading, handleMainButtonClick);

  // --- ФУНКЦИЯ УДАЛЕНИЯ ИЗ FIRESTORE ---
  const handleDelete = useCallback(() => {
    if (!db || !userId || !itemData.id || itemData.id === 'new_item') return;

    if (tma) {
      tma.showConfirm('Вы уверены, что хотите удалить эту запись? Это действие необратимо.', (isConfirmed) => {
        if (isConfirmed) {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/planner_items`, itemData.id);
            deleteDoc(docRef)
                .then(() => {
                    tma.showAlert('Запись удалена.', () => {
                        setCurrentPage(itemData.type === 'Note' ? 'notes' : 'calendar');
                        setItemData(createNewItem());
                    });
                })
                .catch(error => {
                    console.error("Ошибка удаления из Firestore:", error);
                    tma.showAlert(`Ошибка удаления: ${error.message}`);
                });
        }
      });
    }
  }, [db, userId, itemData.id, itemData.type, tma]);
  
  const navigateToEditor = (id = 'new_item', type = 'Event') => {
      if (id === 'new_item') {
          setItemData(createNewItem('new_item', type));
      } else {
          const item = items.find(i => i.id === id);
          if (item) setItemData(item);
      }
      setCurrentPage('editor');
  }

  const navigateToSettings = useCallback(() => {
      setCurrentPage('settings');
  }, []);
  
  // Обновление акцентного цвета в TMA
  useEffect(() => {
      if (tma) {
          tma.MainButton.setParams({ color: manualAccentColor });
      }
  }, [manualAccentColor, tma]);


  
  if (!isTmaReady || !isAuthReady || isDataLoading) {
    // Показываем общий экран загрузки, пока Firebase и данные не готовы
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ backgroundColor: '#1c1c1e', color: '#ffffff' }}>
        <Loader size={40} className="animate-spin mb-4" />
        <div className="text-lg font-medium">
          Загрузка планировщика и данных...
        </div>
      </div>
    );
  }

  // Определяем основной цвет фона и текста Telegram
  const backgroundColor = tma?.themeParams?.bg_color || '#1c1c1e';
  const textColor = tma?.themeParams?.text_color || '#ffffff';
  const accentColor = manualAccentColor; 
  const hintColor = tma?.themeParams?.hint_color || '#8e8e93';
  const destructiveColor = tma?.themeParams?.destructive_text_color || '#ff3b30';

  // --- Навигационная панель ---
  const NavButton = ({ page, icon: Icon, label }) => (
      <button 
          onClick={() => setCurrentPage(page)}
          className={`flex-1 flex flex-col items-center p-2 text-xs font-medium transition-colors duration-200 
            ${currentPage === page ? 'opacity-100' : 'opacity-60'}
          `}
          style={{ color: currentPage === page ? accentColor : textColor }}
      >
          <Icon size={24} className="mb-0.5" />
          {label}
      </button>
  );

  return (
    <div 
      className="min-h-screen" 
      style={{ backgroundColor, color: textColor, fontFamily: 'Inter, sans-serif' }}
    >
      
      <div className="pb-20"> 
          {currentPage === 'editor' && (
              <EditorView 
                  itemData={itemData} 
                  setItemData={setItemData} 
                  handleDelete={handleDelete}
                  tma={tma}
                  backgroundColor={backgroundColor}
                  textColor={textColor}
                  accentColor={accentColor}
                  hintColor={hintColor}
                  destructiveColor={destructiveColor}
                  simulateAIChat={simulateAIChat}
                  navigateToSettings={navigateToSettings}
              />
          )}
          
          {currentPage === 'calendar' && (
              <CalendarView 
                  tma={tma}
                  items={items}
                  textColor={textColor}
                  backgroundColor={backgroundColor}
                  accentColor={accentColor}
                  hintColor={hintColor}
                  navigateToEditor={navigateToEditor}
                  navigateToSettings={navigateToSettings}
              />
          )}
          
          {currentPage === 'notes' && (
              <NotesView 
                  tma={tma}
                  items={items}
                  textColor={textColor}
                  backgroundColor={backgroundColor}
                  accentColor={accentColor}
                  hintColor={hintColor}
                  navigateToEditor={navigateToEditor}
                  navigateToSettings={navigateToSettings}
              />
          )}

          {currentPage === 'settings' && (
              <SettingsView
                  tma={tma}
                  textColor={textColor}
                  backgroundColor={backgroundColor}
                  accentColor={accentColor}
                  hintColor={hintColor}
                  setCurrentPage={setCurrentPage}
                  setAccentColor={setManualAccentColor}
              />
          )}
      </div>

      {/* Фиксированная нижняя навигационная панель */}
      <div 
          className="fixed bottom-0 left-0 right-0 h-16 flex justify-around items-center border-t backdrop-blur-sm"
          style={{ 
              backgroundColor: tma?.themeParams?.secondary_bg_color || '#2c2c2e', 
              borderColor: hintColor + '33',
          }}
      >
          <NavButton page="calendar" icon={Calendar} label="Календарь" />
          
          {/* Плавающая кнопка для создания новой записи */}
          <button 
              onClick={() => {
                  navigateToEditor('new_item');
              }}
              className="p-4 rounded-full absolute -top-4 shadow-2xl transition-transform duration-200 hover:scale-105"
              style={{ 
                  backgroundColor: accentColor, 
                  color: backgroundColor,
                  boxShadow: `0 0 20px ${accentColor}88` 
              }}
              title="Создать новую запись"
          >
              <Zap size={24} />
          </button>
          
          <NavButton page="notes" icon={NotebookText} label="Заметки" />
      </div>
      
    </div>
  );
};

export default App;
