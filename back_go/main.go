package main

import (
	"fmt"

	"log"

	"os"

	"strconv"

	"strings"

	"scheduler/pkg/scheduler"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"

	"github.com/joho/godotenv"
)

// Global constants

const (
	DateFormat = "2006-01-02 15:04"
)

// BotState defines the current expected action from the user

type BotState struct {
	State string

	Type string

	DraftItem *scheduler.ScheduleItem
}

// Bot represents the main bot structure

type Bot struct {
	api *tgbotapi.BotAPI

	repo scheduler.Repository

	userStates map[int64]*BotState
}

// NewBot creates a new bot instance

func NewBot(token string, repo scheduler.Repository) (*Bot, error) {

	api, err := tgbotapi.NewBotAPI(token)

	if err != nil {

		return nil, fmt.Errorf("ошибка при создании API бота: %w", err)

	}

	log.Printf("Authorized as @%s", api.Self.UserName)

	return &Bot{

		api: api,

		repo: repo,

		userStates: make(map[int64]*BotState),
	}, nil

}

// GetMainMenuKeyboard returns the main keyboard. The Web App button

// must be added manually via BotFather to avoid Go compilation errors.

func GetMainMenuKeyboard() tgbotapi.ReplyKeyboardMarkup {

	// TMA_URL will be used only for BotFather configuration, not in Go code.

	log.Println("Используется клавиатура без кнопки Web App (добавляется через BotFather)")

	return tgbotapi.NewReplyKeyboard(

		tgbotapi.NewKeyboardButtonRow(

			tgbotapi.NewKeyboardButton("🗓 Мои Планы"),
		),
	)

}

// SendMessage sends a message to the user

func (b *Bot) SendMessage(chatID int64, text string, markup interface{}) {

	msg := tgbotapi.NewMessage(chatID, text)

	if markup != nil {

		msg.ReplyMarkup = markup

	}

	msg.ParseMode = tgbotapi.ModeMarkdown

	b.api.Send(msg)

}

// SendReminder sends a reminder by user string ID

func (b *Bot) SendReminder(userID string, text string) {

	// Convert string ID back to int64 for Telegram API

	chatID, err := strconv.ParseInt(userID, 10, 64)

	if err != nil {

		log.Printf("Не удалось преобразовать userID %s в int64 для отправки напоминания: %v", userID, err)

		return

	}

	// Send message without keyboard

	b.SendMessage(chatID, text, nil)

}

// Run starts the update processing loop

func (b *Bot) Run() {

	// 1. Start the reminder dispatcher in the background (goroutine)

	go scheduler.ReminderSchedulerLoop(b.repo, b.SendReminder)

	// 2. Start the main Telegram update processing loop

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

// handleMessage processes incoming messages

func (b *Bot) handleMessage(message *tgbotapi.Message) {

	userID := message.From.ID

	chatID := message.Chat.ID

	text := message.Text

	strUserID := strconv.FormatInt(userID, 10)

	// User initialization (or retrieval)

	user, err := b.repo.GetUser(strUserID)

	if err != nil {

		user = b.initNewUser(strUserID, message.From.UserName)

	}

	if message.IsCommand() {

		b.handleCommand(chatID, userID, message.Command())

	} else {

		// Logic simplified to handle only the "My Plans" button

		switch text {

		case "🗓 Мои Планы":

			b.showCalendar(chatID, user)

		}

	}

}

// handleCallbackQuery processes inline button clicks

func (b *Bot) handleCallbackQuery(callbackQuery *tgbotapi.CallbackQuery) {

	callbackData := callbackQuery.Data

	// chatID := callbackQuery.Message.Chat.ID // Removed 'declared and not used'

	// 1. Respond to the Callback Query to remove the loading clock

	callback := tgbotapi.NewCallback(callbackQuery.ID, "Открываем TMA...")

	if _, err := b.api.Request(callback); err != nil {

		log.Println("Ошибка ответа на Callback:", err)

	}

	// Expected data format: access_<item_id>

	if strings.HasPrefix(callbackData, "access_") {

		itemID := strings.TrimPrefix(callbackData, "access_")

		// 2. Item access logic skipped for brevity

		_ = itemID

	}

}

// --- Helper Functions ---

// initNewUser initializes a new user

func (b *Bot) initNewUser(id, username string) *scheduler.User {

	user := scheduler.NewUser(id, username)

	b.repo.SaveUser(user)

	// Send welcome message and suggest timezone setup

	b.SendMessage(user.ChatID(), "Привет! Я твой планировщик. Давай настроим часовой пояс.", nil)

	return user

}

// handleCommand processes bot commands

func (b *Bot) handleCommand(chatID, userID int64, command string) {

	switch command {

	case "start":

		// Send main menu. The Web App button must be configured manually.

		b.SendMessage(chatID, "Добро пожаловать в Планировщик!", GetMainMenuKeyboard())

	default:

		b.SendMessage(chatID, "Неизвестная команда.", nil)

	}

}

// showCalendar shows the calendar (or redirects to TMA)

func (b *Bot) showCalendar(chatID int64, user *scheduler.User) {

	b.SendMessage(chatID, "Пожалуйста, нажмите на кнопку **🚀 Открыть Планировщик** (в меню бота), чтобы увидеть ваш календарь.", GetMainMenuKeyboard())

}

// handleInlineQuery processes inline queries (skipped)

func (b *Bot) handleInlineQuery(_ *tgbotapi.InlineQuery) {

	// Implementation of inline queries (e.g., for event search)

}

// --- MAIN FUNCTION ---

func main() {

	// Load environment variables

	if err := godotenv.Load(); err != nil {

		log.Println("Предупреждение: Файл .env не найден или ошибка загрузки")

	}

	botToken := os.Getenv("TELEGRAM_BOT_TOKEN")

	if botToken == "" {

		log.Fatal("Переменная окружения TELEGRAM_BOT_TOKEN не установлена")

	}

	// Initialization of the repository (in-memory for now)

	repo := scheduler.NewInMemoryRepo()

	// Bot creation and launch

	bot, err := NewBot(botToken, repo)

	if err != nil {

		log.Fatalf("Не удалось создать бота: %v", err)

	}

	bot.Run()

}
