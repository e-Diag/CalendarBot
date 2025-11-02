# Инструкция по деплою на Vercel

## Предварительные требования

1. Убедитесь, что backend запущен и доступен по публичному URL (например, на TimeWeb или другом хостинге)
2. Создайте аккаунт на [Vercel](https://vercel.com)

## Шаги для деплоя

### 1. Подготовка переменных окружения

В панели управления Vercel добавьте переменную окружения:
- `VITE_API_URL` - URL вашего backend API (например: `https://your-backend.com`)

### 2. Деплой через Git

1. Подключите ваш репозиторий к Vercel:
   - Перейдите в Vercel Dashboard
   - Нажмите "Add New Project"
   - Выберите ваш репозиторий

2. Настройте проект в Vercel Dashboard:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` ⚠️ ВАЖНО!
   - **Build Command**: `npm run build` (или оставьте пустым, если используется vercel.json)
   - **Output Directory**: `build` (или оставьте пустым, если используется vercel.json)
   - **Install Command**: `npm install` (или оставьте пустым)

   **Примечание**: После указания Root Directory как `frontend`, все пути будут относительно этой директории. Vercel автоматически найдет `package.json` и `vercel.json` в папке `frontend`.

3. Добавьте переменные окружения:
   - В настройках проекта добавьте `VITE_API_URL` со значением вашего backend URL

4. Нажмите "Deploy"

### 3. Деплой через Vercel CLI

```bash
# Установите Vercel CLI
npm i -g vercel

# Перейдите в директорию frontend
cd frontend

# Запустите деплой
vercel

# Для продакшн деплоя
vercel --prod
```

### 4. Обновление переменных окружения

После деплоя можно обновить переменные окружения в настройках проекта:
- Settings → Environment Variables
- Добавьте `VITE_API_URL` с вашим backend URL

## Структура проекта

```
Calendar/
├── frontend/          # Frontend приложение
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Backend API
│   ├── main.go
│   └── go.mod
└── vercel.json        # Конфигурация Vercel
```

## Настройка CORS на Backend

Убедитесь, что ваш backend позволяет запросы с домена Vercel. В `backend/main.go` уже настроен CORS для всех источников (`*`).

## Проверка деплоя

После успешного деплоя:
1. Откройте URL, предоставленный Vercel
2. Проверьте, что приложение загружается
3. Проверьте в консоли браузера, что запросы к API отправляются корректно

## Обновление после изменений

После каждого коммита в main/master ветку, Vercel автоматически создаст новый деплой.

Для ручного деплоя:
```bash
cd frontend
vercel --prod
```

