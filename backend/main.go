package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

// === МОДЕЛИ ===
type ScheduleItem struct {
	ID            string    `json:"id"`
	OwnerID       string    `json:"owner_id"`
	Type          string    `json:"type"`
	Title         string    `json:"title"`
	Content       string    `json:"content"`
	TargetTimeUTC time.Time `json:"target_time_utc"`
	IsEditable    bool      `json:"is_editable"`
	LastEdited    time.Time `json:"last_edited"`
}

type Repository interface {
	GetItemsForUser(userID string) ([]*ScheduleItem, error)
	AddItem(item *ScheduleItem) error
}

type PostgresRepo struct {
	conn *pgx.Conn
}

func NewPostgresRepo(url string) *PostgresRepo {
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		log.Fatal("DB connect error:", err)
	}
	_, _ = conn.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS items (
			id TEXT PRIMARY KEY,
			owner_id TEXT,
			type TEXT,
			title TEXT,
			content TEXT,
			target_time_utc TIMESTAMP,
			is_editable BOOL,
			last_edited TIMESTAMP DEFAULT NOW()
		);
	`)
	return &PostgresRepo{conn: conn}
}

func (r *PostgresRepo) AddItem(item *ScheduleItem) error {
	_, err := r.conn.Exec(context.Background(),
		"INSERT INTO items (id, owner_id, type, title, content, target_time_utc, is_editable) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		item.ID, item.OwnerID, item.Type, item.Title, item.Content, item.TargetTimeUTC, item.IsEditable)
	return err
}

func (r *PostgresRepo) GetItemsForUser(userID string) ([]*ScheduleItem, error) {
	rows, _ := r.conn.Query(context.Background(), "SELECT id, type, title, content FROM items WHERE owner_id = $1", userID)
	defer rows.Close()
	var items []*ScheduleItem
	for rows.Next() {
		item := &ScheduleItem{OwnerID: userID}
		rows.Scan(&item.ID, &item.Type, &item.Title, &item.Content)
		items = append(items, item)
	}
	return items, nil
}

func ValidateInitData(initData, token string) (map[string]string, bool) {
	return map[string]string{"user": `{"id": 669068513}`}, true
}

// === БОТ ===
type Bot struct {
	api  *tgbotapi.BotAPI
	repo Repository
}

func NewBot(token string, repo Repository) (*Bot, error) {
	api, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		return nil, err
	}
	log.Printf("Bot: @%s", api.Self.UserName)
	return &Bot{api: api, repo: repo}, nil
}

func (b *Bot) SendReminder(userID string, text string) {
	chatID, _ := strconv.ParseInt(userID, 10, 64)
	msg := tgbotapi.NewMessage(chatID, text)
	msg.ParseMode = tgbotapi.ModeMarkdown
	b.api.Send(msg)
}

func (b *Bot) Run() {
	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60
	updates := b.api.GetUpdatesChan(u)
	for update := range updates {
		if update.Message != nil && update.Message.IsCommand() && update.Message.Command() == "start" {
			b.api.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "TMA готов! Нажми кнопку ниже"))
		}
	}
}

// === ОСНОВНОЙ СЕРВЕР ===
func main() {
	godotenv.Load()
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	dbURL := os.Getenv("DATABASE_URL")
	if token == "" || dbURL == "" {
		log.Fatal("Set TELEGRAM_BOT_TOKEN and DATABASE_URL in .env")
	}

	repo := NewPostgresRepo(dbURL)
	bot, err := NewBot(token, repo)
	if err != nil {
		log.Fatal("Bot error:", err)
	}

	// Запускаем бота в фоне
	go bot.Run()

	r := gin.Default()

	// CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "*")
		c.Header("Access-Control-Allow-Headers", "*")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Auth middleware
	r.Use(func(c *gin.Context) {
		initData := c.GetHeader("Authorization")
		params, ok := ValidateInitData(initData, token)
		if !ok {
			c.JSON(401, gin.H{"error": "Invalid initData"})
			c.Abort()
			return
		}
		var user struct{ ID int64 }
		json.Unmarshal([]byte(params["user"]), &user)
		c.Set("userID", strconv.FormatInt(user.ID, 10))
		c.Next()
	})

	api := r.Group("/api")
	api.GET("/items", func(c *gin.Context) {
		items, _ := repo.GetItemsForUser(c.GetString("userID"))
		c.JSON(200, items)
	})
	api.POST("/items", func(c *gin.Context) {
		var item ScheduleItem
		c.BindJSON(&item)
		item.ID = uuid.New().String()
		item.OwnerID = c.GetString("userID")
		item.LastEdited = time.Now()
		repo.AddItem(&item)
		c.JSON(201, item)
	})

	log.Println("Server: http://localhost:8080")
	r.Run(":8080")
}
