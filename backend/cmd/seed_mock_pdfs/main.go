package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"library-backend/internal/domain"
	"library-backend/internal/repository"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://library:library@localhost:5433/library?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping db: %v", err)
	}

	repo := repository.New(db)
	ctx := context.Background()

	// Ensure storage directories exist
	pdfDir := filepath.Join("storage", "pdfs")
	coverDir := filepath.Join("storage", "covers")
	os.MkdirAll(pdfDir, 0755)
	os.MkdirAll(coverDir, 0755)

	// Create dummy PDF
	dummyPdfPath := filepath.Join(pdfDir, "dummy_seed.pdf")
	dummyPdfContent := []byte("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Mock PDF Content) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000222 00000 n \n0000000310 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n403\n%%EOF")
	if err := os.WriteFile(dummyPdfPath, dummyPdfContent, 0644); err != nil {
		log.Fatalf("Failed to write dummy pdf: %v", err)
	}

	// Create dummy PNG
	dummyPngPath := filepath.Join(coverDir, "dummy_seed.png")
	// A 1x1 red PNG
	dummyPngContent := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
		0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
		0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
		0x44, 0xae, 0x42, 0x60, 0x82,
	}
	if err := os.WriteFile(dummyPngPath, dummyPngContent, 0644); err != nil {
		log.Fatalf("Failed to write dummy png: %v", err)
	}

	rand.Seed(time.Now().UnixNano())

	titles := []string{"Введение в алгоритмы", "Компьютерные сети", "Основы баз данных", "Машинное обучение для начинающих", "Структуры данных и алгоритмы", "Искусственный интеллект: современный подход", "Распределенные системы", "Операционные системы", "Архитектура компьютера", "Программирование на Go", "Веб-разработка с нуля", "Безопасность сетей", "Криптография", "Теория вероятностей", "Линейная алгебра"}
	authors := []string{"Иван Иванов", "Петр Петров", "Алексей Смирнов", "Елена Соколова", "Мария Попова", "Дмитрий Волков", "Анна Лебедева", "Томас Кормен", "Эндрю Таненбаум", "Мартин Фаулер"}
	types := []string{"Учебник", "Методичка", "Пособие", "Статья", "Лекция"}
	descriptions := []string{"Отличная книга для изучения предмета.", "Краткий курс по основам.", "Полное руководство с практическими примерами.", "Учебный материал для подготовки к экзаменам.", "Сборник задач и решений."}
	tagsList := [][]string{
		{"алгоритмы", "основы"},
		{"сети", "tcp/ip"},
		{"базы данных", "sql"},
		{"ml", "ai"},
		{"go", "программирование"},
		{"математика", "алгебра"},
		{"безопасность", "сети"},
	}


	for i := 1; i <= 100; i++ {
		title := fmt.Sprintf("%s (Часть %d)", titles[rand.Intn(len(titles))], rand.Intn(10)+1)
		author := authors[rand.Intn(len(authors))]
		docType := types[rand.Intn(len(types))]
		year := 2000 + rand.Intn(25)
		desc := descriptions[rand.Intn(len(descriptions))]
		tags := tagsList[rand.Intn(len(tagsList))]

		input := domain.UpsertDocumentInput{
			Title:       title,
			Author:      author,
			Year:        year,
			Type:        docType,
			Description: desc,
			Tags:        tags,
			FilePath:    "pdfs/dummy_seed.pdf",
			FileName:    fmt.Sprintf("dummy_seed_%d.pdf", i),
			FileSize:    int64(len(dummyPdfContent)),
			MimeType:    "application/pdf",
			CoverPath:   "covers/dummy_seed.png",
			IsLocal:     true,
		}

		doc, err := repo.CreateDocument(ctx, input)
		if err != nil {
			log.Printf("Failed to create document %d: %v", i, err)
			continue
		}
		fmt.Printf("Created document %d: %s (ID: %d)\n", i, doc.Title, doc.ID)
	}

	fmt.Println("Successfully seeded 100 random documents!")
}
