package main

import (
	"fmt"

	"log"

	"os"

	"strconv"

	"strings"

	"time"

	"scheduler/pkg/scheduler" // Импорт нашего пакета scheduler

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"

	"github.com/joho/godotenv"
)

// Global constants

const (
	DateFormat = "2006-01-02 15:04"
)

// BotState определяет текущее ожидаемое действие от пользователя

type BotState struct {
	State string

	Type string

	DraftItem *scheduler.ScheduleItem
}

// Bot представляет основную структуру бота

type Bot struct {
	api *tgbotapi.BotAPI

	repo scheduler.Repository

	userStates map[int64]*BotState
}

// NewBot создает новый экземпляр бота

func NewBot(token string, repo scheduler.Repository) (*Bot, error) {

	api, err := tgbotapi.NewBotAPI(token)

	if err != nil {

		return nil, fmt.Errorf("ошибка при создании API бота: %w", err)

	}

	log.Printf("Авторизован как @%s", api.Self.UserName)

	return &Bot{

		api: api,

		repo: repo,

		userStates: make(map[int64]*BotState),
	}, nil

}

// GetMainMenuKeyboard возвращает основную клавиатуру бота с TMA и кнопкой планов

func GetMainMenuKeyboard() tgbotapi.ReplyKeyboardMarkup {

	// Используем заглушку, если TMA_URL не установлен

	tmaURL := os.Getenv("TMA_URL")

	if tmaURL == "" {

		tmaURL = "https://t.me/telegram" // Временная безопасная заглушка

		log.Println("Предупреждение: TMA_URL не установлен. Используется заглушка.")

	}

	return tgbotapi.NewReplyKeyboard(

		tgbotapi.NewKeyboardButtonRow(

			tgbotapi.NewKeyboardButton("🚀 Открыть Планировщик (TMA)"),

			tgbotapi.NewKeyboardButton("🗓 Мои Планы"),
		),
	)

}

// SendMessage отправляет сообщение пользователю

func (b *Bot) SendMessage(chatID int64, text string, markup interface{}) {

	msg := tgbotapi.NewMessage(chatID, text)

	if markup != nil {

		msg.ReplyMarkup = markup

	}

	msg.ParseMode = tgbotapi.ModeMarkdown

	b.api.Send(msg)

}

// SendReminder отправляет напоминание по строковому ID пользователя

func (b *Bot) SendReminder(userID string, text string) {

	// Преобразуем строковый ID обратно в int64 для Telegram API

	chatID, err := strconv.ParseInt(userID, 10, 64)

	if err != nil {

		log.Printf("Не удалось преобразовать userID %s в int64 для отправки напоминания: %v", userID, err)

		return

	}

	// Отправляем сообщение без клавиатуры

	b.SendMessage(chatID, text, nil)

}

// Run запускает цикл обработки обновлений

func (b *Bot) Run() {

	// 1. Запуск диспетчера напоминаний в фоновом режиме (горутина)

	go scheduler.ReminderSchedulerLoop(b.repo, b.SendReminder)

	// 2. Запуск основного цикла обработки обновлений Telegram

	u := tgbotapi.NewUpdate(0)

	u.Timeout = 60

	updates := b.api.GetUpdatesChan(u)

	for update := range updates {

		if update.Message != nil {

			b.handleMessage(update.Message)

		} else if update.InlineQuery != nil {

			b.handleInlineQuery(update.InlineQuery)

		} else if update.CallbackQuery != nil {

			b.handleCallbackQuery(update.CallbackQuery)

		}

	}

}

// handleMessage обрабатывает входящие сообщения

func (b *Bot) handleMessage(message *tgbotapi.Message) {

	userID := message.From.ID

	chatID := message.Chat.ID

	text := message.Text

	strUserID := strconv.FormatInt(userID, 10)

	// Инициализация пользователя (или получение)

	_, err := b.repo.GetUser(strUserID)

	if err != nil {

		_ = b.initNewUser(strUserID, message.From.UserName)

	}

	if message.IsCommand() {

		b.handleCommand(chatID, userID, message.Command())

	} else {

		// Логика упрощена до обработки только кнопки "Мои Планы"

		switch text {

		case "🗓 Мои Планы":

			b.showCalendar(chatID, userID)

		case "🚀 Открыть Планировщик (TMA)":

			tmaURL := os.Getenv("TMA_URL")

			if tmaURL == "" {

				tmaURL = "https://t.me/telegram"

			}

			// Отправляем ссылку, которую пользователь может нажать

			b.SendMessage(chatID, fmt.Sprintf("Нажмите на ссылку, чтобы открыть веб-приложение: %s", tmaURL), GetMainMenuKeyboard())

		}

		// Игнорируем остальной текст, так как ввод данных теперь через TMA

	}

}

