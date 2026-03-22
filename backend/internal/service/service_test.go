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
			"title":        " Distributed Systems ",
			"author":       " Tanenbaum ",
			"year":         "2024",
			"type":         "manual",
			"description":  " Reference book ",
			"departmentId": "5",
			"tags":         " os, distributed , networks ",
			"isVisible":    "0",
		}
		return values[key]
	})
	if err != nil {
		t.Fatalf("ParseDocumentInput() error = %v", err)
	}

	if input.Title != "Distributed Systems" || input.Author != "Tanenbaum" {
		t.Fatalf("unexpected parsed strings: %#v", input)
	}
	if input.Year != 2024 || input.DepartmentID != 5 {
		t.Fatalf("unexpected numeric fields: %#v", input)
	}
	if input.IsVisible {
		t.Fatalf("expected isVisible to be false")
	}
	expectedTags := []string{"os", "distributed", "networks"}
	if !reflect.DeepEqual(input.Tags, expectedTags) {
		t.Fatalf("unexpected tags: %#v", input.Tags)
	}
}

func TestParseDocumentInputRejectsInvalidNumbers(t *testing.T) {
	svc := &Service{}

	_, err := svc.ParseDocumentInput(func(key string) string {
		if key == "year" {
			return "nope"
		}
		if key == "departmentId" {
			return "2"
		}
		return "x"
	})
	if err != apperror.ErrInvalidInput {
		t.Fatalf("expected invalid input error, got %v", err)
	}

	_, err = svc.ParseDocumentInput(func(key string) string {
		if key == "year" {
			return "2024"
		}
		if key == "departmentId" {
			return "oops"
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
			"year":         "2024",
			"departmentId": "2",
			"title":        "",
			"author":       "Author",
			"type":         "book",
			"description":  "Desc",
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
			"title":        " Distributed Systems ",
			"author":       " Tanenbaum ",
			"departmentId": "5",
			"comment":      " Please review ",
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
	if input.DepartmentID != 5 {
		t.Fatalf("unexpected department id: %#v", input)
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
	if input.DepartmentID != 0 {
		t.Fatalf("expected empty department id, got %#v", input)
	}
}

func TestParseSubmissionInputRejectsInvalidData(t *testing.T) {
	svc := &Service{}

	_, err := svc.ParseSubmissionInput(func(key string) string {
		values := map[string]string{
			"title":        "Algorithms",
			"departmentId": "oops",
		}
		return values[key]
	})
	if err != apperror.ErrInvalidInput {
		t.Fatalf("expected invalid input error, got %v", err)
	}

	_, err = svc.ParseSubmissionInput(func(key string) string {
		return ""
	})
	if err != apperror.ErrInvalidInput {
		t.Fatalf("expected invalid input error, got %v", err)
	}
}
