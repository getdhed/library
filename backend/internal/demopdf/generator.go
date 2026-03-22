package demopdf

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Document struct {
	FileName string
	Title    string
	Author   string
	Type     string
	Topic    string
	Body     []string
}

func SeedDocuments() []Document {
	return []Document{
		{FileName: "01-algorithms-fundamentals.pdf", Title: "Algorithms Fundamentals", Author: "Ivan Petrov", Type: "Textbook", Topic: "Algorithms", Body: []string{"Sorting, graphs and dynamic programming basics.", "Useful for search, catalog and document card demos."}},
		{FileName: "02-data-structures-guide.pdf", Title: "Data Structures Guide", Author: "Maria Sokolova", Type: "Notes", Topic: "Programming", Body: []string{"Lists, trees, hash tables and queues.", "Created for demo catalog browsing."}},
		{FileName: "03-database-systems.pdf", Title: "Database Systems and SQL", Author: "Alexey Orlov", Type: "Manual", Topic: "Databases", Body: []string{"Normalization, indexes and PostgreSQL transactions.", "Helps verify search by SQL keywords."}},
		{FileName: "04-operating-systems-lab.pdf", Title: "Operating Systems Lab", Author: "Natalia Vasilyeva", Type: "Workshop", Topic: "Operating Systems", Body: []string{"Processes, memory and file systems overview.", "A sample file for reading and download actions."}},
		{FileName: "05-computer-networks-notes.pdf", Title: "Computer Networks", Author: "Egor Belyaev", Type: "Lectures", Topic: "Networks", Body: []string{"OSI, TCP IP, routing and HTTP fundamentals.", "Good for mobile document card checks."}},
		{FileName: "06-discrete-math.pdf", Title: "Discrete Mathematics", Author: "Olga Andreeva", Type: "Textbook", Topic: "Math", Body: []string{"Graphs, boolean algebra and combinatorics.", "Added for document type filter testing."}},
		{FileName: "07-linear-algebra-summary.pdf", Title: "Linear Algebra Summary", Author: "Sergey Klimov", Type: "Notes", Topic: "Math", Body: []string{"Matrices, determinants and eigenvalues.", "Useful for department catalog previews."}},
		{FileName: "08-calculus-exercises.pdf", Title: "Calculus Exercises", Author: "Anna Lebedeva", Type: "Workshop", Topic: "Calculus", Body: []string{"Limits, derivatives and integrals practice.", "Another document for quick open testing."}},
		{FileName: "09-probability-theory.pdf", Title: "Probability Theory", Author: "Dmitry Romanov", Type: "Textbook", Topic: "Statistics", Body: []string{"Random variables and distributions.", "Keeps the catalog dataset realistic."}},
		{FileName: "10-statistics-handbook.pdf", Title: "Statistics Handbook", Author: "Elena Morozova", Type: "Manual", Topic: "Statistics", Body: []string{"Descriptive statistics and confidence intervals.", "Useful for applied math search scenarios."}},
		{FileName: "11-software-engineering.pdf", Title: "Software Engineering", Author: "Pavel Gusev", Type: "Textbook", Topic: "Software Engineering", Body: []string{"Requirements, architecture and testing workflows.", "Helps demonstrate fuller result lists."}},
		{FileName: "12-web-development-notes.pdf", Title: "Web Development Notes", Author: "Daria Smirnova", Type: "Lectures", Topic: "Frontend", Body: []string{"HTML, CSS, React and routing essentials.", "Good for suggestion and search previews."}},
		{FileName: "13-mobile-ui-patterns.pdf", Title: "Mobile UI Patterns", Author: "Victor Zhukov", Type: "Manual", Topic: "UX", Body: []string{"Responsive layouts, breakpoints and navigation.", "Useful for checking the new mobile menu."}},
		{FileName: "14-machine-learning-intro.pdf", Title: "Machine Learning Intro", Author: "Alina Fedorova", Type: "Textbook", Topic: "Machine Learning", Body: []string{"Classification, regression and validation basics.", "Adds larger titles and modern topics to the demo."}},
		{FileName: "15-artificial-intelligence.pdf", Title: "Artificial Intelligence", Author: "Nikita Volkov", Type: "Notes", Topic: "AI", Body: []string{"State space search and expert systems intro.", "Handy for sort by title verification."}},
		{FileName: "16-information-security.pdf", Title: "Information Security", Author: "Tatiana Nikolaeva", Type: "Textbook", Topic: "Security", Body: []string{"Threat models, security controls and crypto basics.", "Another file for read and favorite flows."}},
		{FileName: "17-cryptography-basics.pdf", Title: "Cryptography Basics", Author: "Yuri Pavlov", Type: "Lectures", Topic: "Security", Body: []string{"Ciphers, hashing and digital signatures.", "Good for download checks."}},
		{FileName: "18-cloud-computing.pdf", Title: "Cloud Computing", Author: "Ksenia Popova", Type: "Manual", Topic: "Cloud", Body: []string{"Containers, virtualization and scaling patterns.", "Adds a cloud themed example file."}},
		{FileName: "19-distributed-systems.pdf", Title: "Distributed Systems", Author: "Grigory Kuznetsov", Type: "Textbook", Topic: "Distributed Systems", Body: []string{"Consistency, replication and message queues.", "Helps test longer result titles in search."}},
		{FileName: "20-devops-playbook.pdf", Title: "DevOps Playbook", Author: "Polina Ermakova", Type: "Workshop", Topic: "DevOps", Body: []string{"CI CD, logging and observability practices.", "The final demo file for batch import testing."}},
	}
}