// handleCallbackQuery обрабатывает нажатия инлайн-кнопок

func (b *Bot) handleCallbackQuery(callbackQuery *tgbotapi.CallbackQuery) {

	callbackData := callbackQuery.Data

	chatID := callbackQuery.Message.Chat.ID

	_ = callbackQuery.From.ID

	// 1. Отвечаем на Callback Query, чтобы убрать "часики"

	callback := tgbotapi.NewCallback(callbackQuery.ID, "Открываем TMA...")

	if _, err := b.api.Request(callback); err != nil {

		log.Println("Ошибка ответа на Callback:", err)

	}

	// Ожидаемый формат данных: access_<item_id>

	if strings.HasPrefix(callbackData, "access_") {

		itemID := strings.TrimPrefix(callbackData, "access_")

		// 2. Получаем TMA URL

		tmaURL := os.Getenv("TMA_URL")

		if tmaURL == "" {

			tmaURL = "https://t.me/telegram"

		}

		// 3. Формируем URL для открытия TMA с конкретным ID заметки

		// Этот URL TMA (фронтенд) будет знать, как разобрать, чтобы открыть заметку.

		// Пример: https://your-tma.com/app?edit_id=<itemID>

		editURL := fmt.Sprintf("%s?edit_id=%s", tmaURL, itemID)

		// 4. Отправляем пользователю сообщение со ссылкой на редактирование

		msgText := fmt.Sprintf("Нажмите на ссылку, чтобы отредактировать заметку %s:\n%s", itemID, editURL)

		b.SendMessage(chatID, msgText, GetMainMenuKeyboard())

		// В продакшене TMA здесь можно было бы использовать tgbotapi.NewInlineKeyboardMarkupWithURL

		// для кнопки "Открыть в TMA", но для совместимости мы отправляем ссылку текстом.

	}

}

// initNewUser создает нового пользователя с TZ по умолчанию и сохраняет его

func (b *Bot) initNewUser(strUserID, username string) *scheduler.User {

	user := scheduler.NewUser(strUserID, username)

	defaultTZ := os.Getenv("DEFAULT_TIMEZONE")

	if defaultTZ == "" {

		defaultTZ = "Europe/Moscow"

	}

	user.SetTimeZone(defaultTZ)

	b.repo.SaveUser(user)

	return user

}

// handleCommand обрабатывает команды бота

func (b *Bot) handleCommand(chatID int64, userID int64, command string) {

	switch command {

	case "start":

		welcomeText := "Привет! Используйте кнопку '🚀 Открыть Планировщик (TMA)' для управления вашим расписанием или '🗓 Мои Планы' для просмотра текущего дня."

		b.SendMessage(chatID, welcomeText, GetMainMenuKeyboard())

		b.userStates[chatID] = nil

	default:

		b.SendMessage(chatID, "Неизвестная команда. Используйте /start.", nil)

	}

}

// showCalendar показывает элементы на текущий день пользователя

func (b *Bot) showCalendar(chatID int64, userID int64) {

	strUserID := strconv.FormatInt(userID, 10)

	user, err := b.repo.GetUser(strUserID)

	if err != nil {

		b.SendMessage(chatID, "Пожалуйста, запустите /start, чтобы инициализировать ваш профиль.", GetMainMenuKeyboard())

		return

	}

	// Время берется по часовому поясу пользователя

	nowLocal := time.Now().In(user.TimeZone)

	// Начало дня в UTC (для запроса к базе)

	startOfDayLocal := time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), 0, 0, 0, 0, user.TimeZone)

	startOfDayUTC := startOfDayLocal.In(time.UTC)

	items, err := b.repo.GetItemsForUserOnDay(strUserID, startOfDayUTC)

	if err != nil {

		log.Printf("Ошибка получения элементов: %v", err)

		b.SendMessage(chatID, "Извините, не удалось загрузить расписание.", GetMainMenuKeyboard())

		return

	}

	response := fmt.Sprintf("🗓 **Ваши планы на %s (TZ: %s)**:\n\n",

		nowLocal.Format("02.01.2006"), user.TimeZone.String())

	if len(items) == 0 {

		response += "У вас нет запланированных Заметок, Событий или Напоминаний на этот день."

	} else {

		for _, item := range items {

			response += item.ToString(user.TimeZone) + "\n"

		}

	}

	b.SendMessage(chatID, response, GetMainMenuKeyboard())

}

