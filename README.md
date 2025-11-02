# Calendar App

Приложение календаря и заметок с frontend на React и backend на Go.

## Структура проекта

- `frontend/` - React приложение на Vite
- `backend/` - Go API сервер

## Быстрый старт

### Backend

```bash
cd backend
go mod download
# Создайте .env файл с переменными:
# TELEGRAM_BOT_TOKEN=your_token
# DATABASE_URL=your_db_url
go run main.go
```

Backend запустится на `http://localhost:8080`

### Frontend

```bash
cd frontend
npm install
# Создайте .env файл с переменной:
# VITE_API_URL=http://localhost:8080
npm run dev
```

Frontend запустится на `http://localhost:3000`

## Деплой на Vercel

Подробные инструкции по деплою находятся в файле [frontend/DEPLOY.md](frontend/DEPLOY.md)

### Краткая инструкция:

1. Подключите репозиторий к Vercel
2. Установите Root Directory: `frontend`
3. Добавьте переменную окружения `VITE_API_URL` с URL вашего backend
4. Нажмите Deploy

## API Endpoints

- `GET /api/items` - Получить все заметки пользователя
- `POST /api/items` - Создать новую заметку
- `PUT /api/items/:id` - Обновить заметку
- `DELETE /api/items/:id` - Удалить заметку

## Технологии

- Frontend: React, TypeScript, Vite, Tailwind CSS, Motion
- Backend: Go, Gin, PostgreSQL, Telegram Bot API

