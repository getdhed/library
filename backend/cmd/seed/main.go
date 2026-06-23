package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"library-backend/internal/config"
	"library-backend/internal/database"

	"github.com/go-pdf/fpdf"
)

var titles = []string{
	"Методология научных исследований",
	"Основы пограничной безопасности",
	"Тактика действий пограничных нарядов",
	"Психология экстремальных ситуаций",
	"Правовые основы охраны границы",
	"История пограничной службы",
	"Огневая подготовка",
	"Физическая культура",
	"Иностранный язык в профессиональной деятельности",
	"Технические средства охраны границы",
	"Информационная безопасность",
	"Геополитика",
}

var authors = []string{
	"Иванов И. И.", "Петров П. П.", "Сидоров С. С.", "Смирнов А. А.",
	"Кузнецов В. В.", "Попов Д. Д.", "Соколов Е. Е.", "Лебедев Ж. Ж.",
}

var types = []string{
	"Учебник",
	"Учебное пособие",
	"Монография",
	"Курс лекций",
	"Методические указания",
}

var tags = [][]string{
	{"безопасность", "граница"},
	{"право", "закон"},
	{"история", "память"},
	{"оружие", "тактика"},
	{"психология", "личность"},
}

func main() {
	cfg := config.Load()

	ctx := context.Background()
	db, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}
	defer db.Close()

	// Ensure directories exist
	os.MkdirAll(filepath.Join(cfg.StoragePath, "pdfs"), 0755)
	os.MkdirAll(filepath.Join(cfg.StoragePath, "covers"), 0755)

	rand.Seed(time.Now().UnixNano())

	fmt.Println("Generating base PDF...")
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Test Document")
	
	basePdfPath := filepath.Join(cfg.StoragePath, "pdfs", "seed_base.pdf")
	if err := pdf.OutputFileAndClose(basePdfPath); err != nil {
		log.Fatalf("failed to generate pdf: %v", err)
	}

	fmt.Println("Generating base cover...")
	baseCoverPath := filepath.Join(cfg.StoragePath, "covers", "seed_base.png")
	cmd := exec.Command("python", "scripts/render_pdf_cover.py", basePdfPath, baseCoverPath)
	cmd.Dir = "." // running from backend/
	if _, err := os.Stat("scripts/render_pdf_cover.py"); os.IsNotExist(err) {
		cmd.Dir = ".." // try one level up if in cmd/seed
	}
	if out, err := cmd.CombinedOutput(); err != nil {
		fmt.Printf("Python output: %s\n", out)
		log.Fatalf("failed to generate cover: %v", err)
	}

	basePdfSize := int64(0)
	if info, err := os.Stat(basePdfPath); err == nil {
		basePdfSize = info.Size()
	}

	basePdfBytes, _ := os.ReadFile(basePdfPath)
	baseCoverBytes, _ := os.ReadFile(baseCoverPath)

	fmt.Println("Inserting 100 documents...")

	var deptID int
	err = db.QueryRowContext(ctx, "SELECT id FROM departments LIMIT 1").Scan(&deptID)
	if err != nil {
		fmt.Println("No departments found, skipping seeding (or you can insert a default one)")
		// Let's insert one to be safe
		err = db.QueryRowContext(ctx, "INSERT INTO faculties (name, slug) VALUES ('Test Faculty', 'test-faculty') RETURNING id").Scan(&deptID)
		if err == nil {
			db.QueryRowContext(ctx, "INSERT INTO departments (faculty_id, name, slug) VALUES ($1, 'Test Department', 'test-dept') RETURNING id", deptID).Scan(&deptID)
		}
	}

	for i := 1; i <= 100; i++ {
		title := fmt.Sprintf("%s (Выпуск %d)", titles[rand.Intn(len(titles))], i)
		author := authors[rand.Intn(len(authors))]
		year := 2000 + rand.Intn(25)
		docType := types[rand.Intn(len(types))]
		tagSlice := tags[rand.Intn(len(tags))]
		
		tagSlicePg := "{"
		for j, t := range tagSlice {
			tagSlicePg += `"` + t + `"`
			if j < len(tagSlice)-1 {
				tagSlicePg += ","
			}
		}
		tagSlicePg += "}"

		pdfName := fmt.Sprintf("seed_doc_%d_%d.pdf", time.Now().UnixNano(), i)
		coverName := fmt.Sprintf("seed_doc_%d_%d.png", time.Now().UnixNano(), i)
		
		relPdf := filepath.Join("pdfs", pdfName)
		relCover := filepath.Join("covers", coverName)
		
		absPdf := filepath.Join(cfg.StoragePath, relPdf)
		absCover := filepath.Join(cfg.StoragePath, relCover)

		_ = os.WriteFile(absPdf, basePdfBytes, 0644)
		_ = os.WriteFile(absCover, baseCoverBytes, 0644)

		query := `
			INSERT INTO documents (
				title, author, year, type, description, 
				file_path, file_name, file_size_bytes, cover_path, is_local
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
			)
		`
		
		_, err := db.ExecContext(ctx, query,
			title, author, year, docType, "Сгенерированное тестовое описание для "+title,
			relPdf, pdfName, basePdfSize, relCover, true,
		)
		if err != nil {
			log.Printf("Failed to insert doc %d: %v", i, err)
		}

		if i%10 == 0 {
			fmt.Printf("Inserted %d documents\n", i)
		}
	}

	fmt.Println("Done seeding!")
}