func WriteDemoPDFs(targetDir string) (int, error) {
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return 0, err
	}

	for _, document := range SeedDocuments() {
		content := buildPDF(document)
		targetPath := filepath.Join(targetDir, document.FileName)
		if err := os.WriteFile(targetPath, content, 0o644); err != nil {
			return 0, err
		}
	}

	return len(SeedDocuments()), nil
}

func buildPDF(document Document) []byte {
	lines := []string{
		document.Title,
		fmt.Sprintf("Автор: %s", document.Author),
		fmt.Sprintf("Тип: %s", document.Type),
		fmt.Sprintf("Тема: %s", document.Topic),
	}
	lines = append(lines, document.Body...)

	stream := buildTextStream(lines)

	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len(stream), stream),
	}

	return assemblePDF(objects)
}

func buildTextStream(lines []string) string {
	var builder strings.Builder
	builder.WriteString("BT\n")
	builder.WriteString("/F1 20 Tf\n")
	builder.WriteString("50 780 Td\n")

	for index, line := range lines {
		if index == 1 {
			builder.WriteString("/F1 12 Tf\n")
			builder.WriteString("0 -30 Td\n")
		}
		if index > 1 {
			builder.WriteString("0 -18 Td\n")
		}
		builder.WriteString("(")
		builder.WriteString(escapePDFText(line))
		builder.WriteString(") Tj\n")
	}

	builder.WriteString("ET")
	return builder.String()
}

func assemblePDF(objects []string) []byte {
	var buffer bytes.Buffer
	offsets := make([]int, 0, len(objects)+1)
	offsets = append(offsets, 0)

	buffer.WriteString("%PDF-1.4\n")

	for index, object := range objects {
		offsets = append(offsets, buffer.Len())
		buffer.WriteString(fmt.Sprintf("%d 0 obj\n%s\nendobj\n", index+1, object))
	}

	xrefStart := buffer.Len()
	buffer.WriteString(fmt.Sprintf("xref\n0 %d\n", len(offsets)))
	buffer.WriteString("0000000000 65535 f \n")
	for _, offset := range offsets[1:] {
		buffer.WriteString(fmt.Sprintf("%010d 00000 n \n", offset))
	}

	buffer.WriteString(fmt.Sprintf("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(offsets), xrefStart))
	return buffer.Bytes()
}

func escapePDFText(value string) string {
	replacer := strings.NewReplacer("\\", "\\\\", "(", "\\(", ")", "\\)")
	return replacer.Replace(value)
}
