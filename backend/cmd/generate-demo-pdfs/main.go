package main

import (
	"log"
	"path/filepath"

	"library-backend/internal/demopdf"
)

func main() {
	target := filepath.Join("storage", "import")
	count, err := demopdf.WriteDemoPDFs(target)
	if err != nil {
		log.Fatalf("generate demo pdfs: %v", err)
	}

	log.Printf("generated %d demo pdf files in %s", count, target)
}
