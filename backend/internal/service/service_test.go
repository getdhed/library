package service

import (
	"reflect"
	"testing"

	"library-backend/internal/apperror"
)

func TestParseDocumentInputValid(t *testing.T) {
	svc := &Service{}

	input, err := svc.ParseDocumentInput(func(key string) string {
		values := map[string]string{
			"title":       " Distributed Systems ",
			"author":      " Tanenbaum ",
			"year":        "2024",
			"type":        "manual",
			"description": " Reference book ",
			"tags":        " os, distributed , networks ",
		}
		return values[key]
	})
	if err != nil {
		t.Fatalf("ParseDocumentInput() error = %v", err)
	}

	if input.Title != "Distributed Systems" || input.Author != "Tanenbaum" {
		t.Fatalf("unexpected parsed strings: %#v", input)
	}
	if input.Year != 2024 {
		t.Fatalf("unexpected numeric fields: %#v", input)
	}
	expectedTags := []string{"os", "distributed", "networks"}
	if !reflect.DeepEqual(input.Tags, expectedTags) {
		t.Fatalf("unexpected tags: %#v", input.Tags)
	}
}

func TestParseDocumentInputAcceptsOnlyTitle(t *testing.T) {
	svc := &Service{}

	input, err := svc.ParseDocumentInput(func(key string) string {
		if key == "title" {
			return "Only title"
		}
		return ""
	})
	if err != nil {
		t.Fatalf("ParseDocumentInput() error = %v", err)
	}
	if input.Title != "Only title" || input.Author != "" || input.Type != "" || input.Description != "" {
		t.Fatalf("unexpected parsed input: %#v", input)
	}
	if input.Year == 0 {
		t.Fatal("expected default year")
	}
}

func TestParseDocumentInputRejectsInvalidNumbers(t *testing.T) {
	svc := &Service{}

	_, err := svc.ParseDocumentInput(func(key string) string {
		if key == "year" {
			return "nope"
		}
		return "x"
	})
	if err != apperror.ErrInvalidInput {
		t.Fatalf("expected invalid input error, got %v", err)
	}
}

func TestParseDocumentInputRejectsMissingFields(t *testing.T) {
	svc := &Service{}

	_, err := svc.ParseDocumentInput(func(key string) string {
		values := map[string]string{
			"year":        "2024",
			"title":       "",
			"author":      "Author",
			"type":        "book",
			"description": "Desc",
		}
		return values[key]
	})
	if err != apperror.ErrInvalidInput {
		t.Fatalf("expected invalid input error, got %v", err)
	}
}

func TestSplitCSV(t *testing.T) {
	got := splitCSV(" one, , two,three ")
	want := []string{"one", "two", "three"}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected splitCSV result: %#v", got)
	}

	if len(splitCSV("   ")) != 0 {
		t.Fatal("expected empty result for blank input")
	}
}

func TestParseSubmissionInputValid(t *testing.T) {
	svc := &Service{}

	input, err := svc.ParseSubmissionInput(func(key string) string {
		values := map[string]string{
			"title":   " Distributed Systems ",
			"author":  " Tanenbaum ",
			"comment": " Please review ",
		}
		return values[key]
	})
	if err != nil {
		t.Fatalf("ParseSubmissionInput() error = %v", err)
	}

	if input.Title != "Distributed Systems" {
		t.Fatalf("unexpected title: %#v", input)
	}
	if input.Author != "Tanenbaum" || input.Comment != "Please review" {
		t.Fatalf("unexpected optional fields: %#v", input)
	}
}

func TestParseSubmissionInputAllowsEmptyDepartment(t *testing.T) {
	svc := &Service{}

	input, err := svc.ParseSubmissionInput(func(key string) string {
		values := map[string]string{
			"title": "Algorithms",
		}
		return values[key]
	})
	if err != nil {
		t.Fatalf("ParseSubmissionInput() error = %v", err)
	}
	if input.Title != "Algorithms" {
		t.Fatalf("unexpected submission input: %#v", input)
	}
}

func TestParseSubmissionInputRejectsInvalidData(t *testing.T) {
	svc := &Service{}

	_, err := svc.ParseSubmissionInput(func(key string) string {
		return ""
	})
	if err != apperror.ErrInvalidInput {
		t.Fatalf("expected invalid input error, got %v", err)
	}
}
