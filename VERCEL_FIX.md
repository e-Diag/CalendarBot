# Исправление ошибки деплоя на Vercel

## Проблема
Ошибка: `Error: Command "cd frontend && npm install" exited with 1`

## Решение

### Вариант 1: Настройка через веб-интерфейс Vercel (РЕКОМЕНДУЕТСЯ)

1. Откройте проект в [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Settings** → **General**
3. Найдите раздел **Root Directory**
4. Установите **Root Directory**: `frontend`
5. Сохраните изменения
6. Перейдите в **Deployments** и нажмите **Redeploy** на последнем деплое

После этого Vercel будет автоматически:
- Искать `package.json` в папке `frontend`
- Выполнять `npm install` в папке `frontend`
- Использовать `vercel.json` из папки `frontend` (если есть)

### Вариант 2: Использование vercel.json в корне

Если вы хотите оставить Root Directory пустым (корень репозитория), используйте следующий `vercel.json` в корне проекта:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/build",
  "installCommand": "cd frontend && npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Вариант 3: Переместить vercel.json в frontend

1. Удалите `vercel.json` из корня проекта (или оставьте его пустым)
2. Используйте `frontend/vercel.json` (уже создан)
3. В настройках Vercel установите Root Directory: `frontend`

## Проверка исправления

После применения одного из вариантов:

1. Сделайте новый коммит (если изменили файлы)
2. Подождите автоматического деплоя или нажмите **Redeploy**
3. Проверьте логи деплоя - команда `npm install` должна выполниться успешно

## Дополнительные исправления

✅ Обновлен `package.json`:
- Заменены зависимости с `"*"` на конкретные версии
- Это устраняет возможные ошибки при установке

✅ Создан `frontend/vercel.json`:
- Конфигурация оптимизирована для работы из папки frontend

✅ Добавлен `frontend/.vercelignore`:
- Исключает ненужные файлы из деплоя

## Если ошибка сохраняется

1. Проверьте логи деплоя в Vercel - там будет детальная информация об ошибке
2. Убедитесь, что `frontend/package.json` корректен
3. Проверьте, что все зависимости указаны с конкретными версиями
4. Попробуйте удалить и пересоздать проект в Vercel

