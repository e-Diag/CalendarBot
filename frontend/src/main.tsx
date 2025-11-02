
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  // Инициализация Telegram WebApp
  const initTelegramWebApp = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Применяем тему Telegram
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Обновляем тему при изменении
      tg.onEvent('themeChanged', () => {
        if (tg.colorScheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
      
      console.log('Telegram WebApp initialized:', {
        initData: tg.initData,
        version: tg.version,
        platform: tg.platform,
        colorScheme: tg.colorScheme,
      });
    } else {
      console.warn('Telegram WebApp not found. Running in standalone mode.');
    }
  };

  // Инициализируем перед рендерингом
  initTelegramWebApp();

  createRoot(document.getElementById("root")!).render(<App />);
  