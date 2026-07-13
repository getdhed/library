package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"io"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"library-backend/internal/preview"
)

// CSV columns:
// 0: idBook
// 1: Автор (author)
// 2: Заглавие (title)
// 3: Тип документа (type)
// 4: Место издания (place_of_publication)
// 5: Издательство (publisher)
// 6: Объем (volume)
// 7: Ключевые слова (tags)
// 8: Год издания (year)
// 9: Аннотация (description)
// 10: Дата добавления (created_at)
// 11: Путь (url to file)
// 12: Название периодического издания (periodical_name)
// 13: Исполнитель (executor)
// 14: Научный руководитель (scientific_advisor)
// 15: RowGuid

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://library:library@db:5432/library?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping db: %v", err)
	}

	csvFile, err := os.Open("/app/storage/old_library_data/old_library_data.csv")
	if err != nil {
		log.Fatalf("Failed to open CSV: %v", err)
	}
	defer csvFile.Close()

	reader := csv.NewReader(csvFile)
	reader.Comma = ';'
	reader.LazyQuotes = true
	reader.FieldsPerRecord = -1 // allow variable fields if some are malformed

	// Read header
	_, err = reader.Read()
	if err != nil {
		log.Fatalf("Failed to read CSV header: %v", err)
	}

	renderer, err := preview.New()
	if err != nil {
		log.Printf("Warning: failed to init renderer: %v", err)
	}
	successCount := 0
	skipCount := 0

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("Warning: error reading record: %v", err)
			continue
		}
		if len(record) < 12 {
			log.Printf("Skipping invalid record: %v", record)
			skipCount++
			continue
		}

		author := strings.TrimSpace(record[1])
		title := strings.TrimSpace(record[2])
		docType := strings.TrimSpace(record[3])
		placeOfPub := strings.TrimSpace(record[4])
		publisher := strings.TrimSpace(record[5])
		volume := strings.TrimSpace(record[6])
		tagsRaw := strings.TrimSpace(record[7])
		yearStr := strings.TrimSpace(record[8])
		description := strings.TrimSpace(record[9])
		createdAtStr := strings.TrimSpace(record[10])
		pathUrlStr := strings.TrimSpace(record[11])

		var periodicalName, executor, scientificAdvisor string
		if len(record) >= 13 {
			periodicalName = strings.TrimSpace(record[12])
		}
		if len(record) >= 14 {
			executor = strings.TrimSpace(record[13])
		}
		if len(record) >= 15 {
			scientificAdvisor = strings.TrimSpace(record[14])
		}

		year, _ := strconv.Atoi(yearStr)

		var createdAt time.Time
		if createdAtStr != "" && createdAtStr != "NULL" {
			createdAt, err = time.Parse("2006-01-02 15:04:05.000", createdAtStr)
			if err != nil {
				createdAt, _ = time.Parse("2006-01-02", createdAtStr)
			}
		}
		if createdAt.IsZero() {
			createdAt = time.Now()
		}

		// Handle NULL strings
		if author == "NULL" { author = "" }
		if title == "NULL" { title = "" }
		if docType == "NULL" { docType = "" }
		if placeOfPub == "NULL" { placeOfPub = "" }
		if publisher == "NULL" { publisher = "" }
		if volume == "NULL" { volume = "" }
		if description == "NULL" { description = "" }
		if periodicalName == "NULL" { periodicalName = "" }
		if executor == "NULL" { executor = "" }
		if scientificAdvisor == "NULL" { scientificAdvisor = "" }

		// Parse the path to find the actual file
		// Expected: http://10.46.2.53:3000/local/byLOCAL-...pdf
		parsedUrl, err := url.Parse(pathUrlStr)
		if err != nil || pathUrlStr == "NULL" {
			log.Printf("Skipping record '%s': invalid URL '%s'", title, pathUrlStr)
			skipCount++
			continue
		}

		urlPath := parsedUrl.Path
		// urlPath looks like "/local/file.pdf"
		// convert to local file system path "/old_library_data/local/file.pdf"
		urlPath, err = url.PathUnescape(urlPath)
		if err != nil {
			log.Printf("Skipping record '%s': unescape error %v", title, err)
			skipCount++
			continue
		}

		urlPath = strings.TrimPrefix(urlPath, "/")
		localFilePath := filepath.Join("/app/storage/old_library_data", urlPath)

		stat, err := os.Stat(localFilePath)
		if err != nil {
			log.Printf("Skipping record '%s': file not found %s", title, localFilePath)
			skipCount++
			continue
		}

		// Calculate is_local based on folder
		isLocal := strings.HasPrefix(strings.ToLower(urlPath), "local")

		// Create a new UUID for the file
		newUUID := uuid.New().String()
		newFileName := newUUID + ".pdf"
		newFilePath := filepath.Join("/app/storage/pdfs", newFileName)

		// Copy file
		if err := copyFile(localFilePath, newFilePath); err != nil {
			log.Printf("Failed to copy file %s to %s: %v", localFilePath, newFilePath, err)
			skipCount++
			continue
		}

		// Generate cover
		coverName := newUUID + ".webp"
		coverPath := filepath.Join("/app/storage/covers", coverName)
		if renderer != nil {
			if err := renderer.RenderFirstPage(context.Background(), newFilePath, coverPath); err != nil {
				log.Printf("Failed to generate cover for %s: %v", newFilePath, err)
				// Proceed without cover
				coverName = ""
			}
		} else {
			coverName = ""
		}

		// Save to DB
		// Insert document
		var docID int64
		err = db.QueryRow(`
			INSERT INTO documents (
				title, author, executor, scientific_advisor, year, type, 
				place_of_publication, publisher, periodical_name, volume, 
				description, file_path, file_name, file_size_bytes, mime_type, 
				cover_path, is_local, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18
			) RETURNING id
		`,
			title, author, executor, scientificAdvisor, year, docType,
			placeOfPub, publisher, periodicalName, volume,
			description, newFileName, filepath.Base(urlPath), stat.Size(), "application/pdf",
			coverName, isLocal, createdAt,
		).Scan(&docID)

		if err != nil {
			log.Printf("Failed to insert document '%s': %v", title, err)
			skipCount++
			continue
		}

		// Process tags
		if tagsRaw != "" && tagsRaw != "NULL" {
			tags := parseTags(tagsRaw)
			for _, tag := range tags {
				if tag == "" {
					continue
				}
				var tagID int64
				err = db.QueryRow(`
					INSERT INTO tags (name) VALUES ($1)
					ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
					RETURNING id
				`, tag).Scan(&tagID)
				if err != nil {
					log.Printf("Failed to insert/get tag '%s': %v", tag, err)
					continue
				}

				_, err = db.Exec(`
					INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2)
					ON CONFLICT DO NOTHING
				`, docID, tagID)
				if err != nil {
					log.Printf("Failed to link tag '%s' to document: %v", tag, err)
				}
			}
		}

		successCount++
		if successCount%50 == 0 {
			log.Printf("Processed %d records...", successCount)
		}
	}

	log.Printf("Migration completed. Successfully processed: %d, Skipped: %d", successCount, skipCount)
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

func parseTags(raw string) []string {
	// Tags can be separated by spaces or commas
	raw = strings.ReplaceAll(raw, ",", " ")
	parts := strings.Fields(raw)
	var res []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			res = append(res, p)
		}
	}
	return res
}