// handleInlineQuery остается для возможности "Поделиться" планами

func (b *Bot) handleInlineQuery(inlineQuery *tgbotapi.InlineQuery) {

	queryText := strings.TrimSpace(inlineQuery.Query)

	userID := strconv.FormatInt(inlineQuery.From.ID, 10)

	items, err := b.repo.SearchItemsByTitle(queryText, userID)

	if err != nil {

		log.Printf("Ошибка Inline Search: %v", err)

		return

	}

	results := make([]interface{}, 0, len(items))

	user, _ := b.repo.GetUser(userID)

	for i, item := range items {

		messageContent := tgbotapi.InputTextMessageContent{

			Text: item.ToString(user.TimeZone),

			ParseMode: tgbotapi.ModeMarkdown,
		}

		// Кнопка, при нажатии на которую бот получит CallbackQuery

		keyboard := tgbotapi.NewInlineKeyboardMarkup(

			tgbotapi.NewInlineKeyboardRow(

				tgbotapi.NewInlineKeyboardButtonData("👀 Подробнее (TMA)", fmt.Sprintf("access_%s", item.ID)),
			),
		)

		article := tgbotapi.NewInlineQueryResultArticle(

			fmt.Sprintf("%d", i),

			fmt.Sprintf("%s: %s", item.Type, item.Title),

			item.Content,
		)

		article.InputMessageContent = messageContent

		article.ReplyMarkup = &keyboard

		results = append(results, article)

	}

	if len(results) == 0 && queryText != "" {

		article := tgbotapi.NewInlineQueryResultArticle(

			"no_results",

			"Ничего не найдено",

			"Ваш запрос не дал результатов.",
		)

		article.InputMessageContent = tgbotapi.InputTextMessageContent{

			Text: "Я не нашел подходящих элементов.",
		}

		results = append(results, article)

	}

	inlineConf := tgbotapi.InlineConfig{

		InlineQueryID: inlineQuery.ID,

		IsPersonal: true,

		Results: results,

		CacheTime: 0,
	}

	if _, err := b.api.Request(inlineConf); err != nil {

		log.Println("Ошибка отправки Inline Query:", err)

	}

}

func main() {

	err := godotenv.Load()

	if err != nil {

		log.Println("Предупреждение: Не удалось загрузить файл .env. Проверьте, что он существует. Используются системные переменные.")

	}

	botToken := os.Getenv("TELEGRAM_BOT_TOKEN")

	if botToken == "" {

		log.Fatal("Ошибка: Переменная TELEGRAM_BOT_TOKEN не установлена. Завершение работы.")

	}

	repo := scheduler.NewInMemoryRepo()

	bot, err := NewBot(botToken, repo)

	if err != nil {

		log.Fatal(err)

	}

	// --- ДЕМО-ДАННЫЕ ---

	testUserID := os.Getenv("TEST_USER_ID")

	if testUserID != "" {

		log.Printf("Инициализация демо-пользователя %s", testUserID)

		_ = bot.initNewUser(testUserID, "DemoUser")

		// Добавляем тестовое событие на завтра

		testEvent := &scheduler.ScheduleItem{

			OwnerID: testUserID,

			Type: "Event",

			Title: "Совещание по TMA",

			Content: "Обсудить интеграцию с Bubble.io. Важное событие!",

			// Добавляем напоминание, которое сработает через 2 минуты после запуска

			TargetTimeUTC: time.Now().In(time.UTC).Add(2 * time.Minute),

			IsEditable: true,
		}

		repo.AddItem(testEvent)

		log.Println("Добавлено тестовое событие (напоминание сработает через 2 минуты).")

	} else {

		log.Println("Переменная TEST_USER_ID не установлена. Демо-данные не добавлены.")

	}

	// ---------------------------------

	log.Println("Бот запущен. Ожидание обновлений...")

	bot.Run()
}
