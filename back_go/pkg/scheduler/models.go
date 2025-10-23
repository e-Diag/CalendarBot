package scheduler

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// DateFormat определяет формат для парсинга и отображения даты/времени
const DateFormat = "2006-01-02 15:04"

// User представляет пользователя бота с настроенным часовым поясом.
type User struct {
	ID         string
	Username   string
	TimeZone   *time.Location
	TzAsString string // Для сохранения и загрузки
}

// NewUser создает новый экземпляр User
func NewUser(id, username string) *User {
	// По умолчанию используется UTC, пока не будет установлен часовой пояс.
	loc, _ := time.LoadLocation("UTC")
	return &User{
		ID:       id,
		Username: username,
		TimeZone: loc,
	}
}

// SetTimeZone устанавливает часовой пояс пользователя
func (u *User) SetTimeZone(tzName string) error {
	loc, err := time.LoadLocation(tzName)
	if err != nil {
		return fmt.Errorf("неверный часовой пояс: %w", err)
	}
	u.TimeZone = loc
	u.TzAsString = tzName
	return nil
}

// ScheduleItem представляет одно запланированное событие, заметку или напоминание.
type ScheduleItem struct {
	ID            string
	OwnerID       string
	Type          string // "Note", "Event", "Reminder"
	Title         string
	Content       string
	TargetTimeUTC time.Time // Время события, сохраненное в UTC
	IsEditable    bool
}

// NewItem создает новый элемент расписания
func NewItem(ownerID, itemType, title, content string, targetTime time.Time) *ScheduleItem {
	return &ScheduleItem{
		ID:            uuid.New().String(),
		OwnerID:       ownerID,
		Type:          itemType,
		Title:         title,
		Content:       content,
		TargetTimeUTC: targetTime.In(time.UTC),
		IsEditable:    true,
	}
}

// ToString форматирует элемент для вывода в Telegram, используя локальный часовой пояс пользователя
func (item *ScheduleItem) ToString(loc *time.Location) string {
	timeLocal := item.TargetTimeUTC.In(loc)
	timeStr := timeLocal.Format(DateFormat)

	// Вывод времени только если это не просто заметка
	if item.Type == "Note" {
		timeStr = "без времени"
	}

	return fmt.Sprintf("➡️ **%s** (%s) \n*%s* \n```\n%s\n```\n",
		item.Title, item.Type, timeStr, item.Content)
}

// --- Интерфейс и Репозиторий ---

// Repository определяет методы для работы с хранилищем данных (абстракция).
type Repository interface {
	SaveUser(*User)
	GetUser(id string) (*User, error)
	AddItem(*ScheduleItem)
	UpdateItem(*ScheduleItem)
	DeleteItem(id string)
	GetItemsForUserOnDay(userID string, startOfDayUTC time.Time) ([]*ScheduleItem, error)
	GetDueReminders(nowUTC time.Time) ([]*ScheduleItem, error)
	SearchItemsByTitle(query, userID string) ([]*ScheduleItem, error)
}

// InMemoryRepo - простая реализация репозитория в памяти (для быстрой разработки).
type InMemoryRepo struct {
	users map[string]*User
	items map[string]*ScheduleItem
	mu    sync.RWMutex
}

// NewInMemoryRepo создает новый InMemoryRepo.
func NewInMemoryRepo() *InMemoryRepo {
	return &InMemoryRepo{
		users: make(map[string]*User),
		items: make(map[string]*ScheduleItem),
	}
}

// Реализация методов интерфейса Repository...

func (r *InMemoryRepo) SaveUser(user *User) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users[user.ID] = user
}

func (r *InMemoryRepo) GetUser(id string) (*User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if user, ok := r.users[id]; ok {
		return user, nil
	}
	return nil, fmt.Errorf("пользователь не найден")
}

func (r *InMemoryRepo) AddItem(item *ScheduleItem) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[item.ID] = item
}

func (r *InMemoryRepo) UpdateItem(item *ScheduleItem) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[item.ID] = item
}

func (r *InMemoryRepo) DeleteItem(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.items, id)
}

func (r *InMemoryRepo) GetItemsForUserOnDay(userID string, startOfDayUTC time.Time) ([]*ScheduleItem, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	endOfDayUTC := startOfDayUTC.Add(24 * time.Hour)
	items := make([]*ScheduleItem, 0)

	for _, item := range r.items {
		if item.OwnerID == userID &&
			(item.Type == "Note" || // Заметки всегда показываем
				(item.TargetTimeUTC.After(startOfDayUTC) && item.TargetTimeUTC.Before(endOfDayUTC))) {
			items = append(items, item)
		}
	}
	return items, nil
}

func (r *InMemoryRepo) SearchItemsByTitle(query, userID string) ([]*ScheduleItem, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	results := make([]*ScheduleItem, 0)
	query = strings.ToLower(query)

	for _, item := range r.items {
		if item.OwnerID == userID && strings.Contains(strings.ToLower(item.Title), query) {
			results = append(results, item)
		}
	}
	return results, nil
}

// GetDueReminders возвращает все напоминания, срок которых наступил или уже прошел.
func (r *InMemoryRepo) GetDueReminders(nowUTC time.Time) ([]*ScheduleItem, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	dueItems := make([]*ScheduleItem, 0)

	// Используем временное хранилище для ID напоминаний, которые нужно удалить,
	// чтобы избежать изменения карты во время итерации
	itemsToDelete := []string{}

	for _, item := range r.items {
		// Напоминания должны иметь тип "Reminder" или "Event"
		if item.OwnerID != "" && item.Type != "Note" && !item.TargetTimeUTC.IsZero() && item.TargetTimeUTC.Before(nowUTC) {
			dueItems = append(dueItems, item)

			// Если элемент не должен быть редактируемым (т.е. одноразовое напоминание),
			// мы его удаляем из репозитория после отправки.
			if !item.IsEditable {
				itemsToDelete = append(itemsToDelete, item.ID)
			}
		}
	}

	// Удаляем одноразовые напоминания
	for _, id := range itemsToDelete {
		delete(r.items, id)
	}

	return dueItems, nil
}

// ReminderSender - интерфейс для функции, которая отправляет сообщение-напоминание.
type ReminderSender func(userID string, text string)

// ReminderSchedulerLoop - ГО-РУТИНА, которая постоянно проверяет напоминания.
func ReminderSchedulerLoop(repo Repository, sender ReminderSender) {
	log.Println("Диспетчер напоминаний запущен.")
	// Интервал проверки (например, каждые 30 секунд)
	ticker := time.NewTicker(30 * time.Second)

	for range ticker.C {
		nowUTC := time.Now().In(time.UTC)
		reminders, err := repo.GetDueReminders(nowUTC)

		if err != nil {
			log.Printf("Ошибка при получении напоминаний: %v", err)
			continue
		}

		for _, item := range reminders {
			// Форматируем сообщение-напоминание
			reminderText := fmt.Sprintf("🔔 **НАПОМИНАНИЕ** (⏰ %s UTC):\n%s",
				item.TargetTimeUTC.Format(DateFormat), item.Content)

			// Отправляем сообщение
			sender(item.OwnerID, reminderText)

			log.Printf("Отправлено напоминание пользователю %s: %s", item.OwnerID, item.Title)
		}
	}
}
